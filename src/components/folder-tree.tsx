/**======> Reference By Comment <======
 * ===> 01 - Imports & Contract
 * ===> 02 - Folder Tree
 */

//=====> Imports & Contract <=====//

import { Folder, FolderPlus, Pencil, Trash2 } from 'lucide-react'

import type { FolderKind, FolderRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

export function FolderTree({
  folders,
  kind,
  selectedId,
  onSelect,
  counts,
  total,
  onCreate,
  onRename,
  onDelete,
}: {
  folders: FolderRecord[]
  kind: FolderKind
  selectedId: string | null
  onSelect: (id: string | null) => void
  counts: Record<string, number>
  total: number
  onCreate: (parentId: string | null, name: string) => void
  onRename: (folder: FolderRecord, name: string) => void
  onDelete: (folder: FolderRecord) => void
}) {
  //===> Scope & Roots <===//
  const scoped = folders.filter((folder) => folder.kind === kind)
  const roots = scoped.filter((folder) => !folder.parentId)

  function create(parentId: string | null) {
    const name = window.prompt(
      `New ${kind === 'notes' ? 'notes' : 'document'} ${parentId ? 'subfolder' : 'folder'} name`,
    )
    if (!name?.trim()) return
    onCreate(parentId, name.trim())
  }

  //===> Render <===//
  return (
    <div className="border-b border-line px-1.5 py-2">
      <div className="flex items-center gap-1.5 px-1 pb-1">
        <span className="text-[9.5px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
          Folders
        </span>
        <button
          type="button"
          onClick={() => create(null)}
          aria-label="New folder"
          className="ms-auto grid size-5 place-items-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <FolderPlus className="size-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors',
          selectedId === null ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60',
        )}
      >
        <Folder className="size-3 shrink-0" />
        All {kind === 'notes' ? 'notes' : 'documents'}
        <span className="ms-auto text-[9.5px] text-fg-subtle tabular-nums">
          {total}
        </span>
      </button>

      {roots.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={scoped}
          selectedId={selectedId}
          onSelect={onSelect}
          counts={counts}
          onCreate={create}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function FolderNode({
  folder,
  folders,
  selectedId,
  onSelect,
  counts,
  onCreate,
  onRename,
  onDelete,
}: {
  folder: FolderRecord
  folders: FolderRecord[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  counts: Record<string, number>
  onCreate: (parentId: string | null, name: string) => void
  onRename: (folder: FolderRecord, name: string) => void
  onDelete: (folder: FolderRecord) => void
}) {
  const children = folders.filter((candidate) => candidate.parentId === folder.id)

  function rename() {
    const name = window.prompt('Rename folder', folder.name)
    if (name?.trim() && name.trim() !== folder.name) onRename(folder, name.trim())
  }

  function remove() {
    if (
      !window.confirm(
        `Delete “${folder.name}”? Items inside move to its parent folder; they are not deleted.`,
      )
    ) {
      return
    }
    onDelete(folder)
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors',
          selectedId === folder.id
            ? 'bg-surface-2 text-fg'
            : 'text-fg-muted hover:bg-surface-2/60',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
        >
          <Folder className="size-3 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
        <span className="text-[9.5px] text-fg-subtle tabular-nums">{counts[folder.id] ?? 0}</span>
        <button
          type="button"
          aria-label={`New subfolder in ${folder.name}`}
          onClick={() => onCreate(folder.id, '')}
          className="hidden text-fg-subtle hover:text-fg group-hover:block"
        >
          <FolderPlus className="size-3" />
        </button>
        <button
          type="button"
          aria-label={`Rename ${folder.name}`}
          onClick={rename}
          className="hidden text-fg-subtle hover:text-fg group-hover:block"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${folder.name}`}
          onClick={remove}
          className="hidden text-fg-subtle hover:text-danger group-hover:block"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {children.map((child) => (
        <div key={child.id} style={{ paddingInlineStart: 12 }}>
          <FolderNode
            folder={child}
            folders={folders}
            selectedId={selectedId}
            onSelect={onSelect}
            counts={counts}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ))}
    </>
  )
}
