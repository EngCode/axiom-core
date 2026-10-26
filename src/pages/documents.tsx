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

import { DocumentExplorer } from '@/components/document-explorer'
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
  onSelect,
  onCreateChild,
}: {
  document: DocumentRecord
  onDeleted: () => void
  onSelect: (id: string) => void
  onCreateChild: () => void
}) {
  //===> Read & Mutate <===//
  const { state, updateDocument, deleteDocument, toggleDocumentPin, linkTask } = useApp()
  const [preview, setPreview] = useState(false)

  //===> Derive Project <===//
  const project = state.projects.find((candidate) => candidate.id === document.projectId)
  const parent = state.documents.find((candidate) => candidate.id === document.parentId)
  const blocked = new Set<string>([document.id])
  let grew = true
  while (grew) {
    grew = false
    for (const candidate of state.documents) {
      if (candidate.parentId && blocked.has(candidate.parentId) && !blocked.has(candidate.id)) {
        blocked.add(candidate.id)
        grew = true
      }
    }
  }
  const parentOptions = state.documents.filter((candidate) => !blocked.has(candidate.id))
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
        {parent ? (
          <button
            type="button"
            onClick={() => onSelect(parent.id)}
            className="mb-2 inline-flex items-center gap-1 text-[10.5px] text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3 rtl:rotate-180" />
            {parent.title || 'Untitled page'}
          </button>
        ) : project ? (
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
          </select>
          <select
            value={document.folderId ?? ''}
            onChange={(event) =>
              updateDocument(document.id, { folderId: event.target.value || null })
            }
            aria-label="Document folder"
            className="h-7 max-w-[150px] rounded-control border border-line bg-surface-2 px-1.5 text-[10.5px] text-fg-muted outline-none"
          >
            <option value="">No folder</option>
            {state.folders
              .filter((folder) => folder.kind === 'documents')
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
          </select>
          <select
            value={document.parentId ?? ''}
            onChange={(event) =>
              updateDocument(document.id, { parentId: event.target.value || null })
            }
            aria-label="Parent page"
            className="h-7 max-w-[160px] rounded-control border border-line bg-surface-2 px-1.5 text-[10.5px] text-fg-muted outline-none"
          >
            <option value="">Top-level page</option>
            {parentOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title || 'Untitled page'}
              </option>
            ))}
          </select>
          <span>Edited {formatRelative(document.updatedAt)}</span>
          <div className="ms-auto flex items-center gap-0.5">
            <IconButton label="New subpage" onClick={onCreateChild}>
              <Plus className="size-3.5" />
            </IconButton>
            <IconButton
              label={document.pinned ? 'Unpin document' : 'Pin document'}
              onClick={() => toggleDocumentPin(document.id)}
            >
              {document.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </IconButton>
            <IconButton label="New subpage" onClick={onCreateChild}>
              <Plus className="size-3.5" />
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
  const { state, addDocument, addFolder, updateFolder, deleteFolder } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)

  const sorted = useMemo(() => sortNotes(state.documents), [state.documents])

  const folderScope = useMemo(() => {
    if (!folderId) return null
    const ids = new Set<string>()
    const visit = (id: string) => {
      if (ids.has(id)) return
      ids.add(id)
      for (const folder of state.folders) {
        if (folder.parentId === id) visit(folder.id)
      }
    }
    visit(folderId)
    return ids
  }, [folderId, state.folders])

  const folderCounts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const document of state.documents) {
      if (document.folderId) {
        result[document.folderId] = (result[document.folderId] ?? 0) + 1
      }
    }
    return result
  }, [state.documents])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sorted.filter((document) => {
      if (folderScope && !folderScope.has(document.folderId ?? '')) return false
      if (!needle) return true
      return `${document.title} ${document.content}`.toLowerCase().includes(needle)
    })
  }, [folderScope, query, sorted])

  const requested = searchParams.get('doc')
  const selected = filtered.find((document) => document.id === requested) ?? filtered[0]

  //===> Create & Select <===//
  function createDocument(parentId: string | null = null, projectId: string | null = null) {
    const parent = parentId ? state.documents.find((document) => document.id === parentId) : null
    const id = addDocument({
      title: 'Untitled document',
      projectId: projectId ?? parent?.projectId ?? null,
      folderId: parent?.folderId ?? folderId,
      parentId,
    })
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
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
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
          <DocumentExplorer
            documents={filtered}
            folders={state.folders}
            selectedId={selected?.id ?? null}
            folderId={folderId}
            counts={folderCounts}
            total={state.documents.length}
            query={query}
            onSelectFolder={setFolderId}
            onCreateFolder={(parentId, name) => {
              addFolder('documents', name, parentId)
            }}
            onRenameFolder={(folder, name) => updateFolder(folder.id, { name })}
            onDeleteFolder={(folder) => deleteFolder(folder.id)}
            onCreateDocument={() => createDocument()}
          />
        </div>

        {selected ? (
          <DocumentEditor
            document={selected}
            onDeleted={() => setSearchParams({})}
            onSelect={(id) => setSearchParams({ doc: id })}
            onCreateChild={() => createDocument(selected.id)}
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
    </div>
  )
}
