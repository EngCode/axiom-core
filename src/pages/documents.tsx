/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Document Editor
 * ===> 03 - Documents Page
 */

//=====> Imports <=====//

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Eye,
  FileText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { DocumentList } from '@/components/document-list'
import { RichContent, RichTextEditor } from '@/lib/rich-text'
import { Button, Card, IconButton, Input, PageHeader } from '@/components/ui'
import { sortNotes } from '@/lib/derive'
import { useApp } from '@/lib/store'
import type { DocumentRecord } from '@/lib/types'
import { cn, formatRelative } from '@/lib/utils'

//=====> Document Editor <=====//

function DocumentEditor({
  document,
  onDeleted,
}: {
  document: DocumentRecord
  onDeleted: () => void
}) {
  //===> Read & Mutate <===//
  const { state, updateDocument, deleteDocument, toggleDocumentPin, linkTask } = useApp()
  const [preview, setPreview] = useState(false)

  //===> Derive Project <===//
  const project = state.projects.find((candidate) => candidate.id === document.projectId)
  const words = document.content.trim() ? document.content.trim().split(/\s+/).length : 0

  //===> Delete With Confirmation <===//
  function handleDelete() {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return
    deleteDocument(document.id)
    onDeleted()
  }

  //===> Render Editor <===//
  return (
    <Card className="flex min-h-[560px] flex-col overflow-hidden">
      <div className="border-b border-line p-3">
        {project ? (
          <Link
            to={`/projects/${project.id}`}
            className="mb-2 inline-flex items-center gap-1 text-[10.5px] text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3 rtl:rotate-180" />
            {project.name}
          </Link>
        ) : null}

        <input
          value={document.title}
          onChange={(event) => updateDocument(document.id, { title: event.target.value })}
          aria-label="Document title"
          className="w-full bg-transparent text-[19px] font-semibold tracking-[-0.02em] text-fg outline-none placeholder:text-fg-subtle"
          placeholder="Untitled document"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-fg-subtle">
          <select
            value={document.projectId ?? ''}
            onChange={(event) =>
              updateDocument(document.id, { projectId: event.target.value || null })
            }
            aria-label="Document project"
            className="h-7 rounded-control border border-line bg-surface-2 px-1.5 text-[10.5px] text-fg-muted outline-none"
          >
            <option value="">No project</option>
            {state.projects.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          <select
            value={state.taskLinks[`doc:${document.id}`] ?? ''}
            onChange={(event) => linkTask(`doc:${document.id}`, event.target.value || null)}
            aria-label="Linked task"
            className="h-7 max-w-[200px] rounded-control border border-line bg-surface-2 px-1.5 text-[10.5px] text-fg-muted outline-none"
          >
            <option value="">No task</option>
            {state.issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.key} · {issue.title}
              </option>
            ))}
          </select>          <span>Edited {formatRelative(document.updatedAt)}</span>
          <div className="ms-auto flex items-center gap-0.5">
            <IconButton
              label={document.pinned ? 'Unpin document' : 'Pin document'}
              onClick={() => toggleDocumentPin(document.id)}
            >
              {document.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </IconButton>
            <IconButton
              label="Delete document"
              className="text-danger hover:bg-danger/10"
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-line bg-surface-2/30 px-3 py-1.5">
        <div className="inline-flex items-center rounded-control border border-line bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setPreview(false)}
            aria-pressed={!preview}
            className={cn(
              'inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-[10.5px] transition-colors',
              preview ? 'text-fg-subtle hover:text-fg' : 'bg-surface-3 text-fg',
            )}
          >
            <Pencil className="size-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            aria-pressed={preview}
            className={cn(
              'inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-[10.5px] transition-colors',
              preview ? 'bg-surface-3 text-fg' : 'text-fg-subtle hover:text-fg',
            )}
          >
            <Eye className="size-3" />
            Preview
          </button>
        </div>
        <span className="text-[10px] text-fg-subtle tabular-nums">
          {words} {words === 1 ? 'word' : 'words'}
        </span>
      </div>

      {preview ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {document.content.trim() ? (
            <RichContent content={document.content} />
          ) : (
            <p className="text-[12px] text-fg-subtle">Nothing written yet.</p>
          )}
        </div>
      ) : (
        <RichTextEditor
          key={document.id}
          value={document.content}
          onChange={(content) => updateDocument(document.id, { content })}
          placeholder="Start writing…"
          className="m-3 flex-1 border-0 bg-transparent"
          minHeight={420}
        />
      )}
    </Card>
  )
}

//=====> Documents Page <=====//

export default function DocumentsPage() {
  //===> Read Documents & Selection <===//
  const { state, addDocument } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => sortNotes(state.documents), [state.documents])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((document) =>
      `${document.title} ${document.content}`.toLowerCase().includes(needle),
    )
  }, [sorted, query])

  const requested = searchParams.get('doc')
  const selected = state.documents.find((document) => document.id === requested) ?? sorted[0]

  //===> Create & Select <===//
  function createDocument(projectId?: string | null) {
    const id = addDocument({ title: 'Untitled document', projectId: projectId ?? null })
    setSearchParams({ doc: id })
    setQuery('')
  }

  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Documents"
        description="Long-form pages for briefs, specs and decisions. Attach one to a project to keep it with the work."
        actions={
          <Button variant="primary" onClick={() => createDocument()}>
            <Plus className="size-3.5" />
            New document
          </Button>
        }
      />

      {state.documents.length === 0 ? (
        <DocumentList
          documents={[]}
          onCreate={() => createDocument()}
          emptyTitle="No documents yet"
          emptyDescription="Write the first brief; it can belong to a project or stand alone."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents…"
                aria-label="Search documents"
                className="h-8 ps-8 text-[12px]"
              />
            </div>
            <DocumentList
              documents={filtered}
              onCreate={() => createDocument()}
              emptyTitle="No matches"
              emptyDescription="Try a different search term."
            />
            <button
              type="button"
              onClick={() => createDocument()}
              className="flex w-full items-center justify-center gap-1.5 rounded-control border border-dashed border-line px-2 py-2 text-[11px] text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
            >
              <FileText className="size-3.5" />
              New document
            </button>
          </div>

          {selected ? (
            <DocumentEditor
              document={selected}
              onDeleted={() => setSearchParams({})}
            />
          ) : (
            <Card className="grid min-h-[560px] place-items-center">
              <div className="px-6 text-center">
                <FileText className="mx-auto size-5 text-fg-subtle" />
                <p className="mt-2 text-[13px] font-medium text-fg">Select a document</p>
                <p className="mt-1 text-[11.5px] text-fg-muted">
                  Or create a new one from the list.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
