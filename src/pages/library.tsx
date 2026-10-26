/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Library Page
 */

//=====> Imports & Helpers <=====//

import { useEffect, useMemo, useState } from 'react'
import { FolderSearch, ImagePlus, Library, RefreshCw, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LibraryTree } from '@/components/library-tree'
import { Button, Card, CardHeader, EmptyState, Input, PageHeader } from '@/components/ui'
import { coverSrc, pickMediaCover, removeMediaCover } from '@/lib/covers'
import { attachMediaCopy, loadLibrary, saveMediaItem, upsertVolume } from '@/lib/library-api'
import {
  pickMediaFolder,
  scanMediaFolder,
  type ScanCandidate,
  type ScanMediaType,
} from '@/lib/library-scan'
import type { LibrarySnapshot, MediaCopy, MediaItem, Volume } from '@/lib/library-types'
import { formatRelative } from '@/lib/utils'

function hash(value: string): string {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index)
    result |= 0
  }
  return (result >>> 0).toString(36)
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function mediaId(root: string, relPath: string): string {
  return `item-${hash(`${root}|${relPath}`)}`
}

//=====> Library Page <=====//

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
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  )
}
export default function LibraryPage() {
  //===> Library State <===//
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null)
  const [candidates, setCandidates] = useState<ScanCandidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scanning, setScanning] = useState(false)
  const [scanDepth, setScanDepth] = useState(3)
  const [scanType, setScanType] = useState<ScanMediaType>('all')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  //===> Load Library <===//
  async function refresh() {
    const next = await loadLibrary()
    setSnapshot(next)
  }

  useEffect(() => {
    void refresh()
  }, [])

  //===> Scan A Folder <===//
  async function scanFolder() {
    setError(null)
    setScanning(true)
    try {
      const folder = await pickMediaFolder()
      if (!folder) return
      const found = await scanMediaFolder(folder, scanDepth, scanType)
      setCandidates(found)
      setSelected(new Set(found.map((candidate) => candidate.path)))
      if (found.length === 0) setError('No supported media files were found in that folder.')
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError))
    } finally {
      setScanning(false)
    }
  }

  //===> Import Selected Candidates <===//
  async function importSelected() {
    if (!snapshot) return
    const chosen = candidates.filter((candidate) => selected.has(candidate.path))
    if (chosen.length === 0) return

    setImporting(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const volumes = new Map<string, Volume>()

      for (const candidate of chosen) {
        const volume =
          volumes.get(candidate.volumeRoot) ??
          snapshot.volumes.find((entry) => entry.mountPath === candidate.volumeRoot) ?? {
            id: `vol-${hash(candidate.volumeRoot)}`,
            label: candidate.volumeLabel,
            volumeGuid: null,
            serial: null,
            capacityBytes: null,
            mountPath: candidate.volumeRoot,
            type: candidate.volumeRoot.includes(':') ? 'external' : 'internal',
            lastSeenAt: now,
          } satisfies Volume

        if (!volumes.has(candidate.volumeRoot)) {
          volumes.set(candidate.volumeRoot, volume)
          if (!snapshot.volumes.some((entry) => entry.id === volume.id)) {
            await upsertVolume(volume)
          }
        }

        const kind = snapshot.kinds.find((entry) => entry.key === candidate.kind)
        if (!kind) continue

        const alreadyPresent = snapshot.copies.some(
          (copy) => copy.volumeId === volume.id && copy.relPath === candidate.relPath,
        )
        if (alreadyPresent) continue

        const itemId = mediaId(candidate.volumeRoot, candidate.relPath)
        const item: MediaItem = {
          id: itemId,
          kindId: kind.id,
          title: candidate.title,
          sortTitle: candidate.title.toLowerCase(),
          originalTitle: null,
          year: null,
          status: 'acquired',
          rating: null,
          notes: '',
          attributes: { relPath: candidate.relPath },
          coverPath: null,
          providerIds: {},
          createdAt: now,
          updatedAt: now,
        }
        await saveMediaItem(item)

        const copy: MediaCopy = {
          id: `copy-${hash(`${volume.id}|${candidate.relPath}`)}`,
          itemId,
          volumeId: volume.id,
          relPath: candidate.relPath,
          sizeBytes: candidate.sizeBytes,
          quality: null,
          source: 'scan',
          hash: null,
          firstSeenAt: now,
          lastSeenAt: now,
          missingAt: null,
        }
        await attachMediaCopy(copy)
      }

      await refresh()
      setCandidates([])
      setSelected(new Set())
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : String(importError))
    } finally {
      setImporting(false)
    }
  }

  //===> Derived Counts <===//
  const items = snapshot?.items ?? []
  const volumes = snapshot?.volumes ?? []
  const copies = snapshot?.copies ?? []
  const kindById = useMemo(
    () => new Map((snapshot?.kinds ?? []).map((kind) => [kind.id, kind])),
    [snapshot],
  )
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const [volumeId, folderPath] = selectedFolder?.split('|') ?? ['', '']

    return items.filter((item) => {
      const itemCopies = copies.filter((copy) => copy.itemId === item.id)

      //===> Folder Scope <===//
      if (selectedFolder) {
        const inScope = itemCopies.some((copy) => {
          if (copy.volumeId !== volumeId) return false
          if (!folderPath) return true
          return copy.relPath.replace(/\\/g, '/').startsWith(`${folderPath}/`)
        })
        if (!inScope) return false
      }

      //===> Search <===//
      if (!needle) return true
      return `${item.title} ${itemCopies.map((copy) => copy.relPath).join(' ')}`
        .toLowerCase()
        .includes(needle)
    })
  }, [copies, items, query, selectedFolder])
  const toggle = (path: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  //===> Change A Poster <===//
  async function assignCover(item: MediaItem) {
    setCoverBusy(item.id)
    try {
      const path = await pickMediaCover()
      if (!path) return
      await saveMediaItem({ ...item, coverPath: path, updatedAt: new Date().toISOString() })
      await refresh()
    } catch (coverError) {
      setError(coverError instanceof Error ? coverError.message : String(coverError))
    } finally {
      setCoverBusy(null)
    }
  }

  async function clearCover(item: MediaItem) {
    if (!item.coverPath) return
    setCoverBusy(item.id)
    try {
      await removeMediaCover(item.coverPath).catch(() => {})
      await saveMediaItem({ ...item, coverPath: null, updatedAt: new Date().toISOString() })
      await refresh()
    } finally {
      setCoverBusy(null)
    }
  }
  //===> Render Page <===//
  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        eyebrow="Personal"
        title="Library"
        description="Index the media you already own so you never download it twice."
        actions={
          <>
            <Button variant="secondary" onClick={() => void refresh()} aria-label="Refresh library">
              <RefreshCw className="size-3.5" />
            </Button>
            <Button variant="primary" onClick={() => void scanFolder()} disabled={scanning}>
              <FolderSearch className="size-3.5" />
              {scanning ? 'Scanning…' : 'Scan folder'}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-end gap-3 p-3">
        <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          Media type
          <select
            value={scanType}
            onChange={(event) => setScanType(event.target.value as ScanMediaType)}
            className="mt-1 block h-8 rounded-control border border-line bg-surface-2 px-2 text-[11.5px] text-fg outline-none"
          >
            <option value="all">Everything</option>
            <option value="movies">Movies</option>
            <option value="series">Series</option>
            <option value="anime">Anime</option>
            <option value="games">Games</option>
            <option value="books">Books</option>
            <option value="music">Music</option>
          </select>
        </label>
        <label className="text-[10px] font-medium tracking-[0.12em] text-fg-subtle uppercase">
          Depth
          <input
            type="number"
            min={1}
            max={8}
            value={scanDepth}
            onChange={(event) => setScanDepth(Number(event.target.value))}
            className="mt-1 block h-8 w-20 rounded-control border border-line bg-surface-2 px-2 text-[11.5px] text-fg outline-none"
          />
        </label>
        <p className="max-w-md pb-1 text-[10.5px] leading-4 text-fg-subtle">
          Depth 1 reads files in this folder only. For games, each folder at that depth is one game.
        </p>
      </Card>
      {error ? (
        <Card className="border-danger/30 bg-danger/5 px-4 py-2.5 text-[11.5px] text-danger">
          {error}
        </Card>
      ) : null}

      {candidates.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Review scan"
            hint={`${selected.size} of ${candidates.length} selected`}
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[10.5px] text-fg-subtle underline decoration-line underline-offset-2 hover:text-fg"
                  onClick={() =>
                    setSelected(
                      selected.size === candidates.length
                        ? new Set()
                        : new Set(candidates.map((candidate) => candidate.path)),
                    )
                  }
                >
                  {selected.size === candidates.length ? 'Select none' : 'Select all'}
                </button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={selected.size === 0 || importing}
                  onClick={() => void importSelected()}
                >
                  {importing ? 'Importing…' : `Import ${selected.size}`}
                </Button>
              </div>
            }
          />
          <div className="max-h-[340px] divide-y divide-line/60 overflow-y-auto border-t border-line">
            {candidates.map((candidate) => (
              <label
                key={candidate.path}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selected.has(candidate.path)}
                  onChange={() => toggle(candidate.path)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-fg">{candidate.title}</span>
                  <span className="block truncate text-[10px] text-fg-subtle">
                    {candidate.relPath}
                  </span>
                </span>
                <span className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-px text-[9.5px] text-fg-muted">
                  {candidate.kind}
                </span>
                <span className="hidden shrink-0 text-[10px] text-fg-subtle sm:block">
                  {formatBytes(candidate.sizeBytes)}
                </span>
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="relative">
        <Search className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles or paths…"
          aria-label="Search library"
          className="h-8 ps-8 text-[12px]"
        />
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Items', value: items.length },
          { label: 'Copies', value: copies.length },
          { label: 'Volumes', value: volumes.length },
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

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Library className="size-4" />}
            title="Nothing indexed yet"
            description="Scan a folder on one of your drives. Axiom reads file names and extensions, then stores volume-relative paths so the library survives a drive letter change."
            action={
              <Button variant="primary" size="sm" onClick={() => void scanFolder()} disabled={scanning}>
                <FolderSearch className="size-3.5" />
                Scan folder
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <LibraryTree
            volumes={volumes}
            copies={copies}
            selectedKey={selectedFolder}
            onSelect={setSelectedFolder}
          />

          <div>
            {visibleItems.length === 0 ? (
              <Card className="px-4 py-8 text-center text-[11.5px] text-fg-subtle">
                No media matches this folder or search.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => {
                  const kind = kindById.get(item.kindId)
                  const volumeId = selectedFolder?.split('|')[0]
                  const copy =
                    copies.find(
                      (entry) =>
                        entry.itemId === item.id && (!volumeId || entry.volumeId === volumeId),
                    ) ?? copies.find((entry) => entry.itemId === item.id)

                  return (
                    <Card key={item.id} className="group overflow-hidden p-0">
                      <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
                        <PosterArt path={item.coverPath} title={item.title} />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                        <span className="absolute top-2 start-2 rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] text-white/75 uppercase backdrop-blur-sm">
                          {kind?.name ?? item.kindId}
                        </span>

                        <div className="absolute top-2 end-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void assignCover(item)}
                            disabled={coverBusy === item.id}
                            aria-label={`Change poster for ${item.title}`}
                            title="Change poster"
                            className="grid size-7 place-items-center rounded-full border border-white/10 bg-black/55 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white disabled:opacity-40"
                          >
                            <ImagePlus className="size-3.5" />
                          </button>
                          {item.coverPath ? (
                            <button
                              type="button"
                              onClick={() => void clearCover(item)}
                              disabled={coverBusy === item.id}
                              aria-label={`Remove poster for ${item.title}`}
                              title="Remove poster"
                              className="grid size-7 place-items-center rounded-full border border-white/10 bg-black/55 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white disabled:opacity-40"
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p className="truncate text-[13px] font-medium text-white" title={item.title}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[9.5px] text-white/55">
                            {kind?.name ?? item.kindId} · {item.status}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-line/70 px-3 py-2">
                        <p
                          className="truncate font-mono text-[9px] text-fg-subtle"
                          title={copy?.relPath}
                        >
                          {copy?.relPath ?? 'No copy attached'}
                        </p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {volumes.length > 0 ? (
        <Card>
          <CardHeader title="Volumes" hint={`${volumes.length}`} />
          <div className="divide-y divide-line/60 border-t border-line">
            {volumes.map((volume) => (
              <div key={volume.id} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                <span className="font-medium text-fg">{volume.label}</span>
                <span className="truncate text-fg-subtle">{volume.mountPath}</span>
                <span className="ms-auto text-fg-subtle">
                  {volume.lastSeenAt ? formatRelative(volume.lastSeenAt) : 'never'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <p className="px-1 text-[10px] text-fg-subtle">
        Metadata fetching is not wired yet. Scan reads file names only;{' '}
        <Link
          to="/docs?doc=resources/LIBRARY"
          className="text-accent underline decoration-accent/30 underline-offset-2"
        >
          the library spec
        </Link>{' '}
        covers the next steps.
      </p>
    </div>
  )
}
