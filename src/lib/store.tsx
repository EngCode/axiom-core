/**======> Reference By Comment <======
 * ===> 01 - Action Model
 * ===> 02 - Reducer
 * ===> 03 - Persistence Helpers
 * ===> 04 - Context & Provider
 * ===> 05 - App Hook
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

import { APP_VERSION, LEGACY_STORAGE_KEY, STORAGE_KEY, createSeedState } from './data'
import { loadStateFromDisk, saveStateToDisk } from './db'
import { normalizeAppearance, normalizeBackground, previewBackgroundFromUrl } from './appearance'
import { normalizeIdentity } from './identity'
import { normalizeTheme, previewThemeFromUrl, themeMeta } from './themes'
import { invoke } from '@tauri-apps/api/core'
import { setWindowTitle } from './window'
import { isTauri } from './tauri'
import type {
  AppState,
  BackgroundSettings,
  Attachment,
  FolderKind,
  FolderRecord,
  IssueExtras,
  DocumentRecord,
  Milestone,
  Identity,
  ProjectDeleteOptions,
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

//=====> Action Model <=====//

type Action =
  | { type: 'issue/add'; issue: Issue }
  | { type: 'issue/update'; id: string; patch: Partial<Issue> }
  | { type: 'issue/remove'; id: string }
  | { type: 'note/add'; note: Note }
  | { type: 'note/update'; id: string; patch: Partial<Note> }
  | { type: 'note/remove'; id: string }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; patch: Partial<Project> }
  | { type: 'project/delete'; id: string; options: ProjectDeleteOptions }
  | { type: 'project/reorder'; id: string; beforeId: string | null }
  | { type: 'issue/reorder'; id: string; beforeId: string | null; status?: Status }
  | { type: 'issueExtras/update'; issueId: string; patch: Partial<IssueExtras> }
  | { type: 'taskLink/set'; key: string; issueId: string | null }
  | { type: 'theme/set'; theme: Theme }
  | { type: 'sidebar/toggle' }
  | { type: 'state/reset' }
  | { type: 'state/replace'; state: AppState }
  | { type: 'identity/update'; patch: Partial<Identity> }
  | { type: 'appearance/background'; patch: Partial<BackgroundSettings> }
  | { type: 'appearance/pageBackground'; path: string; patch: Partial<BackgroundSettings> | null }
  | { type: 'document/add'; document: DocumentRecord }
  | { type: 'document/update'; id: string; patch: Partial<DocumentRecord> }
  | { type: 'document/delete'; id: string }
  | { type: 'document/pin'; id: string }
  | { type: 'milestone/add'; milestone: Milestone }
  | { type: 'milestone/update'; id: string; patch: Partial<Milestone> }
  | { type: 'milestone/delete'; id: string }
  | { type: 'milestone/toggle'; id: string }
  | { type: 'folder/add'; folder: FolderRecord }
  | { type: 'folder/update'; id: string; patch: Partial<FolderRecord> }
  | { type: 'folder/remove'; id: string }
  | { type: 'noteFolder/set'; noteId: string; folderId: string | null }

function withActivity(
  state: AppState,
  message: string,
  kind: AppState['activity'][number]['kind'],
): AppState {
  const entry = { id: uid(), kind, message, at: new Date().toISOString() }
  return { ...state, activity: [entry, ...state.activity].slice(0, 60) }
}

//=====> Reducer <=====//

function moveBefore<T extends { id: string }>(items: T[], id: string, beforeId: string | null): T[] {
  //===> Guard Clause: Nothing To Move <===//
  const current = items.findIndex((item) => item.id === id)
  if (current < 0) return items

  //===> Detach & Reinsert <===//
  const moved = items[current]
  const rest = items.filter((item) => item.id !== id)
  if (!beforeId) return [...rest, moved]

  const target = rest.findIndex((item) => item.id === beforeId)
  if (target < 0) return [...rest, moved]

  return [...rest.slice(0, target), moved, ...rest.slice(target)]
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

    case 'project/delete': {
      const project = state.projects.find((candidate) => candidate.id === action.id)
      if (!project) return state

      const cascade = action.options.mode === 'delete'
      const target = action.options.mode === 'move' ? (action.options.targetProjectId ?? null) : null

      return withActivity(
        {
          ...state,
          projects: state.projects.filter((candidate) => candidate.id !== action.id),
          issues: cascade
            ? state.issues.filter((issue) => issue.projectId !== action.id)
            : state.issues.map((issue) =>
                issue.projectId === action.id ? { ...issue, projectId: target } : issue,
              ),
          notes: cascade
            ? state.notes.filter((note) => note.projectId !== action.id)
            : state.notes.map((note) =>
                note.projectId === action.id ? { ...note, projectId: target } : note,
              ),
        },
        `Deleted project · ${project.name}`,
        'project',
      )
    }

    case 'project/reorder': {
      return { ...state, projects: moveBefore(state.projects, action.id, action.beforeId) }
    }

    case 'issue/reorder': {
      const issue = state.issues.find((candidate) => candidate.id === action.id)
      if (!issue) return state

      const nextStatus = action.status ?? issue.status
      const moved = moveBefore(state.issues, action.id, action.beforeId).map((candidate) =>
        candidate.id === action.id
          ? {
              ...candidate,
              status: nextStatus,
              updatedAt:
                nextStatus === issue.status ? candidate.updatedAt : new Date().toISOString(),
            }
          : candidate,
      )

      return { ...state, issues: moved }
    }

    case 'appearance/pageBackground': {
      const pages = { ...state.appearance.pageBackgrounds }
      if (action.patch === null) {
        delete pages[action.path]
      } else {
        pages[action.path] = normalizeBackground({
          ...state.appearance.background,
          ...pages[action.path],
          ...action.patch,
        })
      }

      return {
        ...state,
        appearance: normalizeAppearance({ ...state.appearance, pageBackgrounds: pages }),
      }
    }
    case 'document/add':
      return { ...state, documents: [action.document, ...state.documents] }

    case 'document/update':
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.id
            ? { ...document, ...action.patch, updatedAt: new Date().toISOString() }
            : document,
        ),
      }

    case 'document/delete':
      return { ...state, documents: state.documents.filter((document) => document.id !== action.id) }

    case 'document/pin':
      return {
        ...state,
        documents: state.documents.map((document) =>
          document.id === action.id
            ? { ...document, pinned: !document.pinned, updatedAt: new Date().toISOString() }
            : document,
        ),
      }

    case 'milestone/add':
      return { ...state, milestones: [action.milestone, ...state.milestones] }

    case 'milestone/update':
      return {
        ...state,
        milestones: state.milestones.map((milestone) =>
          milestone.id === action.id ? { ...milestone, ...action.patch } : milestone,
        ),
      }

    case 'milestone/delete':
      return {
        ...state,
        milestones: state.milestones.filter((milestone) => milestone.id !== action.id),
      }

    case 'milestone/toggle':
      return {
        ...state,
        milestones: state.milestones.map((milestone) =>
          milestone.id === action.id
            ? { ...milestone, status: milestone.status === 'done' ? 'open' : 'done' }
            : milestone,
        ),
      }
    case 'issueExtras/update': {
      const current = state.issueExtras[action.issueId] ?? {
        checklist: [],
        attachments: [],
        parentId: null,
      }
      return {
        ...state,
        issueExtras: {
          ...state.issueExtras,
          [action.issueId]: { ...current, ...action.patch },
        },
      }
    }

    case 'taskLink/set': {
      const links = { ...state.taskLinks }
      if (action.issueId) links[action.key] = action.issueId
      else delete links[action.key]
      return { ...state, taskLinks: links }
    }
    case 'folder/add':
      return { ...state, folders: [...state.folders, action.folder] }

    case 'folder/update':
      return {
        ...state,
        folders: state.folders.map((folder) =>
          folder.id === action.id ? { ...folder, ...action.patch } : folder,
        ),
      }

    case 'folder/remove': {
      const folder = state.folders.find((candidate) => candidate.id === action.id)
      if (!folder) return state
      const parentId = folder.parentId
      const noteFolders = { ...state.noteFolders }
      for (const [noteId, folderId] of Object.entries(noteFolders)) {
        if (folderId !== action.id) continue
        if (parentId) noteFolders[noteId] = parentId
        else delete noteFolders[noteId]
      }
      return {
        ...state,
        folders: state.folders
          .filter((candidate) => candidate.id !== action.id)
          .map((candidate) =>
            candidate.parentId === action.id ? { ...candidate, parentId } : candidate,
          ),
        documents: state.documents.map((document) =>
          document.folderId === action.id ? { ...document, folderId: parentId } : document,
        ),
        noteFolders,
      }
    }

    case 'noteFolder/set': {
      const noteFolders = { ...state.noteFolders }
      if (action.folderId) noteFolders[action.noteId] = action.folderId
      else delete noteFolders[action.noteId]
      return { ...state, noteFolders }
    }
    case 'theme/set':
      return { ...state, theme: action.theme }

    case 'sidebar/toggle':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }

    case 'state/reset':
      return loadState(true)

    case 'state/replace':
      return action.state

    case 'identity/update':
      return { ...state, identity: normalizeIdentity({ ...state.identity, ...action.patch }) }

    case 'appearance/background':
      return {
        ...state,
        appearance: normalizeAppearance({
          background: { ...state.appearance.background, ...action.patch },
        }),
      }
    default:
      return state
  }
}

//=====> Persistence Helpers <=====//

function withPreviewOverrides(state: AppState): AppState {
  const theme = previewThemeFromUrl()
  const background = previewBackgroundFromUrl()

  //===> Guard Clause: Nothing To Preview <===//
  if (!theme && !background) return state

  //===> Apply Preview Overrides <===//
  return {
    ...state,
    theme: theme ?? state.theme,
    appearance: background
      ? normalizeAppearance({ background: { ...state.appearance.background, ...background } })
      : state.appearance,
  }
}

function loadState(fresh = false): AppState {
  const seed = createSeedState()
  if (fresh || typeof window === 'undefined') return withPreviewOverrides(seed)

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return withPreviewOverrides(seed)

    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || parsed.version !== APP_VERSION) return withPreviewOverrides(seed)

    return withPreviewOverrides({
      ...seed,
      ...parsed,
      theme: normalizeTheme(parsed.theme),
      identity: normalizeIdentity(parsed.identity),
      appearance: normalizeAppearance(parsed.appearance),
      projects: Array.isArray(parsed.projects) ? parsed.projects : seed.projects,
      issues: Array.isArray(parsed.issues) ? parsed.issues : seed.issues,
      notes: Array.isArray(parsed.notes) ? parsed.notes : seed.notes,
      activity: Array.isArray(parsed.activity) ? parsed.activity : seed.activity,
      counters: parsed.counters ?? seed.counters,
    })
  } catch {
    return withPreviewOverrides(seed)
  }
}
//=====> Context & Provider <=====//

interface AppContextValue {
  state: AppState
  addIssue: (input: IssueInput) => string
  updateIssue: (id: string, patch: Partial<Issue>) => void
  updateIssueExtras: (issueId: string, patch: Partial<IssueExtras>) => void
  addChecklistItem: (issueId: string, text: string) => void
  toggleChecklistItem: (issueId: string, itemId: string) => void
  removeChecklistItem: (issueId: string, itemId: string) => void
  addAttachment: (issueId: string, attachment: Attachment) => void
  removeAttachment: (issueId: string, attachmentId: string) => void
  addSubtask: (parentId: string, title: string) => string
  linkTask: (key: string, issueId: string | null) => void
  deleteIssue: (id: string) => void
  toggleIssueDone: (id: string) => void
  setIssueStatus: (id: string, status: Status) => void
  addNote: (input?: NoteInput) => string
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  toggleNotePin: (id: string) => void
  addDocument: (input?: {
    title?: string
    projectId?: string | null
    folderId?: string | null
    parentId?: string | null
  }) => string
  updateDocument: (id: string, patch: Partial<DocumentRecord>) => void
  deleteDocument: (id: string) => void
  toggleDocumentPin: (id: string) => void
  addFolder: (kind: FolderKind, name: string, parentId?: string | null) => string
  updateFolder: (id: string, patch: Partial<FolderRecord>) => void
  deleteFolder: (id: string) => void
  setNoteFolder: (noteId: string, folderId: string | null) => void
  addMilestone: (input: {
    projectId: string
    title: string
    dueDate?: string | null
  }) => string
  updateMilestone: (id: string, patch: Partial<Milestone>) => void
  deleteMilestone: (id: string) => void
  toggleMilestone: (id: string) => void
  addProject: (input: ProjectInput) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string, options: ProjectDeleteOptions) => void
  reorderProjects: (id: string, beforeId: string | null) => void
  reorderIssues: (id: string, beforeId: string | null, status?: Status) => void
  updateIdentity: (patch: Partial<Identity>) => void
  updateBackground: (patch: Partial<BackgroundSettings>) => void
  updatePageBackground: (path: string, patch: Partial<BackgroundSettings> | null) => void
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
        dispatch({
          type: 'state/replace',
          state: {
            ...persisted,
            theme: normalizeTheme(persisted.theme),
            identity: normalizeIdentity(persisted.identity),
            appearance: normalizeAppearance(persisted.appearance),
          },
        })
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
          dispatch({
            type: 'state/replace',
            state: {
              ...next,
              theme: normalizeTheme(next.theme),
              identity: normalizeIdentity(next.identity),
              appearance: normalizeAppearance(next.appearance),
            },
          })
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

  useEffect(() => {
    const { appName, workspaceName } = state.identity
    document.title = `${appName} — ${workspaceName} workspace`
    void setWindowTitle(appName)
    if (isTauri()) {
      void invoke('sync_tray', { appName }).catch(() => {
        /* the tray may not exist in browser mode */
      })
    }
  }, [state.identity])

  const addIssue = useCallback((input: IssueInput) => {
    const status = input.status ?? 'todo'
    const now = new Date().toISOString()
    const id = uid()
    dispatch({
      type: 'issue/add',
      issue: {
        id,
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
    return id
  }, [])

  const updateIssueExtras = useCallback((issueId: string, patch: Partial<IssueExtras>) => {
    dispatch({ type: 'issueExtras/update', issueId, patch })
  }, [])

  const addChecklistItem = useCallback(
    (issueId: string, text: string) => {
      const value = text.trim()
      if (!value) return
      const current = state.issueExtras[issueId]?.checklist ?? []
      dispatch({
        type: 'issueExtras/update',
        issueId,
        patch: { checklist: [...current, { id: uid(), text: value, done: false }] },
      })
    },
    [state.issueExtras],
  )

  const toggleChecklistItem = useCallback(
    (issueId: string, itemId: string) => {
      const current = state.issueExtras[issueId]?.checklist ?? []
      dispatch({
        type: 'issueExtras/update',
        issueId,
        patch: {
          checklist: current.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        },
      })
    },
    [state.issueExtras],
  )

  const removeChecklistItem = useCallback(
    (issueId: string, itemId: string) => {
      const current = state.issueExtras[issueId]?.checklist ?? []
      dispatch({
        type: 'issueExtras/update',
        issueId,
        patch: { checklist: current.filter((item) => item.id !== itemId) },
      })
    },
    [state.issueExtras],
  )

  const addAttachment = useCallback(
    (issueId: string, attachment: Attachment) => {
      const current = state.issueExtras[issueId]?.attachments ?? []
      dispatch({
        type: 'issueExtras/update',
        issueId,
        patch: { attachments: [...current, attachment] },
      })
    },
    [state.issueExtras],
  )

  const removeAttachment = useCallback(
    (issueId: string, attachmentId: string) => {
      const current = state.issueExtras[issueId]?.attachments ?? []
      dispatch({
        type: 'issueExtras/update',
        issueId,
        patch: { attachments: current.filter((item) => item.id !== attachmentId) },
      })
    },
    [state.issueExtras],
  )

  const addSubtask = useCallback(
    (parentId: string, title: string) => {
      const parent = state.issues.find((issue) => issue.id === parentId)
      if (!parent) return ''
      const id = addIssue({ title, projectId: parent.projectId, status: 'todo' })
      dispatch({ type: 'issueExtras/update', issueId: id, patch: { parentId } })
      return id
    },
    [addIssue, state.issues],
  )

  const linkTask = useCallback((key: string, issueId: string | null) => {
    dispatch({ type: 'taskLink/set', key, issueId })
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

  const addDocument = useCallback(
    (input?: {
      title?: string
      projectId?: string | null
      folderId?: string | null
      parentId?: string | null
    }) => {
      const id = uid()
      const now = new Date().toISOString()
      dispatch({
        type: 'document/add',
        document: {
          id,
          title: input?.title ?? 'Untitled document',
          content: '',
          projectId: input?.projectId ?? null,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        },
      })
      return id
    },
    [],
  )

  const updateDocument = useCallback((id: string, patch: Partial<DocumentRecord>) => {
    dispatch({ type: 'document/update', id, patch })
  }, [])

  const deleteDocument = useCallback((id: string) => {
    dispatch({ type: 'document/delete', id })
  }, [])

  const toggleDocumentPin = useCallback((id: string) => {
    dispatch({ type: 'document/pin', id })
  }, [])

  const addFolder = useCallback(
    (kind: FolderKind, name: string, parentId: string | null = null) => {
      const id = uid()
      dispatch({
        type: 'folder/add',
        folder: {
          id,
          name: name.trim() || 'New folder',
          kind,
          parentId,
          createdAt: new Date().toISOString(),
        },
      })
      return id
    },
    [],
  )

  const updateFolder = useCallback((id: string, patch: Partial<FolderRecord>) => {
    dispatch({ type: 'folder/update', id, patch })
  }, [])

  const deleteFolder = useCallback((id: string) => {
    dispatch({ type: 'folder/remove', id })
  }, [])

  const setNoteFolder = useCallback((noteId: string, folderId: string | null) => {
    dispatch({ type: 'noteFolder/set', noteId, folderId })
  }, [])
  const addMilestone = useCallback(
    (input: { projectId: string; title: string; dueDate?: string | null }) => {
      const id = uid()
      dispatch({
        type: 'milestone/add',
        milestone: {
          id,
          projectId: input.projectId,
          title: input.title.trim() || 'Untitled milestone',
          description: '',
          dueDate: input.dueDate ?? null,
          status: 'open',
          issueIds: [],
          createdAt: new Date().toISOString(),
        },
      })
      return id
    },
    [],
  )

  const updateMilestone = useCallback((id: string, patch: Partial<Milestone>) => {
    dispatch({ type: 'milestone/update', id, patch })
  }, [])

  const deleteMilestone = useCallback((id: string) => {
    dispatch({ type: 'milestone/delete', id })
  }, [])

  const toggleMilestone = useCallback((id: string) => {
    dispatch({ type: 'milestone/toggle', id })
  }, [])
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

  const deleteProject = useCallback((id: string, options: ProjectDeleteOptions) => {
    dispatch({ type: 'project/delete', id, options })
  }, [])

  const reorderProjects = useCallback((id: string, beforeId: string | null) => {
    dispatch({ type: 'project/reorder', id, beforeId })
  }, [])

  const reorderIssues = useCallback((id: string, beforeId: string | null, status?: Status) => {
    dispatch({ type: 'issue/reorder', id, beforeId, status })
  }, [])
  const updatePageBackground = useCallback(
    (path: string, patch: Partial<BackgroundSettings> | null) => {
      dispatch({ type: 'appearance/pageBackground', path, patch })
    },
    [],
  )
  const updateIdentity = useCallback((patch: Partial<Identity>) => {
    dispatch({ type: 'identity/update', patch })
  }, [])

  const updateBackground = useCallback((patch: Partial<BackgroundSettings>) => {
    dispatch({ type: 'appearance/background', patch })
  }, [])

  const resetData = useCallback(() => {
    dispatch({ type: 'state/reset' })
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addIssue,
      updateIssueExtras,
      addChecklistItem,
      toggleChecklistItem,
      removeChecklistItem,
      addAttachment,
      removeAttachment,
      addSubtask,
      linkTask,
      updateIssue,
      deleteIssue,
      toggleIssueDone,
      setIssueStatus,
      addNote,
      updateNote,
      deleteNote,
      toggleNotePin,
      addDocument,
      updateDocument,
      deleteDocument,
      toggleDocumentPin,
      setNoteFolder,
      deleteFolder,
      updateFolder,
      addFolder,
      addMilestone,
      updateMilestone,
      deleteMilestone,
      toggleMilestone,
      addProject,
      updateProject,
      deleteProject,
      reorderProjects,
      reorderIssues,
      updateIdentity,
      updateBackground,
      updatePageBackground,
      setTheme,
      toggleSidebar,
      resetData,
    }),
    [
      state,
      addIssue,
      updateIssueExtras,
      addChecklistItem,
      toggleChecklistItem,
      removeChecklistItem,
      addAttachment,
      removeAttachment,
      addSubtask,
      linkTask,
      updateIssue,
      deleteIssue,
      toggleIssueDone,
      setIssueStatus,
      addNote,
      updateNote,
      deleteNote,
      toggleNotePin,
      addDocument,
      updateDocument,
      deleteDocument,
      toggleDocumentPin,
      setNoteFolder,
      deleteFolder,
      updateFolder,
      addFolder,
      addMilestone,
      updateMilestone,
      deleteMilestone,
      toggleMilestone,
      addProject,
      updateProject,
      deleteProject,
      reorderProjects,
      reorderIssues,
      updateIdentity,
      updateBackground,
      updatePageBackground,
      setTheme,
      toggleSidebar,
      resetData,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

//=====> App Hook <=====//

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside <AppProvider>')
  return context
}

export { localISODate }
