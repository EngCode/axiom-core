/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Category Tree
 */

//=====> Types <=====//

import { useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  Film,
  Gamepad2,
  HardDrive,
  Library,
  ListMusic,
  Tv,
} from 'lucide-react'

import type { LibraryCount, LibraryOverview } from '@/lib/library-types'
import { cn } from '@/lib/utils'

/** What the grid is currently scoped to. Keys, never ids, so links stay stable. */
export interface LibrarySelection {
  kind: string | null
  category: string | null
}

export const ALL_MEDIA: LibrarySelection = { kind: null, category: null }

const KIND_ICONS: Record<string, typeof Film> = {
  movies: Film,
  series: Tv,
  games: Gamepad2,
  books: BookOpen,
  music: ListMusic,
}

//=====> Category Tree <=====//

export function LibraryCategories({
  overview,
  selection,
  onSelect,
}: {
  overview: LibraryOverview
  selection: LibrarySelection
  onSelect: (selection: LibrarySelection) => void
}) {
  // Movies and Series start open so the English/Arabic/Anime split is visible.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['movies', 'series']),
  )

  function toggle(kind: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const categories = overview.categories.filter((category) => !category.hidden)
  const kinds = overview.kinds.filter(
    (kind) => kind.key !== 'anime' && (kind.count > 0 || kind.key === 'movies' || kind.key === 'series'),
  )

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
        <Library className="size-3.5 text-fg-subtle" />
        <span className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
          Categories
        </span>
      </div>

      <div className="max-h-[560px] overflow-y-auto p-1.5">
        <button
          type="button"
          onClick={() => onSelect(ALL_MEDIA)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors',
            selection.kind === null
              ? 'bg-surface-2 text-fg'
              : 'text-fg-muted hover:bg-surface-2/60',
          )}
        >
          <Library className="size-3 shrink-0" />
          All media
          <span className="ms-auto text-[9.5px] text-fg-subtle tabular-nums">
            {overview.totalItems}
          </span>
        </button>

        {kinds.map((kind) => (
          <KindBranch
            key={kind.key}
            kind={kind}
            categories={categories}
            selection={selection}
            open={expanded.has(kind.key)}
            onToggle={() => toggle(kind.key)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function KindBranch({
  kind,
  categories,
  selection,
  open,
  onToggle,
  onSelect,
}: {
  kind: LibraryCount
  categories: LibraryOverview['categories']
  selection: LibrarySelection
  open: boolean
  onToggle: () => void
  onSelect: (selection: LibrarySelection) => void
}) {
  const Icon = KIND_ICONS[kind.key] ?? HardDrive
  const children = categories.filter((category) => category.appliesTo.includes(kind.key))
  const kindActive = selection.kind === kind.key && selection.category === null

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors',
          kindActive ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60',
        )}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? `Collapse ${kind.name}` : `Expand ${kind.name}`}
            className="grid size-4 shrink-0 place-items-center text-fg-subtle"
          >
            <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect({ kind: kind.key, category: null })}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{kind.name}</span>
        </button>
        <span className="text-[9.5px] text-fg-subtle tabular-nums">{kind.count}</span>
      </div>

      {open
        ? children.map((category) => {
            const active =
              selection.kind === kind.key && selection.category === category.key
            const count = category.byKind[kind.key] ?? 0
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => onSelect({ kind: kind.key, category: category.key })}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded py-1 pe-1.5 ps-8 text-[10.5px] transition-colors',
                  active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2/60',
                )}
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-accent' : 'bg-line-strong')} />
                <span className="truncate">{category.name}</span>
                <span className="ms-auto text-[9px] text-fg-subtle tabular-nums">{count}</span>
              </button>
            )
          })
        : null}
    </div>
  )
}
