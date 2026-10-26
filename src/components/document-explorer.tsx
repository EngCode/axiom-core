/**======> Reference By Comment <======
 * ===> 01 - Imports & Contract
 * ===> 02 - Document Explorer
 */

//=====> Imports & Contract <=====//

import type { ReactNode } from 'react'
import { FileText, Pin, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, Card, EmptyState } from '@/components/ui'
import { FolderTree } from '@/components/folder-tree'
import type { DocumentRecord, FolderRecord } from '@/lib/types'
import { useApp } from '@/lib/store'
import { cn, formatRelative } from '@/lib/utils'

export function DocumentExplorer({
  documents,
  folders,
  selectedId,
  folderId,
  counts,
  total,
  query,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateDocument,
}: {
  documents: DocumentRecord[]
  folders: FolderRecord[]
  selectedId: string | null
  folderId: string | null
  counts: Record<string, number>
  total: number
  query: string
  onSelectFolder: (id: string | null) => void
  onCreateFolder: (parentId: string | null, name: string) => void
  onRenameFolder: (folder: FolderRecord, name: string) => void
  onDeleteFolder: (folder: FolderRecord) => void
  onCreateDocument: () => void
}) {
  //===> Read Project Labels <===//
  const { state } = useApp()
  const visibleIds = new Set(documents.map((document) => document.id))

  //===> Build Page Tree <===//
  const roots = documents.filter(
    (document) => !document.parentId || !visibleIds.has(document.parentId),
  )
  const childrenByParent = new Map<string, DocumentRecord[]>()
  for (const document of documents) {
    if (!document.parentId || !visibleIds.has(document.parentId)) continue
    childrenByParent.set(document.parentId, [
      ...(childrenByParent.get(document.parentId) ?? []),
      document,
    ])
  }

  function renderPage(document: DocumentRecord, depth: number): ReactNode {
    const children = childrenByParent.get(document.id) ?? []
    const project = state.projects.find((candidate) => candidate.id === document.projectId)

    return (
      <div key={document.id}>
        <Link
          to={`/documents?doc=${document.id}`}
          className={cn(
            'flex items-center gap-2 py-2 pe-3 transition-colors last:border-b-0 hover:bg-surface-2',
            selectedId === document.id && 'bg-surface-2',
          )}
          style={{ paddingInlineStart: 12 + depth * 14 }}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-subtle">
            <FileText className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[12px] font-medium text-fg">
                {document.title || 'Untitled'}
              </span>
              {document.pinned ? <Pin className="size-3 shrink-0 text-accent" /> : null}
            </span>
            <span className="mt-0.5 block truncate text-[9.5px] text-fg-subtle">
              {project?.name ?? 'Workspace'} · {formatRelative(document.updatedAt)}
            </span>
          </span>
        </Link>
        {children.map((child) => renderPage(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden">
        <FolderTree
          folders={folders}
          kind="documents"
          selectedId={folderId}
          onSelect={onSelectFolder}
          counts={counts}
          total={total}
          onCreate={onCreateFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
        />
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-4" />}
            title={query ? 'No matches' : 'No pages here'}
            description={
              query ? 'Try a different search term.' : 'Create a page or a child page for this folder.'
            }
            action={
              <Button size="sm" variant="primary" onClick={onCreateDocument}>
                <Plus className="size-3.5" />
                New page
              </Button>
            }
          />
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            {roots.map((document) => renderPage(document, 0))}
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={onCreateDocument}
        className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-line px-2 py-2 text-[11px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
      >
        <FileText className="size-3.5" />
        New page
      </button>
    </div>
  )
}
