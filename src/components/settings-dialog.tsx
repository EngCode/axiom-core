/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Personalization Form
 */

import { useEffect, useState, type FormEvent } from 'react'
import { RotateCcw } from 'lucide-react'

import { DEFAULT_IDENTITY, appMonogram } from '@/lib/identity'
import { useApp } from '@/lib/store'
import type { Identity } from '@/lib/types'
import { useUI } from '@/lib/ui'

import { Button, Field, Input, Modal } from './ui'

export function SettingsDialog() {
  const { state, updateIdentity } = useApp()
  const { settingsOpen, closeSettings } = useUI()
  const [draft, setDraft] = useState<Identity>(state.identity)

  useEffect(() => {
    if (settingsOpen) setDraft(state.identity)
  }, [settingsOpen, state.identity])

  function patch(changes: Partial<Identity>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateIdentity(draft)
    closeSettings()
  }

  const appName = draft.appName || DEFAULT_IDENTITY.appName
  const ownerName = draft.ownerName || DEFAULT_IDENTITY.ownerName
  const workspaceName = draft.workspaceName || DEFAULT_IDENTITY.workspaceName

  return (
    <Modal open={settingsOpen} onClose={closeSettings} label="Personalization">
      <form onSubmit={handleSubmit}>
        <div className="px-5 pt-5 pb-4">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">
            Personalization
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-fg-muted">
            Rename the app, the workspace and yourself. Everything updates immediately and is saved
            with your data.
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-control border border-line bg-surface-2/60 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent text-[13px] font-bold text-accent-fg">
              {appMonogram(appName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-fg">{appName}</p>
              <p className="truncate text-[10.5px] text-fg-subtle">
                {ownerName} · {workspaceName}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Field label="App name">
              <Input
                autoFocus
                value={draft.appName}
                onChange={(event) => patch({ appName: event.target.value })}
                placeholder={DEFAULT_IDENTITY.appName}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Workspace name">
                <Input
                  value={draft.workspaceName}
                  onChange={(event) => patch({ workspaceName: event.target.value })}
                  placeholder={DEFAULT_IDENTITY.workspaceName}
                />
              </Field>
              <Field label="Your name">
                <Input
                  value={draft.ownerName}
                  onChange={(event) => patch({ ownerName: event.target.value })}
                  placeholder={DEFAULT_IDENTITY.ownerName}
                />
              </Field>
            </div>
            <p className="text-[10.5px] text-fg-subtle">
              Leave a field empty to fall back to the default.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => setDraft(DEFAULT_IDENTITY)}>
            <RotateCcw className="size-3.5" />
            Reset fields
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={closeSettings}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
