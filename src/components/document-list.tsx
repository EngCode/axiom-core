/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Document List
 */

//=====> Imports <=====//

import { FileText, Pin, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, Card, EmptyState } from '@/components/ui'
import { sortNotes } from '@/lib/derive'
import { useApp } from '@/lib/store'
import type { DocumentRecord } from '@/lib/types'
import { formatRelative } from '@/lib/utils'

//=====> Document List <=====//

export function DocumentList({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Write a brief, a spec or a decision record.',
  onCreate,
  showProject = true,
}: {
  documents: DocumentRecord[]
  emptyTitle?: string
  emptyDescription?: string
  onCreate?: () => void
  showProject?: boolean
}) {
  //===> Read Projects For Labels <===//
  const { state } = useApp()

  //===> Guard Clause: Empty <===//
  if (documents.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText className="size-4" />}
          title={emptyTitle}
          description={emptyDescription}
          action={
            onCreate ? (
              <Button size="sm" variant="primary" onClick={onCreate}>
                <Plus className="size-3.5" />
                New document
              </Button>
            ) : undefined
          }
        />
      </Card>
    )
  }

  //===> Render Rows <===//
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {sortNotes(documents).map((document) => {
        const project = state.projects.find((candidate) => candidate.id === document.projectId)

        return (
          <Link
            key={document.id}
            to={`/documents?doc=${document.id}`}
            className="flex items-center gap-3 border-b border-line/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-surface-2"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-subtle">
              <FileText className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-medium text-fg">{document.title}</span>
                {document.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-fg-subtle">
                {showProject ? `${project?.name ?? 'Workspace'} · ` : ''}
                {formatRelative(document.updatedAt)}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
