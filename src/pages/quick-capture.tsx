import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { CornerDownLeft } from 'lucide-react'

import { AppProvider, useApp } from '@/lib/store'
import { isTauri } from '@/lib/tauri'
import { localISODate } from '@/lib/utils'

async function closeCaptureWindow() {
  if (!isTauri()) return
  try {
    await getCurrentWindow().close()
  } catch {
    /* the window may already be gone */
  }
}

export function QuickCaptureApp() {
  return (
    <AppProvider>
      <QuickCapture />
    </AppProvider>
  )
}

function QuickCapture() {
  const { addIssue, state } = useApp()
  const [title, setTitle] = useState('')
  const [saved, setSaved] = useState(false)
  const [projectId, setProjectId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const openedAt = Date.now()

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        void closeCaptureWindow()
      }
    }
    window.addEventListener('keydown', handleKey)

    let unlisten: (() => void) | undefined
    let cancelled = false

    if (isTauri()) {
      getCurrentWindow()
        .onFocusChanged(({ payload: focused }) => {
          // Ignore the initial focus dance while the window is appearing.
          if (!focused && Date.now() - openedAt > 450) void closeCaptureWindow()
        })
        .then((stop) => {
          if (cancelled) stop()
          else unlisten = stop
        })
        .catch(() => {
          /* focus events are a nicety; Esc still works */
        })
    }

    return () => {
      cancelled = true
      window.removeEventListener('keydown', handleKey)
      unlisten?.()
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    addIssue({
      title: value,
      status: 'todo',
      dueDate: localISODate(),
      projectId: projectId || null,
    })
    setSaved(true)
    window.setTimeout(() => {
      void closeCaptureWindow()
    }, 220)
  }

  return (
    <div className="flex h-full flex-col justify-center gap-2 border border-line bg-surface px-3 py-3">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 transition-colors focus-within:border-accent/50"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent/15 text-accent">
          <CornerDownLeft className="size-3.5" />
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Capture a task…"
          aria-label="Capture a task"
          className="h-6 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
        />
        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          aria-label="Project"
          className="h-6 max-w-[128px] shrink-0 rounded border border-line bg-surface px-1.5 text-[10.5px] text-fg-muted outline-none focus:border-accent/50"
        >
          <option value="">Inbox</option>
          {state.projects
            .filter((project) => project.status !== 'done')
            .map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
        <kbd className="inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-line bg-surface px-1 font-mono text-[10px] text-fg-subtle">
          ↵
        </kbd>
      </form>

      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-1 text-[10.5px] text-fg-subtle"
      >
        <span>{saved ? `Added to ${state.identity.appName} · due ${localISODate()}` : 'Enter to capture · Esc to dismiss'}</span>
        <span className="text-fg-subtle/70">{state.identity.appName} · quick capture</span>
      </div>
    </div>
  )
}
