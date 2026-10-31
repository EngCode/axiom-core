/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Poster & Tile
 * ===> 03 - Item Drawer
 * ===> 04 - Rebuild Dialog
 * ===> 05 - Roots Dialog
 * ===> 06 - Library Page
 */

//=====> Imports & Helpers <=====//

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  FolderSearch,
  HardDrive,
  ImagePlus,
  Library,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash,
  TriangleAlert,
  X,
} from 'lucide-react'

import { LibraryCategories, type LibrarySelection } from '@/components/library-tree'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
} from '@/components/ui'
import { coverSrc, pickMediaCover, removeMediaCover } from '@/lib/covers'
import {
  deleteScanRoot,
  loadLibraryItem,
  loadLibraryOverview,
  loadRecentRuns,
  previewLibraryRebuild,
  queryLibrary,
  rebuildLibrary,
  saveScanRoot,
  setLibraryCover,
} from '@/lib/library-api'
import { pickMediaFolder } from '@/lib/library-scan'
import type {
  ImportSummary,
  LibraryCard,
  LibraryCategoryCount,
  LibraryItemDetail,
  LibraryOverview,
  LibraryPage,
  LibrarySort,
  RebuildPreview,
  ScanRoot,
  ScanRootKind,
  ScanRunSummary,
} from '@/lib/library-types'
import { isTauri } from '@/lib/tauri'
import { cn, formatRelative } from '@/lib/utils'

const PAGE_SIZE = 60

const STATUS_OPTIONS = [
  { value: 'acquired', label: 'Acquired' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'dropped', label: 'Dropped' },
]

const KIND_OPTIONS: { value: ScanRootKind; label: string }[] = [
  { value: 'series', label: 'Series' },
  { value: 'movies', label: 'Movies' },
  { value: 'games', label: 'Games' },
  { value: 'books', label: 'Books' },
  { value: 'music', label: 'Music' },
  { value: 'auto', label: 'Auto-detect' },
]

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function itemCounts(card: LibraryCard): string {
  const bits: string[] = []
  if (card.seasonCount > 0) {
    bits.push(`${card.seasonCount} ${card.seasonCount === 1 ? 'season' : 'seasons'}`)
  }
  if (card.episodeCount > 0) {
    bits.push(`${card.episodeCount} ${card.episodeCount === 1 ? 'episode' : 'episodes'}`)
  }
  if (bits.length === 0 && card.copyCount > 1) {
    bits.push(`${card.copyCount} copies`)
  }
  return bits.join(' · ')
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value)
}

//=====> Poster & Tile <=====//

function PosterArt({ path, title }: { path: string | null; title: string }) {
  const [failed, setFailed] = useState(false)

  if (!path || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#2a1d24,#0e1013_70%)]">
        <span className="text-[34px] font-semibold tracking-[-0.06em] text-fg-subtle/30">
          {title.slice(0, 1).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <img
      src={coverSrc(path)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  )
}

const LibraryTile = memo(function LibraryTile({
  card,
  onOpen,
}: {
  card: LibraryCard
  onOpen: (id: string) => void
}) {
  const meta = itemCounts(card)

  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      className="group overflow-hidden rounded-card border border-line bg-surface text-start transition-colors hover:border-line-strong"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
        <PosterArt path={card.coverPath} title={card.title} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />

        <span className="absolute top-2 start-2 rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] text-white/75 uppercase backdrop-blur-sm">
          {card.categoryName ?? card.kindKey}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-[13px] font-medium text-white" title={card.title}>
            {card.title}
          </p>
          <p className="mt-0.5 truncate text-[9.5px] text-white/55">
            {[card.year, meta].filter(Boolean).join(' · ') || card.status}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line/70 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-[10px] text-fg-subtle">
          {meta || `${card.copyCount} ${card.copyCount === 1 ? 'file' : 'files'}`}
        </p>
        <p className="shrink-0 text-[9.5px] text-fg-subtle tabular-nums">
          {formatBytes(card.totalSizeBytes)}
        </p>
      </div>
    </button>
  )
})

//=====> Item Drawer <=====//

function ItemDrawer({
  itemId,
  onClose,
  onCoverChanged,
}: {
  itemId: string | null
  onClose: () => void
  onCoverChanged: () => void
}) {
  const [detail, setDetail] = useState<LibraryItemDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!itemId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    loadLibraryItem(itemId)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorMessage(loadError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemId])

  async function assignCover() {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      const path = await pickMediaCover()
      if (!path) return
      await setLibraryCover(detail.item.id, path)
      setDetail(await loadLibraryItem(detail.item.id))
      onCoverChanged()
    } catch (coverError) {
      setError(errorMessage(coverError))
    } finally {
      setBusy(false)
    }
  }

  async function clearCover() {
    if (!detail?.item.coverPath) return
    setBusy(true)
    setError(null)
    try {
      await removeMediaCover(detail.item.coverPath).catch(() => {})
      await setLibraryCover(detail.item.id, null)
      setDetail(await loadLibraryItem(detail.item.id))
      onCoverChanged()
    } catch (coverError) {
      setError(errorMessage(coverError))
    } finally {
      setBusy(false)
    }
  }

  const card = detail?.item

  return (
    <Modal open={itemId !== null} onClose={onClose} label="Library item" className="max-w-3xl">
      <div className="max-h-[82vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-fg-subtle">
            <LoaderCircle className="size-4 animate-spin" />
            Loading item…
          </div>
        ) : !card ? (
          <div className="px-6 py-16 text-center text-[12px] text-fg-subtle">
            {error ?? 'This item is no longer in the library.'}
          </div>
        ) : (
          <>
            <div className="flex gap-4 border-b border-line p-5 pe-12">
              <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-control border border-line bg-surface-2">
                <PosterArt path={card.coverPath} title={card.title} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                  {card.categoryName ?? card.kindKey}
                </p>
                <h2 className="mt-1 font-display text-[19px] leading-tight font-semibold tracking-[-0.02em] text-fg">
                  {card.title}
                </h2>
                <p className="mt-1 text-[11.5px] text-fg-muted">
                  {[card.year, card.status.replace('_', ' ')].filter(Boolean).join(' · ')}
                </p>
                {detail.originalTitle ? (
                  <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{detail.originalTitle}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void assignCover()} disabled={busy}>
                    <ImagePlus className="size-3.5" />
                    {card.coverPath ? 'Change poster' : 'Add poster'}
                  </Button>
                  {card.coverPath ? (
                    <Button size="sm" variant="ghost" onClick={() => void clearCover()} disabled={busy}>
                      <X className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <div className="border-b border-danger/25 bg-danger/5 px-5 py-2 text-[11.5px] text-danger">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-px border-b border-line bg-line/50 sm:grid-cols-4">
              {[
                { label: 'Seasons', value: card.seasonCount },
                { label: 'Episodes', value: card.episodeCount },
                { label: 'Files', value: card.copyCount },
                { label: 'Size', value: formatBytes(card.totalSizeBytes) },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface px-4 py-2.5">
                  <p className="text-[9.5px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-fg tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            {detail.seasons.length > 0 ? (
              <div className="border-b border-line px-5 py-3">
                <p className="mb-2 text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                  Seasons
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {detail.seasons.map((season) => (
                    <div
                      key={`${season.number}-${season.label}`}
                      className="flex items-center gap-2 rounded border border-line/60 bg-surface-2 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="font-medium text-fg">{season.label}</span>
                      <span className="ms-auto text-[10px] text-fg-subtle tabular-nums">
                        {season.episodeCount} eps · {formatBytes(season.totalSizeBytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="px-5 py-3">
              <p className="mb-2 text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                Files
              </p>
              <div className="max-h-56 space-y-1 overflow-y-auto pe-1">
                {detail.copies.map((copy) => (
                  <div key={copy.id} className="rounded border border-line/60 bg-surface-2 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-fg-subtle">
                      {copy.season ? <span>{copy.season}</span> : null}
                      {copy.episode !== null ? <span>Episode {copy.episode}</span> : null}
                      <span className="ms-auto shrink-0">{formatBytes(copy.sizeBytes ?? 0)}</span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[9.5px] text-fg-muted" title={copy.relPath}>
                      {copy.volumeLabel ? `${copy.volumeLabel} · ` : ''}
                      {copy.relPath}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {detail.notes ? (
              <div className="border-t border-line px-5 py-3">
                <p className="mb-1 text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
                  Notes
                </p>
                <p className="text-[12px] leading-5 text-fg-muted">{detail.notes}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  )
}

//=====> Rebuild Dialog <=====//

type RebuildStep = 'confirm' | 'preview' | 'running' | 'done'

function RebuildDialog({
  open,
  onClose,
  onFinished,
}: {
  open: boolean
  onClose: () => void
  onFinished: () => void
}) {
  const [step, setStep] = useState<RebuildStep>('confirm')
  const [preview, setPreview] = useState<RebuildPreview | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('confirm')
      setPreview(null)
      setSummary(null)
      setBusy(false)
      setError(null)
    }
  }, [open])

  async function runPreview() {
    setBusy(true)
    setError(null)
    try {
      setPreview(await previewLibraryRebuild())
      setStep('preview')
    } catch (previewError) {
      setError(errorMessage(previewError))
    } finally {
      setBusy(false)
    }
  }

  async function runRebuild() {
    setStep('running')
    setError(null)
    try {
      const result = await rebuildLibrary()
      setSummary(result)
      setStep('done')
      onFinished()
    } catch (rebuildError) {
      setError(errorMessage(rebuildError))
      setStep('preview')
    }
  }

  return (
    <Modal
      open={open}
      onClose={step === 'running' ? () => {} : onClose}
      label="Rebuild library"
      className="max-w-2xl"
    >
      <div className="max-h-[82vh] overflow-y-auto px-5 pt-5 pb-4 pe-12">
        <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-fg">
          {step === 'done' ? 'Library rebuilt' : 'Rebuild library'}
        </h2>

        {step === 'confirm' ? (
          <>
            <p className="mt-2 text-[12.5px] leading-6 text-fg-muted">
              A rebuild scans every registered root and replaces the library index. Your notes,
              ratings, statuses and posters are restored afterwards. The database is backed up
              automatically before anything is written.
            </p>
            <p className="mt-2 text-[11.5px] text-fg-subtle">
              Start with a dry run to see what would be imported. Nothing is written during a dry
              run.
            </p>
          </>
        ) : null}

        {step === 'preview' && preview ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Titles', value: preview.totalGroups },
                { label: 'Files', value: preview.totalFiles },
                { label: 'Episodes', value: preview.episodeCount },
                { label: 'Size', value: formatBytes(preview.totalSizeBytes) },
              ].map((stat) => (
                <div key={stat.label} className="rounded border border-line bg-surface-2 px-2.5 py-2">
                  <p className="text-[9px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-fg tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {preview.roots.map((root) => (
                <div
                  key={root.id}
                  className="flex items-center gap-2 rounded border border-line/60 bg-surface-2 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg-muted">
                    {root.path}
                  </span>
                  <span className={cn('shrink-0 text-[10px]', root.exists ? 'text-fg-subtle' : 'text-danger')}>
                    {root.exists ? `${root.groupCount} titles · ${root.fileCount} files` : 'offline'}
                  </span>
                </div>
              ))}
            </div>

            {preview.warnings.length > 0 ? (
              <div className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-[11px] text-danger">
                {preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                <p className="mt-1 text-fg-subtle">
                  Reconnect the drive or remove the root before rebuilding — otherwise its titles
                  would be dropped from the index.
                </p>
              </div>
            ) : null}

            <p className="text-[11px] text-fg-subtle">
              The database will be copied to a backup file before the index is replaced.
            </p>
          </div>
        ) : null}

        {step === 'running' ? (
          <div className="flex items-center gap-2.5 py-10 text-[12.5px] text-fg-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Scanning roots, backing up, then importing. This can take a minute.
          </div>
        ) : null}

        {step === 'done' && summary ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-[12px] text-fg">
              <CircleCheckBig className="size-4 text-emerald-400" />
              Imported {summary.items} titles from {summary.copies} files.
            </div>
            <p className="text-[11.5px] text-fg-muted">
              Removed {summary.removedItems} old titles ({summary.removedCopies} files) ·{' '}
              {(summary.durationMs / 1000).toFixed(1)}s
            </p>
            {summary.backupPath ? (
              <p className="break-all rounded border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[10px] text-fg-subtle">
                Backup: {summary.backupPath}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11.5px] text-danger">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          {step === 'confirm' ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => void runPreview()} disabled={busy}>
                {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                Dry run
              </Button>
            </>
          ) : null}
          {step === 'preview' ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void runRebuild()}
                disabled={(preview?.warnings.length ?? 0) > 0}
              >
                <RefreshCw className="size-3.5" />
                Rebuild now
              </Button>
            </>
          ) : null}
          {step === 'done' ? (
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

//=====> Roots Dialog <=====//

function RootsDialog({
  open,
  onClose,
  overview,
  runs,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  overview: LibraryOverview | null
  runs: ScanRunSummary[]
  onChanged: () => void
}) {
  const [path, setPath] = useState('')
  const [kind, setKind] = useState<ScanRootKind>('series')
  const [categoryId, setCategoryId] = useState('')
  const [depth, setDepth] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = (overview?.categories ?? []).filter((category) => !category.hidden)
  const applicable = categories.filter(
    (category) => kind !== 'auto' && category.appliesTo.includes(kind),
  )

  function categoryCount(category: LibraryCategoryCount): number {
    return category.byKind[kind] ?? 0
  }

  async function chooseFolder() {
    const folder = await pickMediaFolder()
    if (folder) setPath(folder)
  }

  async function addRoot() {
    if (!path.trim()) {
      setError('Choose a folder first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveScanRoot({
        path: path.trim(),
        kind,
        categoryId: categoryId || null,
        depth,
      })
      setPath('')
      setCategoryId('')
      onChanged()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  async function removeRoot(root: ScanRoot) {
    setBusy(true)
    setError(null)
    try {
      await deleteScanRoot(root.id)
      onChanged()
    } catch (removeError) {
      setError(errorMessage(removeError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Scan roots" className="max-w-2xl">
      <div className="max-h-[82vh] overflow-y-auto px-5 pt-5 pb-4 pe-12">
        <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-fg">
          Scan roots
        </h2>
        <p className="mt-1 text-[11.5px] leading-5 text-fg-muted">
          Each root tells the scanner what kind of media a folder holds and which category its files
          belong to. Folder names can still override the category.
        </p>

        <div className="mt-3 space-y-1">
          {(overview?.roots ?? []).length === 0 ? (
            <p className="rounded border border-line border-dashed px-3 py-4 text-center text-[11.5px] text-fg-subtle">
              No roots yet. Add the folders your media lives in.
            </p>
          ) : (
            overview?.roots.map((root) => {
              const category = categories.find((entry) => entry.id === root.categoryId)
              return (
                <div
                  key={root.id}
                  className="flex items-center gap-2 rounded border border-line/60 bg-surface-2 px-2.5 py-2"
                >
                  <HardDrive className="size-3.5 shrink-0 text-fg-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[10px] text-fg-muted" title={root.path}>
                      {root.path}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-fg-subtle">
                      {root.kind}
                      {category ? ` · ${category.name}` : ''} · depth {root.depth <= 0 ? 'full' : root.depth}
                      {root.lastScanAt ? ` · scanned ${formatRelative(root.lastScanAt)}` : ''}
                    </p>
                  </div>
                  <IconButton
                    label={`Remove ${root.path}`}
                    onClick={() => void removeRoot(root)}
                    disabled={busy}
                  >
                    <Trash className="size-3.5" />
                  </IconButton>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-4 rounded border border-line bg-surface-2 p-3">
          <p className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
            Add a root
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={path}
              readOnly
              placeholder="Choose a folder…"
              aria-label="Root folder"
              className="h-8 font-mono text-[10.5px]"
            />
            <Button variant="secondary" size="sm" onClick={() => void chooseFolder()}>
              <FolderSearch className="size-3.5" />
              Browse
            </Button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Field label="Kind">
              <Select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as ScanRootKind)
                  setCategoryId('')
                }}
                className="h-8 text-[11.5px]"
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default category">
              <Select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-8 text-[11.5px]"
                disabled={applicable.length === 0}
              >
                <option value="">Detect per folder</option>
                {applicable.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({categoryCount(category)})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Depth (0 = full)">
              <Input
                type="number"
                min={0}
                max={12}
                value={depth}
                onChange={(event) => setDepth(Number(event.target.value))}
                className="h-8 text-[11.5px]"
              />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] text-fg-subtle">
              Depth 0 scans the whole tree; a positive depth stops earlier.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void addRoot()}
              disabled={busy || !path.trim()}
            >
              <Plus className="size-3.5" />
              Add root
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11.5px] text-danger">
            {error}
          </div>
        ) : null}

        {runs.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
              Recent runs
            </p>
            <div className="space-y-1">
              {runs.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-2 rounded border border-line/60 px-2.5 py-1.5 text-[10px] text-fg-subtle"
                >
                  <span className={cn('size-1.5 rounded-full', run.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400')} />
                  <span>{run.finishedAt ? formatRelative(run.finishedAt) : run.startedAt}</span>
                  <span className="ms-auto tabular-nums">
                    {run.itemCount} titles · {run.copyCount} files
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

//=====> Library Page <=====//

export default function LibraryPage() {
  const [overview, setOverview] = useState<LibraryOverview | null>(null)
  const [runs, setRuns] = useState<ScanRunSummary[]>([])
  const [selection, setSelection] = useState<LibrarySelection>({ kind: null, category: null })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<LibrarySort>('title')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageData, setPageData] = useState<LibraryPage | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [rebuildOpen, setRebuildOpen] = useState(false)
  const [rootsOpen, setRootsOpen] = useState(false)
  const requestId = useRef(0)

  const refreshOverview = useCallback(async () => {
    try {
      const [next, recent] = await Promise.all([loadLibraryOverview(), loadRecentRuns()])
      setOverview(next)
      setRuns(recent)
      setOverviewError(null)
    } catch (loadError) {
      setOverviewError(errorMessage(loadError))
    }
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    void refreshOverview()
  }, [refreshOverview])

  // Debounce typing so a 4,500-title library is never queried per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!isTauri()) return
    const id = ++requestId.current
    setPageLoading(true)
    setPageError(null)
    queryLibrary({
      kind: selection.kind,
      category: selection.category,
      status: status || null,
      search: debouncedSearch || null,
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((next) => {
        if (id === requestId.current) setPageData(next)
      })
      .catch((loadError) => {
        if (id === requestId.current) setPageError(errorMessage(loadError))
      })
      .finally(() => {
        if (id === requestId.current) setPageLoading(false)
      })
  }, [selection, status, debouncedSearch, sort, page])

  function select(next: LibrarySelection) {
    setSelection(next)
    setPage(1)
  }

  function refreshGrid() {
    const id = ++requestId.current
    setPageLoading(true)
    queryLibrary({
      kind: selection.kind,
      category: selection.category,
      status: status || null,
      search: debouncedSearch || null,
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((next) => {
        if (id === requestId.current) setPageData(next)
      })
      .catch((loadError) => {
        if (id === requestId.current) setPageError(errorMessage(loadError))
      })
      .finally(() => {
        if (id === requestId.current) setPageLoading(false)
      })
  }

  const items = pageData?.items ?? []
  const totalItems = overview?.totalItems ?? 0
  const hasRoots = (overview?.roots.length ?? 0) > 0
  const emptyLibrary = totalItems === 0

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Library"
        description="Every film and series you own, grouped once per title with its seasons and episode counts."
        actions={
          <>
            <IconButton
              label="Refresh library"
              onClick={() => {
                void refreshOverview()
                refreshGrid()
              }}
            >
              <RefreshCw className="size-4" />
            </IconButton>
            <Button variant="secondary" onClick={() => setRootsOpen(true)}>
              <HardDrive className="size-3.5" />
              Roots
            </Button>
            <Button
              variant="primary"
              onClick={() => (hasRoots ? setRebuildOpen(true) : setRootsOpen(true))}
            >
              <RefreshCw className="size-3.5" />
              Rebuild
            </Button>
          </>
        }
      />

      {overviewError ? (
        <Card className="border-danger/30 bg-danger/5 px-4 py-2.5 text-[11.5px] text-danger">
          {overviewError}
        </Card>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Titles', value: overview?.totalItems ?? 0 },
          { label: 'Files', value: overview?.totalCopies ?? 0 },
          { label: 'Size', value: formatBytes(overview?.totalSizeBytes ?? 0) },
        ].map((stat) => (
          <Card key={stat.label} className="p-3.5">
            <p className="text-[10px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
              {stat.label}
            </p>
            <p className="mt-1 text-[20px] leading-none font-semibold text-fg tabular-nums">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {emptyLibrary ? (
        <Card>
          <EmptyState
            icon={<Library className="size-4" />}
            title="Nothing indexed yet"
            description={
              hasRoots
                ? 'Rebuild the library to scan your roots. A dry run shows what will be imported first.'
                : 'Add the folders your media lives in, then rebuild. Paths are stored relative to each drive.'
            }
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => (hasRoots ? setRebuildOpen(true) : setRootsOpen(true))}
              >
                {hasRoots ? 'Rebuild library' : 'Add a root'}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
          <div className="space-y-3">
            {overview ? (
              <LibraryCategories overview={overview} selection={selection} onSelect={select} />
            ) : (
              <Card className="h-24 animate-pulse" />
            )}
            {overview && overview.volumes.length > 0 ? (
              <Card>
                <CardHeader title="Volumes" hint={`${overview.volumes.length}`} />
                <div className="divide-y divide-line/60 border-t border-line">
                  {overview.volumes.map((volume) => (
                    <div key={volume.id} className="flex items-center gap-2 px-3 py-1.5 text-[10.5px]">
                      <HardDrive className="size-3 shrink-0 text-fg-subtle" />
                      <span className="font-medium text-fg">{volume.label}</span>
                      <span className="ms-auto text-fg-subtle tabular-nums">{volume.itemCount}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <div className="space-y-3">
            <Card className="flex flex-wrap items-center gap-2 p-2.5">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search titles or paths…"
                  aria-label="Search library"
                  className="h-8 ps-8 text-[12px]"
                />
              </div>
              <Select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as LibrarySort)
                  setPage(1)
                }}
                aria-label="Sort library"
                className="h-8 w-32 text-[11.5px]"
              >
                <option value="title">Title</option>
                <option value="recent">Recently updated</option>
                <option value="size">Largest</option>
                <option value="episodes">Most episodes</option>
              </Select>
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by status"
                className="h-8 w-32 text-[11.5px]"
              >
                <option value="">Any status</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Card>

            {pageError ? (
              <Card className="border-danger/30 bg-danger/5 px-4 py-2.5 text-[11.5px] text-danger">
                {pageError}
              </Card>
            ) : null}

            {pageLoading && !pageData ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-[2/3] animate-pulse rounded-card bg-surface-2" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card className="px-4 py-10 text-center text-[11.5px] text-fg-subtle">
                No titles match this category or search.
              </Card>
            ) : (
              <div
                className={cn(
                  'grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
                  pageLoading && 'opacity-60',
                )}
              >
                {items.map((card) => (
                  <LibraryTile key={card.id} card={card} onOpen={setSelectedItem} />
                ))}
              </div>
            )}

            {pageData && pageData.pageCount > 1 ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-[10.5px] text-fg-subtle tabular-nums">
                  {pageData.total.toLocaleString()} titles · page {pageData.page} of{' '}
                  {pageData.pageCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={pageData.page <= 1}
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={pageData.page >= pageData.pageCount}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ItemDrawer
        itemId={selectedItem}
        onClose={() => setSelectedItem(null)}
        onCoverChanged={() => {
          refreshGrid()
          void refreshOverview()
        }}
      />

      <RebuildDialog
        open={rebuildOpen}
        onClose={() => setRebuildOpen(false)}
        onFinished={() => {
          void refreshOverview()
          refreshGrid()
        }}
      />

      <RootsDialog
        open={rootsOpen}
        onClose={() => setRootsOpen(false)}
        overview={overview}
        runs={runs}
        onChanged={() => void refreshOverview()}
      />
    </div>
  )
}
