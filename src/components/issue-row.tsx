import { PRIORITY_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Issue } from '@/lib/types'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

import { DueChip, PriorityIcon, ProjectChip, StatusIcon } from './issue-bits'

export function IssueRow({
  issue,
  showProject = true,
  showDue = true,
  className,
}: {
  issue: Issue
  showProject?: boolean
  showDue?: boolean
  className?: string
}) {
  const { state, toggleIssueDone } = useApp()
  const { openIssueDialog } = useUI()
  const project = state.projects.find((candidate) => candidate.id === issue.projectId)
  const done = issue.status === 'done'

  function open() {
    openIssueDialog({ issueId: issue.id })
  }

  return (
    <div
      onClick={open}
      className={cn(
        'group flex w-full items-center gap-2.5 px-3 py-[7px] transition-colors hover:bg-surface-2',
        className,
      )}
    >
      <button
        type="button"
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        title={done ? 'Mark as not done' : 'Mark as done'}
        onClick={(event) => {
          event.stopPropagation()
          toggleIssueDone(issue.id)
        }}
        className="grid size-5 shrink-0 place-items-center rounded transition-colors hover:bg-surface-3"
      >
        <StatusIcon status={issue.status} className="size-[15px]" />
      </button>

      <span className="hidden w-[58px] shrink-0 font-mono text-[10.5px] tracking-tight text-fg-subtle sm:block">
        {issue.key}
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          open()
        }}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-[13px] outline-none',
          'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent/40',
          done ? 'text-fg-subtle line-through decoration-fg-subtle/40' : 'text-fg',
        )}
      >
        {issue.title}
      </button>

      {issue.labels.length > 0 ? (
        <span className="hidden shrink-0 items-center gap-1 md:flex">
          {issue.labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className="rounded border border-line bg-surface-2 px-1.5 py-px text-[10px] text-fg-muted"
            >
              {label}
            </span>
          ))}
        </span>
      ) : null}

      {showDue ? <DueChip dueDate={issue.dueDate} className="hidden sm:inline-flex" /> : null}

      <span title={PRIORITY_META[issue.priority].label} className="shrink-0">
        <PriorityIcon priority={issue.priority} />
      </span>

      {showProject ? (
        project ? (
          <ProjectChip project={project} className="hidden w-[96px] shrink-0 lg:flex" />
        ) : (
          <span className="hidden w-[96px] shrink-0 text-[11px] text-fg-subtle/70 lg:block">Personal</span>
        )
      ) : null}
    </div>
  )
}
