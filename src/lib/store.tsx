import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

import { APP_VERSION, STORAGE_KEY, createSeedState } from './data'
import { loadStateFromDisk, saveStateToDisk } from './db'
import { normalizeTheme, themeMeta } from './themes'
import { isTauri } from './tauri'
import type {
  AppState,
  Issue,
  IssueInput,
  Note,
  NoteInput,
  Project,
  ProjectInput,
  Status,
  Theme,
} from './types'
import { localISODate, projectKeyFromName, uid } from './utils'

type Action =
  | { type: 'issue/add'; issue: Issue }
  | { type: 'issue/update'; id: string; patch: Partial<Issue> }
  | { type: 'issue/remove'; id: string }
  | { type: 'note/add'; note: Note }
  | { type: 'note/update'; id: string; patch: Partial<Note> }
  | { type: 'note/remove'; id: string }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; patch: Partial<Project> }
  | { type: 'theme/set'; theme: Theme }
  | { type: 'sidebar/toggle' }
  | { type: 'state/reset' }
  | { type: 'state/replace'; state: AppState }

function withActivity(
  state: AppState,
  message: string,
  kind: AppState['activity'][number]['kind'],
): AppState {
  const entry = { id: uid(), kind, message, at: new Date().toISOString() }
  return { ...state, activity: [entry, ...state.activity].slice(0, 60) }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'issue/add': {
      const next = state.counters.issue + 1
      const project = state.projects.find((candidate) => candidate.id === action.issue.projectId)
      const key = `${project?.key ?? 'TASK'}-${next}`
      const issue: Issue = { ...action.issue, key }
      return withActivity(
        {
          ...state,
          issues: [issue, ...state.issues],
          counters: { ...state.counters, issue: next },
        },
        `Created ${key} · ${issue.title}`,
        'issue',
      )
    }

    case 'issue/update': {
      const current = state.issues.find((issue) => issue.id === action.id)
      if (!current) return state
      const patch: Partial<Issue> = { ...action.patch, updatedAt: new Date().toISOString() }
      if (patch.status) {
        patch.completedAt =
          patch.status === 'done' ? (current.completedAt ?? new Date().toISOString()) : null
      }
      const nextIssue: Issue = { ...current, ...patch }
      const nextState: AppState = {
        ...state,
        issues: state.issues.map((issue) => (issue.id === action.id ? nextIssue : issue)),
      }
      if (patch.status && patch.status !== current.status) {
        const message =
          patch.status === 'done'
            ? `Completed ${current.key} · ${current.title}`
            : `Moved ${current.key} to ${patch.status.replace('_', ' ')}`
        return withActivity(nextState, message, 'issue')
      }
      return nextState
    }

    case 'issue/remove': {
      const current = state.issues.find((issue) => issue.id === action.id)
      if (!current) return state
      return withActivity(
        { ...state, issues: state.issues.filter((issue) => issue.id !== action.id) },
        `Deleted ${current.key} · ${current.title}`,
        'issue',
      )
    }

    case 'note/add': {
      return withActivity(
        { ...state, notes: [action.note, ...state.notes] },
        `Created note · ${action.note.title}`,
        'note',
      )
    }

    case 'note/update': {
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.id
            ? { ...note, ...action.patch, updatedAt: new Date().toISOString() }
            : note,
        ),
      }
    }

    case 'note/remove': {
      const current = state.notes.find((note) => note.id === action.id)
      if (!current) return state
      return withActivity(
        { ...state, notes: state.notes.filter((note) => note.id !== action.id) },
        `Deleted note · ${current.title}`,
        'note',
      )
    }

    case 'project/add': {
      return withActivity(
        { ...state, projects: [...state.projects, action.project] },
        `Created project · ${action.project.name}`,
        'project',
      )
    }

    case 'project/update': {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.id ? { ...project, ...action.patch } : project,
        ),
      }
    }

    case 'theme/set':
      return { ...state, theme: action.theme }

    case 'sidebar/toggle':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }

    case 'state/reset':
      return loadState(true)

    case 'state/replace':
      return action.state

    default:
      return state
  }
}

function loadState(fresh = false): AppState {
  const seed = createSeedState()
  if (fresh || typeof window === 'undefined') return seed
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || parsed.version !== APP_VERSION) return seed
    return {
      ...seed,
      ...parsed,
      theme: normalizeTheme(parsed.theme),
      projects: Array.isArray(parsed.projects) ? parsed.projects : seed.projects,
      issues: Array.isArray(parsed.issues) ? parsed.issues : seed.issues,
      notes: Array.isArray(parsed.notes) ? parsed.notes : seed.notes,
      activity: Array.isArray(parsed.activity) ? parsed.activity : seed.activity,
      counters: parsed.counters ?? seed.counters,
    }
  } catch {
    return seed
  }
}

interface AppContextValue {
  state: AppState
  addIssue: (input: IssueInput) => void
  updateIssue: (id: string, patch: Partial<Issue>) => void
  deleteIssue: (id: string) => void
  toggleIssueDone: (id: string) => void
  setIssueStatus: (id: string, status: Status) => void
  addNote: (input?: NoteInput) => string
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  toggleNotePin: (id: string) => void
  addProject: (input: ProjectInput) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  resetData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState())

  useEffect(() => {
    try {
      // localStorage stays warm as an instant-start cache and as the cross-window
      // channel; SQLite is the durable store when running inside Tauri.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable (private mode); the app still works in memory */
    }

    if (!isTauri()) return
    const timer = window.setTimeout(() => {
      void saveStateToDisk(state)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [state])

  // Hydrate from SQLite on startup. If the database is empty, the seed state is
  // written back by the effect above.
  useEffect(() => {
    let cancelled = false
    void loadStateFromDisk().then((persisted) => {
      if (cancelled || !persisted) return
      if (persisted.version === APP_VERSION) {
        dispatch({ type: 'state/replace', state: { ...persisted, theme: normalizeTheme(persisted.theme) } })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Other windows (e.g. quick capture) share this origin's localStorage. When one
  // of them writes, adopt its state so the main window stays live.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const next = JSON.parse(event.newValue) as AppState
        if (next && next.version === APP_VERSION) {
          dispatch({ type: 'state/replace', state: { ...next, theme: normalizeTheme(next.theme) } })
        }
      } catch {
        /* ignore malformed external writes */
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const meta = themeMeta(state.theme)
    document.documentElement.dataset.theme = meta.id
    document.documentElement.classList.toggle('dark', meta.mode === 'dark')
  }, [state.theme])

  const addIssue = useCallback((input: IssueInput) => {
    const status = input.status ?? 'todo'
    const now = new Date().toISOString()
    dispatch({
      type: 'issue/add',
      issue: {
        id: uid(),
        key: '',
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status,
        priority: input.priority ?? 'none',
        projectId: input.projectId ?? null,
        labels: input.labels ?? [],
        dueDate: input.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: status === 'done' ? now : null,
      },
    })
  }, [])

  const updateIssue = useCallback((id: string, patch: Partial<Issue>) => {
    dispatch({ type: 'issue/update', id, patch })
  }, [])

  const deleteIssue = useCallback((id: string) => {
    dispatch({ type: 'issue/remove', id })
  }, [])

  const setIssueStatus = useCallback((id: string, status: Status) => {
    dispatch({ type: 'issue/update', id, patch: { status } })
  }, [])

  const toggleIssueDone = useCallback(
    (id: string) => {
      const issue = state.issues.find((candidate) => candidate.id === id)
      if (!issue) return
      dispatch({
        type: 'issue/update',
        id,
        patch: { status: issue.status === 'done' ? 'todo' : 'done' },
      })
    },
    [state.issues],
  )

  const addNote = useCallback((input?: NoteInput) => {
    const id = uid()
    const now = new Date().toISOString()
    dispatch({
      type: 'note/add',
      note: {
        id,
        title: input?.title ?? 'Untitled note',
        content: input?.content ?? '',
        projectId: input?.projectId ?? null,
        tags: input?.tags ?? [],
        pinned: input?.pinned ?? false,
        createdAt: now,
        updatedAt: now,
      },
    })
    return id
  }, [])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    dispatch({ type: 'note/update', id, patch })
  }, [])

  const deleteNote = useCallback((id: string) => {
    dispatch({ type: 'note/remove', id })
  }, [])

  const toggleNotePin = useCallback(
    (id: string) => {
      const note = state.notes.find((candidate) => candidate.id === id)
      if (!note) return
      dispatch({ type: 'note/update', id, patch: { pinned: !note.pinned } })
    },
    [state.notes],
  )

  const addProject = useCallback((input: ProjectInput) => {
    const now = new Date().toISOString()
    dispatch({
      type: 'project/add',
      project: {
        id: uid(),
        name: input.name.trim(),
        key: projectKeyFromName(input.name),
        description: input.description?.trim() ?? '',
        color: input.color ?? 'violet',
        status: 'active',
        createdAt: now,
        targetDate: input.targetDate ?? null,
      },
    })
  }, [])

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    dispatch({ type: 'project/update', id, patch })
  }, [])

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'theme/set', theme })
  }, [])

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'sidebar/toggle' })
  }, [])

  const resetData = useCallback(() => {
    dispatch({ type: 'state/reset' })
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addIssue,
      updateIssue,
      deleteIssue,
      toggleIssueDone,
      setIssueStatus,
      addNote,
      updateNote,
      deleteNote,
      toggleNotePin,
      addProject,
      updateProject,
      setTheme,
      toggleSidebar,
      resetData,
    }),
    [
      state,
      addIssue,
      updateIssue,
      deleteIssue,
      toggleIssueDone,
      setIssueStatus,
      addNote,
      updateNote,
      deleteNote,
      toggleNotePin,
      addProject,
      updateProject,
      setTheme,
      toggleSidebar,
      resetData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside <AppProvider>')
  return context
}

export { localISODate }
