/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Shell Layout
 */

import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useApp } from '@/lib/store'

import { AppBackground } from './app-background'
import { Kbd } from './ui'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

export function AppShell() {
  const { state } = useApp()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, location.search])

  return (
    <div className="relative flex h-full overflow-hidden">
      <AppBackground scope="window" />
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main id="main-scroll" className="slim-scroll flex-1 overflow-y-auto">
          <div className="relative mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
            <AppBackground scope="content" />
            <div className="relative">
              <Outlet />
            </div>
          </div>
          <footer className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 pb-6 text-[11px] text-fg-subtle sm:px-6 lg:px-8">
            <span>
              {new Date().getFullYear()} · {state.identity.appName} — {state.identity.workspaceName} workspace, stored locally
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Kbd>C</Kbd> new issue <span className="text-fg-subtle/40">/</span>{' '}
              <Kbd>⌘K</Kbd> search
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}
