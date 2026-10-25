import {
  BookOpen,
  ChevronsUpDown,
  CircleDot,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { WORKSPACE } from '@/lib/data'
import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

import { ProjectDot } from './issue-bits'
import { ThemePicker } from './theme-picker'
import { IconButton, Kbd } from './ui'

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { state, toggleSidebar, resetData } = useApp()
  const { openPalette } = useUI()
  const location = useLocation()
  const collapsed = state.sidebarCollapsed

  const openIssues = state.issues.filter((issue) => issue.status !== 'done').length
  const activeProjects = state.projects.filter((project) => project.status === 'active').length
  const currentProject = new URLSearchParams(location.search).get('project')

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, count: undefined, end: true },
    { to: '/issues', label: 'Issues', icon: CircleDot, count: openIssues, end: false },
    { to: '/projects', label: 'Projects', icon: FolderKanban, count: activeProjects, end: false },
    { to: '/notes', label: 'Notes', icon: NotebookPen, count: state.notes.length, end: false },
    { to: '/docs', label: 'Docs', icon: BookOpen, count: undefined, end: false },
  ]

  function handleReset() {
    if (window.confirm('Reset the workspace to the demo data? Every change will be lost.')) {
      resetData()
    }
  }

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[252px] shrink-0 flex-col border-r border-line bg-surface',
        'transition-[width,transform] duration-200 lg:static lg:z-auto lg:translate-x-0',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        collapsed ? 'lg:w-[68px]' : 'lg:w-[252px]',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3.5 pb-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent/55 text-[13px] font-bold text-accent-fg shadow-sm ring-1 ring-white/15 ring-inset">
          O
        </div>
        <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
          <p className="truncate text-[13px] leading-tight font-semibold text-fg">{WORKSPACE.name}</p>
          <p className="truncate text-[10.5px] leading-tight text-fg-subtle">
            {WORKSPACE.owner} · {WORKSPACE.kind}
          </p>
        </div>
        <IconButton label="Close navigation" className="lg:hidden" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
        <ChevronsUpDown
          className={cn('size-3.5 shrink-0 text-fg-subtle/70', collapsed ? 'lg:hidden' : 'hidden lg:block')}
        />
      </div>

      <div className="px-2 pt-1 pb-2">
        <button
          type="button"
          onClick={() => {
            openPalette()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5',
            'text-[12.5px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <Search className="size-3.5 shrink-0" />
          <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>Search…</span>
          <Kbd className={cn(collapsed && 'lg:hidden')}>⌘K</Kbd>
        </button>
      </div>

      <nav className="space-y-0.5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
                collapsed && 'lg:justify-center lg:px-0',
                isActive
                  ? 'bg-surface-2 font-medium text-fg'
                  : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'size-4 shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted',
                  )}
                />
                <span className={cn('flex-1 truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                {item.count !== undefined ? (
                  <span
                    className={cn(
                      'text-[10.5px] tabular-nums text-fg-subtle',
                      collapsed && 'lg:hidden',
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={cn('mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-2', collapsed && 'lg:hidden')}>
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            Projects
          </span>
          <Link
            to="/projects"
            aria-label="Manage projects"
            className="grid size-5 place-items-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Plus className="size-3" />
          </Link>
        </div>
        <div className="space-y-0.5">
          {state.projects.map((project) => {
            const openInProject = state.issues.filter(
              (issue) => issue.projectId === project.id && issue.status !== 'done',
            ).length
            const isActive = location.pathname === '/issues' && currentProject === project.id
            return (
              <Link
                key={project.id}
                to={`/issues?project=${project.id}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors',
                  isActive ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
                )}
              >
                <ProjectDot project={project} />
                <span className="flex-1 truncate">{project.name}</span>
                <span className="text-[10.5px] tabular-nums text-fg-subtle">{openInProject}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-line p-2">
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] text-fg-subtle',
            'transition-colors hover:bg-surface-2 hover:text-fg-muted',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <RotateCcw className="size-3.5 shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Reset demo data</span>
        </button>
        <div className="mt-1 flex items-center gap-0.5 border-t border-line/60 pt-1.5">
          <ThemePicker placement="up" />
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
            className="hidden lg:grid"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </IconButton>
          <span
            className={cn(
              'ml-auto truncate px-1 text-[10px] text-fg-subtle',
              collapsed && 'lg:hidden',
            )}
          >
            Saved locally
          </span>
        </div>
      </div>
    </aside>
  )
}
