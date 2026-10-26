/**======> Reference By Comment <======
 * ===> 01 - Imports & Constants
 * ===> 02 - Appearance Section
 * ===> 03 - Profile Section
 * ===> 04 - Data Section
 * ===> 05 - Settings Page
 */

//=====> Imports & Constants <=====//

import { useEffect, useState, type FormEvent } from 'react'
import { BookOpen, Check, Database, RotateCcw, Settings2, Upload } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
} from '@/components/ui'
import {
  BACKGROUND_KINDS,
  BACKGROUND_SCOPES,
  DEFAULT_APPEARANCE,
} from '@/lib/appearance'
import { DEFAULT_IDENTITY } from '@/lib/identity'
import { useApp } from '@/lib/store'
import { THEMES, themeMeta } from '@/lib/themes'
import type { BackgroundKind, BackgroundScope, BackgroundSettings, Identity } from '@/lib/types'
import { cn } from '@/lib/utils'


async function resizeBackgroundImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', 0.82)
}
//=====> Settings Page <=====//

export default function UserPage() {
  //===> Read State & Actions <===//
  const { state, setTheme, updateIdentity, updateBackground, updatePageBackground, resetData } = useApp()

  //===> Define Profile Draft <===//
  const [draft, setDraft] = useState<Identity>(state.identity)
  useEffect(() => {
    setDraft(state.identity)
  }, [state.identity])

  //===> Derive Display Values <===//
  const location = useLocation()
  const pageBackground = state.appearance.pageBackgrounds[location.pathname]
  const pageOnly = Boolean(pageBackground)
  const background = pageBackground ?? state.appearance.background

  function applyBackground(patch: Partial<BackgroundSettings>) {
    if (pageOnly) updatePageBackground(location.pathname, patch)
    else updateBackground(patch)
  }
  const theme = themeMeta(state.theme)

  //===> Save Identity <===//
  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateIdentity(draft)
  }

  //===> Reset Demo Data <===//
  function handleResetData() {
    //===> Guard Clause: Confirm Intent <===//
    if (!window.confirm('Reset the workspace to the demo data? Every change, including identity and appearance, is lost.')) {
      return
    }
    resetData()
  }

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="User"
        description="Your profile, appearance and local workspace. Private by default."
      />

      {/*=====> Appearance Section <=====*/}
      <Card>
        <CardHeader title="Appearance" hint={`${theme.name} · theme`} />
        <div className="space-y-4 px-4 pb-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {THEMES.map((entry) => {
              const active = state.theme === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTheme(entry.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-card border p-3 text-start transition-colors',
                    active
                      ? 'border-accent/50 bg-accent-soft/40'
                      : 'border-line bg-surface-2/30 hover:border-line-strong',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex shrink-0 items-center -space-x-1">
                      {entry.swatch.map((color) => (
                        <span
                          key={color}
                          className="size-3 rounded-full border border-line"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="truncate text-[12.5px] font-medium text-fg">{entry.name}</span>
                    {active ? <Check className="ms-auto size-3.5 shrink-0 text-accent" /> : null}
                  </span>
                  <span className="mt-1.5 block text-[10.5px] leading-4 text-fg-subtle">
                    {entry.description}
                  </span>
                </button>
              )
            })}
          </div>

          {/*====> Background Layer <====*/}
          <div className="border-t border-line pt-4">
            <p className="text-[11px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
              Background
            </p>
            <p className="mt-1 text-[11.5px] leading-5 text-fg-muted">
              A decorative layer blended into the theme canvas. It never touches content contrast.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface-2/30 px-2.5 py-2">
              <div>
                <p className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
                  Apply to
                </p>
                <p className="text-[10px] text-fg-subtle">
                  {pageOnly ? `Only ${location.pathname}` : 'Every page'}
                </p>
              </div>
              <div className="inline-flex items-center rounded-control border border-line bg-surface p-0.5">
                <button
                  type="button"
                  aria-pressed={!pageOnly}
                  onClick={() => updatePageBackground(location.pathname, null)}
                  className={`rounded-control px-2 py-1 text-[10.5px] transition-colors ${
                    pageOnly ? 'text-fg-subtle hover:text-fg' : 'bg-surface-3 text-fg'
                  }`}
                >
                  Everywhere
                </button>
                <button
                  type="button"
                  aria-pressed={pageOnly}
                  onClick={() => updatePageBackground(location.pathname, {})}
                  className={`rounded-control px-2 py-1 text-[10.5px] transition-colors ${
                    pageOnly ? 'bg-surface-3 text-fg' : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  This page
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Style">
                <Select
                  value={background.kind}
                  onChange={(event) =>
                    applyBackground({ kind: event.target.value as BackgroundKind })
                  }
                >
                  {BACKGROUND_KINDS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Scope">
                <Select
                  value={background.scope}
                  onChange={(event) =>
                    applyBackground({ scope: event.target.value as BackgroundScope })
                  }
                >
                  {BACKGROUND_SCOPES.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {background.kind === 'image' ? (
              <div className="mt-3">
                <Field label="Image URL">
                  <Input
                    value={background.imageUrl}
                    onChange={(event) => applyBackground({ imageUrl: event.target.value })}
                    placeholder="https://…/texture.jpg"
                  />
                </Field>
                <p className="mt-1 text-[10px] text-fg-subtle">
                  Images are blended with soft-light over the current theme.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-line bg-surface-2 px-2.5 text-[11.5px] font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-3">
                    <Upload className="size-3.5" />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file || !file.type.startsWith('image/')) return
                        try {
                          const imageUrl = await resizeBackgroundImage(file)
                          applyBackground({ kind: 'image', imageUrl })
                        } catch {
                          window.alert('That image could not be read.')
                        }
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <span className="text-[10px] text-fg-subtle">
                    Resized to 1600 px and stored locally.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <label className="flex items-center justify-between gap-3 text-[10.5px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
                Opacity
                <span className="text-fg-muted tabular-nums">
                  {Math.round(background.opacity * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.02}
                value={background.opacity}
                onChange={(event) => applyBackground({ opacity: Number(event.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer accent-[var(--accent)]"
                aria-label="Background opacity"
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                if (pageOnly) updatePageBackground(location.pathname, null)
                else updateBackground(DEFAULT_APPEARANCE.background)
              }}
              >
                <RotateCcw className="size-3.5" />
                Clear background
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/*=====> Profile Section <=====*/}
      <Card>
        <CardHeader title="Profile" hint={`${draft.ownerName || 'you'} · ${draft.workspaceName || 'workspace'}`} />
        <form onSubmit={handleProfileSubmit}>
          <div className="space-y-3 px-4 pb-4">
            <Field label="App name">
              <Input
                value={draft.appName}
                onChange={(event) => setDraft({ ...draft, appName: event.target.value })}
                placeholder={DEFAULT_IDENTITY.appName}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Workspace name">
                <Input
                  value={draft.workspaceName}
                  onChange={(event) => setDraft({ ...draft, workspaceName: event.target.value })}
                  placeholder={DEFAULT_IDENTITY.workspaceName}
                />
              </Field>
              <Field label="Your name">
                <Input
                  value={draft.ownerName}
                  onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })}
                  placeholder={DEFAULT_IDENTITY.ownerName}
                />
              </Field>
            </div>
            <p className="text-[10.5px] text-fg-subtle">Empty fields fall back to the defaults.</p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-2/40 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft(DEFAULT_IDENTITY)}
            >
              <RotateCcw className="size-3.5" />
              Reset fields
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Settings2 className="size-3.5" />
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      {/*=====> Data Section <=====*/}
      <Card>
        <CardHeader title="Local data" hint="SQLite · WAL" />
        <div className="flex flex-col gap-3 px-4 pb-4 text-[12.5px] leading-5 text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-1.5">
            <Database className="mt-0.5 size-3.5 shrink-0" />
            Stored on this machine. Media drives are never written to.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10 hover:text-danger"
            onClick={handleResetData}
          >
            <RotateCcw className="size-3.5" />
            Reset demo data
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Help" hint="offline" />
        <div className="flex flex-col gap-2 px-4 pb-4 text-[12px] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <BookOpen className="mt-0.5 size-3.5 shrink-0" />
            Pages, features and specs ship with the app and read offline.
          </span>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-accent underline decoration-accent/30 underline-offset-2"
          >
            Open documentation
          </Link>
        </div>
      </Card>
    </div>
  )
}
