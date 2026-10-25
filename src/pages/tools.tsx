/**======> Reference By Comment <======
 * ===> 01 - Imports & Constants
 * ===> 02 - Tools Page
 */

//=====> Imports & Constants <=====//

import { BookOpen, Database, RotateCcw, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, Card, CardHeader, PageHeader } from '@/components/ui'
import { ThemePicker } from '@/components/theme-picker'
import { useApp } from '@/lib/store'
import { themeMeta } from '@/lib/themes'
import { useUI } from '@/lib/ui'

//=====> Tools Page <=====//

export default function ToolsPage() {
  //===> Read App State & UI Actions <===//
  const { state, resetData } = useApp()
  const { openSettings } = useUI()

  //===> Derive Display Values <===//
  const theme = themeMeta(state.theme)
  const identity = state.identity

  //===> Handle Destructive Reset <===//
  function handleReset() {
    //===> Guard Clause: Confirm Intent <===//
    if (!window.confirm('Reset the workspace to the demo data? Every change, including identity, is lost.')) {
      return
    }

    //===> Reset State <===//
    resetData()
  }

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Tools"
        description="App-level controls that do not belong to a single workspace area."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/*=====> Documentation <=====*/}
        <Card>
          <CardHeader title="Documentation" hint="pages · features · specs" />
          <div className="px-4 pb-4">
            <p className="text-[12.5px] leading-5 text-fg-muted">
              Every page, feature and specification ships with the app and reads offline.
            </p>
            <Link
              to="/docs"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              <BookOpen className="size-3.5" />
              Open documentation
            </Link>
          </div>
        </Card>

        {/*=====> Personalization <=====*/}
        <Card>
          <CardHeader title="Personalization" hint={`${identity.ownerName} · ${identity.workspaceName}`} />
          <div className="px-4 pb-4">
            <p className="text-[12.5px] leading-5 text-fg-muted">
              Rename <span className="text-fg">{identity.appName}</span>, the workspace and the owner. Changes apply to
              the whole shell immediately.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={openSettings}>
              <Settings2 className="size-3.5" />
              Edit identity
            </Button>
          </div>
        </Card>

        {/*=====> Appearance <=====*/}
        <Card>
          <CardHeader title="Appearance" hint={theme.name} />
          <div className="px-4 pb-4">
            <p className="text-[12.5px] leading-5 text-fg-muted">
              Themes are token sets: colours, radii and display type change together.
            </p>
            <div className="mt-3">
              <ThemePicker />
            </div>
          </div>
        </Card>

        {/*=====> Workspace Data <=====*/}
        <Card>
          <CardHeader title="Workspace data" hint="local SQLite · WAL" />
          <div className="px-4 pb-4">
            <p className="text-[12.5px] leading-5 text-fg-muted">
              Restore the demo workspace. This clears tasks, notes, projects and identity, but never touches media
              drives.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-danger hover:bg-danger/10 hover:text-danger"
              onClick={handleReset}
            >
              <RotateCcw className="size-3.5" />
              Reset demo data
            </Button>
            <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
              <Database className="size-3" />
              Stored locally, never uploaded.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
