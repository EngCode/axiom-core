/**======> Reference By Comment <======
 * ===> 01 - Types & Builder
 * ===> 02 - Library Tree
 */

//=====> Types & Builder <=====//

import { useMemo, useState } from 'react'
import { ChevronRight, Folder, HardDrive, Library } from 'lucide-react'

import type { MediaCopy, Volume } from '@/lib/library-types'
import { cn } from '@/lib/utils'

export interface LibraryFolderNode {
  id: string
  name: string
  path: string
  volumeId: string
  count: number
  children: LibraryFolderNode[]
}

function buildTree(volumes: Volume[], copies: MediaCopy[]): LibraryFolderNode[] {
  const roots = new Map<string, LibraryFolderNode>()

  for (const volume of volumes) {
    roots.set(volume.id, {
      id: `${volume.id}|`,
      name: volume.label ?? volume.mountPath,
      path: '',
      volumeId: volume.id,
      count: 0,
      children: [],
    })
  }

  for (const copy of copies) {
    const root = roots.get(copy.volumeId)
    if (!root) continue
    root.count += 1

    const parts = copy.relPath.replace(/\\/g, '/').split('/').filter(Boolean)
    parts.pop()
    let parent = root
    let path = ''

    for (const part of parts) {
      path = path ? `${path}/${part}` : part
      let child = parent.children.find((candidate) => candidate.path === path)
      if (!child) {
        child = {
          id: `${copy.volumeId}|${path}`,
          name: part,
          path,
          volumeId: copy.volumeId,
          count: 0,
          children: [],
        }
        parent.children.push(child)
      }
      child.count += 1
      parent = child
    }
  }

  const sort = (nodes: LibraryFolderNode[]) => {
    nodes.sort((left, right) => left.name.localeCompare(right.name))
    for (const node of nodes) sort(node.children)
  }
  const result = [...roots.values()]
  sort(result)
  return result
}

//=====> Library Tree <=====//

export function LibraryTree({
  volumes,
  copies,
  selectedKey,
  onSelect,
}: {
  volumes: Volume[]
  copies: MediaCopy[]
  selectedKey: string | null
  onSelect: (key: string | null) => void
}) {
  const tree = useMemo(() => buildTree(volumes, copies), [volumes, copies])
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(tree.map((volume) => volume.id)),
  )

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  //===> Render <===//
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
        <Library className="size-3.5 text-fg-subtle" />
        <span className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
          Storage
        </span>
      </div>

      <div className="max-h-[520px] overflow-y-auto p-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors',
            selectedKey === null ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60',
          )}
        >
          <Library className="size-3 shrink-0" />
          All media
          <span className="ms-auto text-[9.5px] text-fg-subtle tabular-nums">{copies.length}</span>
        </button>

        {tree.map((volume) => {
          const open = expanded.has(volume.id)
          return (
            <div key={volume.id}>
              <div
                className={cn(
                  'group flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors',
                  selectedKey === volume.id
                    ? 'bg-surface-2 text-fg'
                    : 'text-fg-muted hover:bg-surface-2/60',
                )}
              >
                {volume.children.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggle(volume.id)}
                    aria-label={open ? 'Collapse drive' : 'Expand drive'}
                    className="grid size-4 shrink-0 place-items-center text-fg-subtle"
                  >
                    <ChevronRight
                      className={cn('size-3 transition-transform', open && 'rotate-90')}
                    />
                  </button>
                ) : (
                  <span className="size-4 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(volume.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
                >
                  <HardDrive className="size-3 shrink-0" />
                  <span className="truncate">{volume.name}</span>
                </button>
                <span className="text-[9.5px] text-fg-subtle tabular-nums">{volume.count}</span>
              </div>

              {open
                ? volume.children.map((folder) => (
                    <TreeBranch
                      key={folder.id}
                      node={folder}
                      depth={1}
                      expanded={expanded}
                      selectedKey={selectedKey}
                      onSelect={onSelect}
                      onToggle={toggle}
                    />
                  ))
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TreeBranch({
  node,
  depth,
  expanded,
  selectedKey,
  onSelect,
  onToggle,
}: {
  node: LibraryFolderNode
  depth: number
  expanded: Set<string>
  selectedKey: string | null
  onSelect: (key: string | null) => void
  onToggle: (id: string) => void
}) {
  const open = expanded.has(node.id)
  const hasChildren = node.children.length > 0

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 rounded px-1.5 py-1 text-[10.5px] transition-colors',
          selectedKey === node.id
            ? 'bg-surface-2 text-fg'
            : 'text-fg-muted hover:bg-surface-2/60',
        )}
        style={{ paddingInlineStart: 6 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={open ? 'Collapse folder' : 'Expand folder'}
            className="grid size-4 shrink-0 place-items-center text-fg-subtle"
          >
            <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
          title={node.path}
        >
          <Folder className="size-3 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        <span className="text-[9px] text-fg-subtle tabular-nums">{node.count}</span>
      </div>

      {open
        ? node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedKey={selectedKey}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))
        : null}
    </>
  )
}
