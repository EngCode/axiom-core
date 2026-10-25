import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell'
import { CommandPalette } from '@/components/command-palette'
import { IssueDialog } from '@/components/issue-dialog'
import { AppProvider } from '@/lib/store'
import { UIProvider } from '@/lib/ui'
import DashboardPage from '@/pages/dashboard'
import DocsPage from '@/pages/docs'
import IssuesPage from '@/pages/issues'
import NotesPage from '@/pages/notes'
import ProjectsPage from '@/pages/projects'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <UIProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="docs" element={<DocsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>

          {/* Global overlays — mounted once, opened from anywhere. */}
          <CommandPalette />
          <IssueDialog />
        </UIProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
