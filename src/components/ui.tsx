/**======> Reference By Comment <======
 * ===> 01 - Imports & Style Maps
 * ===> 02 - Button & Icon Primitives
 * ===> 03 - Form Controls
 * ===> 04 - Surfaces & Feedback
 * ===> 05 - Overlays & Layout
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

import { cn, initials } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

//=====> Button & Icon Primitives <=====//

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-sm hover:brightness-110 active:brightness-95',
  secondary:
    'border border-line bg-surface-2 text-fg hover:border-line-strong hover:bg-surface-3',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger:
    'border border-danger/25 bg-danger/10 text-danger hover:border-danger/40 hover:bg-danger/15',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-control px-2.5 text-[12.5px]',
  md: 'h-9 gap-2 rounded-control px-3.5 text-[13px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-all outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  className,
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors',
        'hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-line',
        'bg-surface-2 px-1 text-[10px] font-medium text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Progress({
  value,
  className,
  barClassName,
  color,
}: {
  value: number
  className?: string
  barClassName?: string
  color?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full bg-accent transition-[width] duration-500', barClassName)}
        style={{ width: `${clamped}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  )
}

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[10.5px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

//=====> Surfaces & Feedback <=====//

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-card border border-line bg-surface', className)}>{children}</section>
  )
}

export function CardHeader({
  title,
  hint,
  action,
  icon,
  className,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="truncate text-[13px] font-medium tracking-[-0.01em] text-fg">{title}</h2>
        {hint ? <span className="truncate text-[11.5px] text-fg-subtle">{hint}</span> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

//=====> Form Controls <=====//

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-control border border-line bg-surface-2 px-3 text-[13px] text-fg',
        'transition-colors outline-none placeholder:text-fg-subtle',
        'hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-9 w-full appearance-none rounded-control border border-line bg-surface-2 py-0 ps-3 pe-8',
          'text-[13px] text-fg transition-colors outline-none',
          'hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 end-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
    </div>
  )
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-[11px]',
    lg: 'size-10 text-[13px]',
  }
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-accent-fg',
        'bg-gradient-to-br from-accent to-accent/60 ring-1 ring-inset ring-white/20',
        sizes[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      {icon ? (
        <div className="mb-1 grid size-10 place-items-center rounded-full border border-line bg-surface-2 text-fg-subtle">
          {icon}
        </div>
      ) : null}
      <p className="text-[13px] font-medium text-fg">{title}</p>
      {description ? (
        <p className="max-w-xs text-[12.5px] leading-5 text-fg-subtle">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10.5px] font-medium tracking-[0.16em] text-fg-subtle uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 font-display text-[23px] font-semibold tracking-[-0.025em] text-fg">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-6 text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

//=====> Overlays & Layout <=====//

export function Modal({
  open,
  onClose,
  children,
  className,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  label: string
}) {
  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[8vh] sm:px-4 sm:pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'animate-pop-in relative w-full max-w-lg overflow-hidden rounded-card border border-line',
          'bg-surface shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)]',
          className,
        )}
      >
        <IconButton label="Close" onClick={onClose} className="absolute top-3 right-3 z-10">
          <X className="size-4" />
        </IconButton>
        {children}
      </div>
    </div>,
    document.body,
  )
}
