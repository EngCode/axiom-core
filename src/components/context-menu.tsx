/**======> Reference By Comment <======
 * ===> 01 - Imports & Types
 * ===> 02 - Context Menu
 */

//=====> Imports & Types <=====//

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface MenuAction {
  id: string
  label: string
  icon?: LucideIcon
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** Draw a divider above this item. */
  divider?: boolean
  run: () => void
}

//=====> Context Menu <=====//

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuAction[]
  onClose: () => void
}) {
  //===> Local Position (Clamped After Measure) <===//
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  //===> Clamp To Viewport & Focus First Item <===//
  useEffect(() => {
    const element = menu.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    setPosition({
      x: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    })

    const first = element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    first?.focus()
  }, [x, y])

  //===> Dismiss On Outside Click, Escape Or Scroll <===//
  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) onClose()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      //===> Arrow Navigation <===//
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()

      const buttons = Array.from(
        menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
      )
      if (buttons.length === 0) return

      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % buttons.length
          : (index - 1 + buttons.length) % buttons.length
      buttons[next]?.focus()
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  //===> Render Menu <===//
  return createPortal(
    <div
      ref={menu}
      role="menu"
      aria-label="Actions"
      style={{ left: position.x, top: position.y }}
      className="menu-pop fixed z-[70] w-56 max-w-[calc(100vw-1rem)] rounded-card border border-line bg-surface p-1 shadow-2xl"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.id}>
            {item.divider ? <div className="my-1 h-px bg-line" /> : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                item.run()
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-start text-[12px] transition-colors',
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              {Icon ? <Icon className="size-3.5 shrink-0" /> : <span className="size-3.5" />}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut ? (
                <span className="font-mono text-[10px] text-fg-subtle">{item.shortcut}</span>
              ) : null}
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
