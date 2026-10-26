/**======> Reference By Comment <======
 * ===> 01 - Imports & Contract
 * ===> 02 - Issue List
 */

//=====> Imports & Contract <=====//

import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { DragOverlay } from '@/components/drag-overlay'
import { StatusIcon } from '@/components/issue-bits'
import { Button, Card, EmptyState, IconButton } from '@/components/ui'
import { STATUS_META, STATUS_ORDER } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Issue, Status } from '@/lib/types'
import { usePointerSort } from '@/lib/use-pointer-sort'
import { cn } from '@/lib/utils'

import { IssueRow } from './issue-row'

export function IssueList({
  issues,
  onAdd,
  showProject = true,
  emptyTitle = 'No issues yet',
  emptyDescription = 'Create the first task and it will show up here, grouped by status.',
  className,
}: {
  issues: Issue[]
  onAdd: (status: Status) => void
  showProject?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}) {
  //===> Read Hierarchy <===//
  const { state, reorderIssues } = useApp()
  const visibleIds = new Set(issues.map((issue) => issue.id))
  const parentOf = (issue: Issue) => state.issueExtras[issue.id]?.parentId ?? null

  const roots = issues.filter((issue) => {
    const parentId = parentOf(issue)
    return !parentId || !visibleIds.has(parentId)
  })

  const childrenByParent = new Map<string, Issue[]>()
  for (const issue of issues) {
    const parentId = parentOf(issue)
    if (!parentId || !visibleIds.has(parentId)) continue
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), issue])
  }

  //===> Hierarchy-Aware Sorting <===//
  const { draggingId, overId, pointer, handleProps } = usePointerSort({
    onReorder: (id, targetId) => {
      const dragged = issues.find((issue) => issue.id === id)
      const target = issues.find((issue) => issue.id === targetId)
      if (!dragged || !target || parentOf(dragged) !== parentOf(target)) return
      reorderIssues(id, targetId, parentOf(dragged) === null ? target.status : undefined)
    },
    canDrop: (id, targetId) => {
      const dragged = issues.find((issue) => issue.id === id)
      const target = issues.find((issue) => issue.id === targetId)
      if (!dragged || !target) return false
      return parentOf(dragged) === parentOf(target)
    },
    itemSelector: '[data-issue-row]',
  })

  //===> Empty State <===//
  if (issues.length === 0) {
    return (
      <Card className={className}>
        <EmptyState
          icon={<StatusIcon status="todo" className="size-4" />}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button size="sm" variant="primary" onClick={() => onAdd('todo')}>
              <Plus className="size-3.5" />
              New issue
            </Button>
          }
        />
      </Card>
    )
  }

  //===> Render A Parent Row + Descendants <===//
  function renderBranch(issue: Issue, depth: number): ReactNode {
    const children = childrenByParent.get(issue.id) ?? []
    return (
      <div key={issue.id}>
        <IssueRow
          issue={issue}
          showProject={showProject && depth === 0}
          draggable
          depth={depth}
          dragging={draggingId === issue.id}
          dropTarget={overId === issue.id}
          handleProps={handleProps(issue.id)}
        />
        {children.map((child) => renderBranch(child, depth + 1))}
      </div>
    )
  }

  function branchSize(issue: Issue): number {
    const children = childrenByParent.get(issue.id) ?? []
    return 1 + children.reduce((total, child) => total + branchSize(child), 0)
  }

  const dragged = issues.find((issue) => issue.id === draggingId)

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {STATUS_ORDER.map((status) => {
          const group = roots.filter((issue) => issue.status === status)
          if (group.length === 0) return null

          const total = group.reduce((sum, issue) => sum + branchSize(issue), 0)
          const subtasks = total - group.length

          return (
            <Card key={status}>
              <div className="flex items-center gap-2 px-3 py-2">
                <StatusIcon status={status} />
                <h2 className="text-[12.5px] font-medium text-fg">{STATUS_META[status].label}</h2>
                <span className="text-[10.5px] text-fg-subtle tabular-nums">{total}</span>
                {subtasks > 0 ? (
                  <span className="text-[10.5px] text-fg-subtle/70">
                    · {subtasks} subtask{subtasks === 1 ? '' : 's'}
                  </span>
                ) : null}
                <span className="hidden text-[10.5px] text-fg-subtle/70 sm:inline">
                  · {STATUS_META[status].hint}
                </span>
                <div className="ms-auto">
                  <IconButton
                    label={`New ${STATUS_META[status].label.toLowerCase()} issue`}
                    onClick={() => onAdd(status)}
                    className="size-7"
                  >
                    <Plus className="size-3.5" />
                  </IconButton>
                </div>
              </div>
              <div className="border-t border-line/60">
                {group.map((issue) => renderBranch(issue, 0))}
              </div>
            </Card>
          )
        })}
      </div>

      <DragOverlay
        pointer={pointer}
        label={dragged ? `${dragged.key} · ${dragged.title}` : 'Issue'}
      />
    </>
  )
}
