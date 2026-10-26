/**======> Reference By Comment <======
 * ===> 01 - Imports & Contract
 * ===> 02 - Issue List
 */

//=====> Imports & Contract <=====//

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
  //===> Drag Reorder <===//
  const { reorderIssues } = useApp()
  const { draggingId, overId, pointer, handleProps } = usePointerSort({
    onReorder: (id, targetId) => {
      const target = issues.find((issue) => issue.id === targetId)
      reorderIssues(id, targetId, target?.status)
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

  //===> Grouped List <===//
  const dragged = issues.find((issue) => issue.id === draggingId)

  return (
    <>
      <div className={cn('space-y-3', className)}>
      {STATUS_ORDER.map((status) => {
        const group = issues.filter((issue) => issue.status === status)
        if (group.length === 0) return null

        return (
          <Card key={status}>
            <div className="flex items-center gap-2 px-3 py-2">
              <StatusIcon status={status} />
              <h2 className="text-[12.5px] font-medium text-fg">{STATUS_META[status].label}</h2>
              <span className="text-[10.5px] text-fg-subtle tabular-nums">{group.length}</span>
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
            <div className="divide-y divide-line/60 border-t border-line/60">
              {group.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  showProject={showProject}
                  draggable
                  dragging={draggingId === issue.id}
                  dropTarget={overId === issue.id}
                  handleProps={handleProps(issue.id)}
                />
              ))}
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
