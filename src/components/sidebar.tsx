/**======> Reference By Comment <======
 * ===> 01 - Imports & Type Definitions
 * ===> 02 - Navigation Model
 * ===> 03 - Sidebar Link Helper
 * ===> 04 - Sidebar Component
 */

//=====> Imports & Type Definitions <=====//

import {
  CircleDot,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Library,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { appMonogram } from '@/lib/identity'
import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

import { ProjectDot } from './issue-bits'
import { ThemePicker } from './theme-picker'
import { IconButton, Kbd } from './ui'

interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

//=====> Navigation Model <=====//

const TOP_NAV: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
]

const WORKSPACE_NAV: NavEntry[] = [
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/issues', label: 'Issues', icon: CircleDot },
]

const SECONDARY_NAV: NavEntry[] = [
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/tools', label: 'Tools', icon: Wrench },
]

//=====> Sidebar Link Helper <====//

function SidebarLink({
  entry,
  collapsed,
  count,
  onNavigate,
}: {
  entry: NavEntry
  collapsed: boolean
  count?: number
  onNavigate?: () => void
}) {
  //===> Destructure Navigation Entry <===//
  const { to, label, icon: Icon, end } = entry

  //===> Render Link <===//
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-[13px] transition-colors',
          collapsed && 'lg:justify-center lg:px-0',
          isActive
            ? 'bg-surface-2 font-medium text-fg'
            : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted',
            )}
          />
          <span className={cn('flex-1 truncate text-start', collapsed && 'lg:hidden')}>{label}</span>
          {typeof count === 'number' ? (
            <span
              className={cn('text-[10.5px] tabular-nums text-fg-subtle', collapsed && 'lg:hidden')}
            >
              {count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

//=====> Sidebar Component <=====//

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  //===> Read App State & UI Actions <===//
  const { state, toggleSidebar } = useApp()
  const { openPalette, openSettings } = useUI()
  const location = useLocation()

  //===> Derive Identity & Layout <===//
  const identity = state.identity
  const mark = appMonogram(identity.appName)
  const collapsed = state.sidebarCollapsed

  //===> Compute Navigation Counts <===//
  const openIssues = state.issues.filter((issue) => issue.status !== 'done').length
  const activeProjects = state.projects.filter((project) => project.status === 'active').length
  const currentProject = new URLSearchParams(location.search).get('project')

  const navCounts: Record<string, number> = {
    '/issues': openIssues,
    '/projects': activeProjects,
    '/notes': state.notes.length,
  }

  //===> Render Sidebar <===//
  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'fixed inset-y-0 start-0 z-40 flex w-[252px] shrink-0 flex-col border-e border-line bg-surface',
        'transition-[width,transform] duration-200 lg:static lg:z-auto lg:translate-x-0',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full rtl:translate-x-full',
        collapsed ? 'lg:w-[68px]' : 'lg:w-[252px]',
      )}
    >
      {/*=====> Workspace Identity <=====*/}
      <div className="flex items-center gap-2 px-3 pt-3.5 pb-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-control bg-gradient-to-br from-accent to-accent/55 text-[13px] font-bold text-accent-fg shadow-sm ring-1 ring-white/15 ring-inset">
          {mark}
        </div>
        <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
          <p className="truncate text-[13px] leading-tight font-semibold text-fg">
            {identity.appName}
          </p>
          <p className="truncate text-[10.5px] leading-tight text-fg-subtle">
            {identity.ownerName} · {identity.workspaceName}
          </p>
        </div>
        <IconButton label="Close navigation" className="lg:hidden" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      {/*=====> Palette Trigger <=====*/}
      <div className="px-2 pt-1 pb-2">
        <button
          type="button"
          onClick={() => {
            openPalette()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-control border border-line bg-surface-2 px-2.5 py-1.5',
            'text-[12.5px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <Search className="size-3.5 shrink-0" />
          <span className={cn('flex-1 text-start', collapsed && 'lg:hidden')}>Search…</span>
          <Kbd className={cn(collapsed && 'lg:hidden')}>⌘K</Kbd>
        </button>
      </div>

      {/*=====> Primary Navigation <=====*/}
      <nav aria-label="Primary" className="slim-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {TOP_NAV.map((entry) => (
          <SidebarLink key={entry.to} entry={entry} collapsed={collapsed} onNavigate={onClose} />
        ))}

        {/*====> Workspace Group <====*/}
        <div role="group" aria-labelledby="workspace-label" className="pt-3">
          <p
            id="workspace-label"
            className={cn(
              'px-2.5 pb-1 text-[9.5px] font-semibold tracking-[0.16em] text-fg-subtle uppercase',
              collapsed && 'lg:hidden',
            )}
          >
            Workspace
          </p>

          <div className="space-y-0.5">
            {WORKSPACE_NAV.map((entry) => (
              <SidebarLink
                key={entry.to}
                entry={entry}
                collapsed={collapsed}
                count={navCounts[entry.to]}
                onNavigate={onClose}
              />
            ))}
          </div>

          {/*====> Project Quick Links <====*/}
          <div className={cn('mt-1 space-y-0.5', collapsed && 'lg:hidden')}>
            {state.projects.map((project) => {
              const projectOpenCount = state.issues.filter(
                (issue) => issue.projectId === project.id && issue.status !== 'done',
              ).length
              const isActive = location.pathname === '/issues' && currentProject === project.id

              return (
                <Link
                  key={project.id}
                  to={`/issues?project=${project.id}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-control py-1.5 pe-2 ps-7 text-[12.5px] transition-colors',
                    isActive
                      ? 'bg-surface-2 text-fg'
                      : 'text-fg-muted hover:bg-surface-2/70 hover:text-fg',
                  )}
                >
                  <ProjectDot project={project} />
                  <span className="flex-1 truncate">{project.name}</span>
                  <span className="text-[10.5px] tabular-nums text-fg-subtle">
                    {projectOpenCount}
                  </span>
                </Link>
              )
            })}

            <Link
              to="/projects"
              className="flex items-center gap-2.5 rounded-control py-1.5 pe-2 ps-7 text-[11.5px] text-fg-subtle transition-colors hover:bg-surface-2/70 hover:text-fg-muted"
            >
              <Plus className="size-3" />
              <span>Manage projects</span>
            </Link>
          </div>
        </div>

        {/*====> Secondary Navigation <====*/}
        <div className="space-y-0.5 pt-3">
          {SECONDARY_NAV.map((entry) => (
            <SidebarLink
              key={entry.to}
              entry={entry}
              collapsed={collapsed}
              count={navCounts[entry.to]}
              onNavigate={onClose}
            />
          ))}
        </div>
      </nav>

      {/*=====> Footer Controls <=====*/}
      <div className="mt-auto border-t border-line p-2">
        <div className="flex items-center gap-0.5">
          <ThemePicker placement="up" />
          <IconButton label="Personalization" onClick={openSettings}>
            <Settings2 className="size-4" />
          </IconButton>
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
            className="hidden lg:grid"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </IconButton>
          <span
            className={cn(
              'ms-auto truncate px-1 text-[10px] text-fg-subtle',
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
