/**======> Reference By Comment <======
 * ===> 01 - Imports & Icon Maps
 * ===> 02 - Status & Priority Indicators
 * ===> 03 - Chips & Pickers
 */

import { CalendarDays, Circle, CircleCheck, CircleDashed, CircleDot, Minus } from 'lucide-react'

import { PRIORITY_META, PRIORITY_ORDER, PROJECT_COLORS, STATUS_META, STATUS_ORDER } from '@/lib/meta'
import type { Priority, Project, Status } from '@/lib/types'
import { cn, describeDue } from '@/lib/utils'

const STATUS_ICONS = {
  backlog: CircleDashed,
  todo: Circle,
  in_progress: CircleDot,
  done: CircleCheck,
} as const

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const Icon = STATUS_ICONS[status]
  return <Icon className={cn('size-3.5 shrink-0', STATUS_META[status].tone, className)} />
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority]
  if (priority === 'none') {
    return (
      <span title={meta.label} className={cn('inline-flex h-3 w-3.5 items-center justify-center text-fg-subtle', className)}>
        <Minus className="size-3" />
      </span>
    )
  }
  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={cn('inline-flex h-3 w-3.5 items-end justify-center gap-[2px]', meta.tone, className)}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn('w-[2.5px] rounded-[1px] bg-current', index < meta.bars ? 'opacity-100' : 'opacity-25')}
          style={{ height: `${5 + index * 3}px` }}
        />
      ))}
    </span>
  )
}

const DUE_TONES = {
  overdue: 'border-danger/25 bg-danger-soft text-danger',
  today: 'border-warn/30 bg-warn-soft text-warn',
  soon: 'border-line bg-surface-2 text-fg-muted',
  later: 'border-transparent text-fg-subtle',
} as const

export function DueChip({ dueDate, className }: { dueDate: string | null; className?: string }) {
  if (!dueDate) return null
  const due = describeDue(dueDate)
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[10.5px] font-medium whitespace-nowrap',
        DUE_TONES[due.tone],
        className,
      )}
    >
      <CalendarDays className="size-2.5" />
      {due.label}
    </span>
  )
}

export function ProjectDot({ project, className }: { project: Project; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-1.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: PROJECT_COLORS[project.color].hex }}
    />
  )
}

export function ProjectChip({ project, className }: { project: Project; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-[11px] text-fg-subtle', className)}>
      <ProjectDot project={project} />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

export function StatusPicker({
  value,
  onChange,
}: {
  value: Status
  onChange: (status: Status) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={cn(
            'flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11.5px] font-medium transition-colors',
            value === status
              ? 'border-accent/45 bg-accent-soft text-fg'
              : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg',
          )}
        >
          <StatusIcon status={status} />
          {STATUS_META[status].label}
        </button>
      ))}
    </div>
  )
}

export function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority
  onChange: (priority: Priority) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
      {PRIORITY_ORDER.map((priority) => (
        <button
          key={priority}
          type="button"
          aria-pressed={value === priority}
          onClick={() => onChange(priority)}
          className={cn(
            'flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11.5px] font-medium transition-colors',
            value === priority
              ? 'border-accent/45 bg-accent-soft text-fg'
              : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg',
          )}
        >
          <PriorityIcon priority={priority} />
          {PRIORITY_META[priority].label}
        </button>
      ))}
    </div>
  )
}
