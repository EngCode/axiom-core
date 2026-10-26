/**======> Reference By Comment <======
 * ===> 01 - Imports & Page Titles
 * ===> 02 - Top Bar Component
 */

import { ChevronRight, Menu, Plus, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useApp } from '@/lib/store'
import { useUI } from '@/lib/ui'

import { ThemePicker } from './theme-picker'
import { Avatar, Button, IconButton, Kbd } from './ui'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/issues': 'Issues',
  '/projects': 'Projects',
  '/notes': 'Notes',
  '/docs': 'Documentation',
  '/documents': 'Documents',
  '/library': 'Library',
  '/tools': 'Tools',
  '/settings': 'Settings',
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { state } = useApp()
  const { openPalette, openIssueDialog } = useUI()
  const location = useLocation()
  const projectId = location.pathname.startsWith('/projects/')
    ? location.pathname.split('/')[2]
    : undefined
  const project = projectId
    ? state.projects.find((candidate) => candidate.id === projectId)
    : undefined
  const title = project?.name ?? PAGE_TITLES[location.pathname] ?? 'Not found'

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-md sm:px-4">
      <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenMobileNav}>
        <Menu className="size-4" />
      </IconButton>

      <div className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
        <span className="hidden text-fg-subtle sm:inline">{state.identity.workspaceName} workspace</span>
        <ChevronRight className="hidden size-3 shrink-0 text-fg-subtle/60 rtl:rotate-180 sm:inline" />
        <span className="truncate font-medium text-fg">{title}</span>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={openPalette}
          className="hidden pr-1.5 text-fg-subtle sm:inline-flex"
        >
          <Search className="size-3.5" />
          Search
          <Kbd className="ms-2">⌘K</Kbd>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openIssueDialog()}
          title="New issue — press C"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">New issue</span>
        </Button>

        <ThemePicker className="hidden sm:block" />

        <Link to="/settings" aria-label="Settings" title="Settings"><Avatar name={state.identity.ownerName} size="md" className="ms-0.5" /></Link>
      </div>
    </header>
  )
}
