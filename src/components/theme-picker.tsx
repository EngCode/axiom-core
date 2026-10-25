/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Theme Menu
 */

import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'

import { useApp } from '@/lib/store'
import { THEMES } from '@/lib/themes'
import { cn } from '@/lib/utils'

import { IconButton } from './ui'

export function ThemePicker({
  placement = 'down',
  className,
}: {
  placement?: 'up' | 'down'
  className?: string
}) {
  const { state, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent) {
      if (container.current && !container.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={container} className={cn('relative', className)}>
      <IconButton
        label="Change theme"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette className="size-4" />
      </IconButton>

      {open ? (
        <div
          role="menu"
          aria-label="Theme"
          className={cn(
            'absolute z-40 w-60 overflow-hidden rounded-card border border-line bg-surface p-1 shadow-lg',
            placement === 'up' ? 'bottom-full start-0 mb-2' : 'top-full start-0 mt-2',
          )}
        >
          {THEMES.map((theme) => {
            const active = state.theme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(theme.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-start transition-colors',
                  active ? 'bg-surface-2' : 'hover:bg-surface-2/70',
                )}
              >
                <span className="flex shrink-0 items-center -space-x-1">
                  {theme.swatch.map((color) => (
                    <span
                      key={color}
                      className="size-3 rounded-full border border-line"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-fg">
                    {theme.name}
                  </span>
                  <span className="block truncate text-[10px] text-fg-subtle">
                    {theme.description}
                  </span>
                </span>
                {active ? <Check className="size-3.5 shrink-0 text-accent" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
