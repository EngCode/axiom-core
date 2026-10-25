/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Route Table
 * ===> 03 - Global Overlays
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell'
import { CommandPalette } from '@/components/command-palette'
import { IssueDialog } from '@/components/issue-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { AppProvider } from '@/lib/store'
import { UIProvider } from '@/lib/ui'
import DashboardPage from '@/pages/dashboard'
import DocumentsPage from '@/pages/documents'
const DocsPage = lazy(() => import('@/pages/docs'))
import IssuesPage from '@/pages/issues'
import LibraryPage from '@/pages/library'
import NotesPage from '@/pages/notes'
import ToolsPage from '@/pages/tools'
//====> Route Loading Fallback <====//
function RouteLoading() {
  //===> Render Fallback <===//
  return (
    <div className="grid min-h-[40vh] place-items-center text-[12px] text-fg-subtle" role="status">
      Loading…
    </div>
  )
}
import ProjectsPage from '@/pages/projects'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <UIProvider>
{/*=====> Route Table <=====*/}

          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="docs" element={<Suspense fallback={<RouteLoading />}><DocsPage /></Suspense>} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>

          {/* Global overlays — mounted once, opened from anywhere. */}
          <CommandPalette />
          <IssueDialog />
          <SettingsDialog />
        </UIProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
