/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Issue Row
 */

//=====> Imports <=====//

import { useState } from 'react'
import { CheckSquare, GripVertical, ListTree, MoreHorizontal, Paperclip } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ContextMenu } from '@/components/context-menu'
import { issueMenu, type IssueActions } from '@/lib/actions'
import type { PointerSortHandleProps } from '@/lib/use-pointer-sort'
import { PRIORITY_META } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Issue } from '@/lib/types'
import { useUI } from '@/lib/ui'
import { cn } from '@/lib/utils'

import { DueChip, PriorityIcon, ProjectChip, StatusIcon } from './issue-bits'

//=====> Issue Row <=====//

export function IssueRow({
  issue,
  showProject = true,
  showDue = true,
  className,
  draggable = false,
  dragging = false,
  dropTarget = false,
  handleProps,
}: {
  issue: Issue
  showProject?: boolean
  showDue?: boolean
  className?: string
  draggable?: boolean
  dragging?: boolean
  dropTarget?: boolean
  handleProps?: PointerSortHandleProps
}) {
  //===> Read State & UI <===//
  const { state, toggleIssueDone, deleteIssue } = useApp()
  const { openIssueDialog } = useUI()
  const navigate = useNavigate()

  //===> Local Menu State <===//
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  //===> Derive Display Values <===//
  const project = state.projects.find((candidate) => candidate.id === issue.projectId)
  const extras = state.issueExtras[issue.id]
  const checklistDone = extras?.checklist.filter((item) => item.done).length ?? 0
  const subtaskCount = state.issues.filter(
    (candidate) => state.issueExtras[candidate.id]?.parentId === issue.id,
  ).length
  const done = issue.status === 'done'

  //===> Build Action Handlers <===//
  const actions: IssueActions = {
    edit: () => openIssueDialog({ issueId: issue.id }),
    toggleDone: () => toggleIssueDone(issue.id),
    openProject: (target) => navigate(`/projects/${target.id}`),
    remove: () => {
      //===> Guard Clause: Confirm Delete <===//
      if (!window.confirm(`Delete ${issue.key}? This cannot be undone.`)) return
      deleteIssue(issue.id)
    },
    copyKey: () => {
      void navigator.clipboard?.writeText(issue.key)
    },
  }

  return (
    <>
      <div
        onClick={() => actions.edit()}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
        onKeyDown={(event) => {
          //===> Keyboard Menu (Shift+F10) <===//
          if (!event.shiftKey || event.key !== 'F10') return
          event.preventDefault()
          const rect = event.currentTarget.getBoundingClientRect()
          setMenu({ x: rect.left + 32, y: rect.top + 16 })
        }}
        tabIndex={0}
        data-issue-row
        data-sort-id={issue.id}
        className={cn(
          'group flex w-full items-center gap-2.5 px-3 py-[7px] transition-colors outline-none',
          'hover:bg-surface-2 focus-visible:bg-surface-2',
          dragging && 'opacity-40',
          dropTarget && 'bg-accent-soft/30 ring-1 ring-accent/40 ring-inset',
          className,
        )}
      >
        {draggable ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Drag issue to reorder"
            title="Drag to reorder"
            {...handleProps}
            className="grid size-3 shrink-0 cursor-grab touch-none place-items-center text-fg-subtle opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3" />
          </span>
        ) : null}

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
            actions.edit()
          }}
          className={cn(
            'min-w-0 flex-1 truncate text-start text-[13px] outline-none',
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

        {extras && extras.checklist.length > 0 ? (
          <span
            className="hidden shrink-0 items-center gap-0.5 text-[9.5px] text-fg-subtle sm:flex"
            title={`${checklistDone}/${extras.checklist.length} checklist items`}
          >
            <CheckSquare className="size-3" />
            {checklistDone}/{extras.checklist.length}
          </span>
        ) : null}
        {subtaskCount > 0 ? (
          <span
            className="hidden shrink-0 items-center gap-0.5 text-[9.5px] text-fg-subtle sm:flex"
            title={`${subtaskCount} subtasks`}
          >
            <ListTree className="size-3" />
            {subtaskCount}
          </span>
        ) : null}
        {extras && extras.attachments.length > 0 ? (
          <span
            className="hidden shrink-0 items-center gap-0.5 text-[9.5px] text-fg-subtle sm:flex"
            title={`${extras.attachments.length} attachments`}
          >
            <Paperclip className="size-3" />
            {extras.attachments.length}
          </span>
        ) : null}
        {showDue ? <DueChip dueDate={issue.dueDate} className="hidden sm:inline-flex" /> : null}

        <span title={PRIORITY_META[issue.priority].label} className="shrink-0">
          <PriorityIcon priority={issue.priority} />
        </span>

        {showProject ? (
          project ? (
            <ProjectChip project={project} className="hidden w-[112px] shrink-0 lg:flex" />
          ) : (
            <span className="hidden w-[112px] shrink-0 text-[11px] text-fg-subtle/70 lg:block">
              Personal
            </span>
          )
        ) : null}

        <button
          type="button"
          aria-label="Issue actions"
          title="Issue actions"
          onClick={(event) => {
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            setMenu({ x: rect.right - 8, y: rect.bottom + 4 })
          }}
          className="grid size-5 shrink-0 place-items-center rounded text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={issueMenu(issue, project, actions)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </>
  )
}
