import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen,
  CircleDot,
  CornerDownLeft,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  Palette,
  Plus,
  Search,
  SquarePen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { DOCS } from '@/lib/docs'
import { STATUS_META } from '@/lib/meta'
import { nextTheme, themeMeta } from '@/lib/themes'
import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

import { StatusIcon } from './issue-bits'
import { Kbd } from './ui'

interface PaletteItem {
  id: string
  group: 'Pages' | 'Actions' | 'Issues' | 'Notes'
  title: string
  subtitle?: string
  icon: ReactNode
  run: () => void
  keywords?: string
}

const GROUP_ORDER: PaletteItem['group'][] = ['Pages', 'Actions', 'Issues', 'Notes']

export function CommandPalette() {
  const { state, setTheme, addNote } = useApp()
  const { paletteOpen, closePalette, openIssueDialog } = useUI()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setActive(0)
    }
  }, [paletteOpen])

  useEffect(() => {
    if (!paletteOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [paletteOpen])

  const items = useMemo<PaletteItem[]>(() => {
    const openCount = state.issues.filter((issue) => issue.status !== 'done').length
    const activeProjects = state.projects.filter((project) => project.status === 'active').length
    const sortedIssues = [...state.issues].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    const sortedNotes = [...state.notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

    const navigation: PaletteItem[] = [
      {
        id: 'page-dashboard',
        group: 'Pages',
        title: 'Dashboard',
        subtitle: 'Overview',
        icon: <LayoutDashboard className="size-3.5" />,
        keywords: 'home today start',
        run: () => navigate('/'),
      },
      {
        id: 'page-issues',
        group: 'Pages',
        title: 'Issues',
        subtitle: `${openCount} open`,
        icon: <CircleDot className="size-3.5" />,
        keywords: 'tasks todo backlog',
        run: () => navigate('/issues'),
      },
      {
        id: 'page-projects',
        group: 'Pages',
        title: 'Projects',
        subtitle: `${activeProjects} active`,
        icon: <FolderKanban className="size-3.5" />,
        keywords: 'initiatives workstreams',
        run: () => navigate('/projects'),
      },
      {
        id: 'page-notes',
        group: 'Pages',
        title: 'Notes',
        subtitle: `${state.notes.length} notes`,
        icon: <NotebookPen className="size-3.5" />,
        keywords: 'docs writing wiki',
        run: () => navigate('/notes'),
      },
      {
        id: 'page-docs',
        group: 'Pages',
        title: 'Documentation',
        subtitle: `${DOCS.length} documents`,
        icon: <BookOpen className="size-3.5" />,
        keywords: 'docs help reference spec pages features',
        run: () => navigate('/docs'),
      },
    ]

    const actions: PaletteItem[] = [
      {
        id: 'action-new-issue',
        group: 'Actions',
        title: 'Create issue',
        subtitle: 'Shortcut: C',
        icon: <Plus className="size-3.5" />,
        keywords: 'new task add',
        run: () => openIssueDialog(),
      },
      {
        id: 'action-new-note',
        group: 'Actions',
        title: 'Create note',
        subtitle: 'Starts a blank page',
        icon: <SquarePen className="size-3.5" />,
        keywords: 'new doc writing',
        run: () => {
          const id = addNote()
          navigate(`/notes?note=${id}`)
        },
      },
      {
        id: 'action-theme',
        group: 'Actions',
        title: `Theme: ${themeMeta(state.theme).name}`,
        subtitle: 'Switch to the next theme',
        icon: <Palette className="size-3.5" />,
        keywords: 'appearance theme dark light paper graphite',
        run: () => setTheme(nextTheme(state.theme).id),
      },
    ]

    const issues: PaletteItem[] = sortedIssues.slice(0, 40).map((issue) => ({
      id: `issue-${issue.id}`,
      group: 'Issues',
      title: issue.title,
      subtitle: `${issue.key} · ${STATUS_META[issue.status].label}`,
      icon: <StatusIcon status={issue.status} />,
      keywords: `${issue.key} ${issue.labels.join(' ')}`,
      run: () => openIssueDialog({ issueId: issue.id }),
    }))

    const notes: PaletteItem[] = sortedNotes.slice(0, 30).map((note) => ({
      id: `note-${note.id}`,
      group: 'Notes',
      title: note.title,
      subtitle: note.tags.map((tag) => `#${tag}`).join(' ') || 'Note',
      icon: <NotebookPen className="size-3.5" />,
      keywords: note.tags.join(' '),
      run: () => navigate(`/notes?note=${note.id}`),
    }))

    return [...navigation, ...actions, ...issues, ...notes]
  }, [state.issues, state.notes, state.projects, state.theme, navigate, openIssueDialog, addNote, setTheme])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return [
        ...items.filter((item) => item.group === 'Pages'),
        ...items.filter((item) => item.group === 'Actions'),
        ...items.filter((item) => item.group === 'Issues').slice(0, 5),
        ...items.filter((item) => item.group === 'Notes').slice(0, 4),
      ]
    }
    return items
      .filter((item) =>
        `${item.title} ${item.subtitle ?? ''} ${item.keywords ?? ''}`.toLowerCase().includes(needle),
      )
      .slice(0, 12)
  }, [items, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    const node = document.querySelector<HTMLElement>('[data-palette-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, visible])

  if (!paletteOpen) return null

  function runItem(item: PaletteItem) {
    closePalette()
    item.run()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePalette()
      return
    }
    if (visible.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % visible.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + visible.length) % visible.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = visible[active]
      if (item) runItem(item)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={closePalette} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-pop-in relative w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_32px_90px_-24px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search issues, notes, or jump to…"
            aria-label="Search"
            className="h-12 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="slim-scroll max-h-[52vh] overflow-y-auto p-2">
          {visible.length === 0 ? (
            <div className="px-3 py-10 text-center text-[13px] text-fg-subtle">
              No results for “{query.trim()}”
            </div>
          ) : (
            GROUP_ORDER.map((group) => {
              const groupItems = visible.filter((item) => item.group === group)
              if (groupItems.length === 0) return null
              return (
                <div key={group} className="mb-1">
                  <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const index = visible.indexOf(item)
                    const isActive = index === active
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-palette-active={isActive}
                        onMouseMove={() => setActive(index)}
                        onClick={() => runItem(item)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                          isActive ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                        )}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded border border-line bg-surface-2 text-fg-muted">
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-fg">{item.title}</span>
                          {item.subtitle ? (
                            <span className="block truncate text-[11px] text-fg-subtle">{item.subtitle}</span>
                          ) : null}
                        </span>
                        {isActive ? <CornerDownLeft className="size-3 shrink-0 text-fg-subtle" /> : null}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-surface-2/50 px-4 py-2 text-[10.5px] text-fg-subtle">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Kbd>⌘K</Kbd>
            toggle
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
