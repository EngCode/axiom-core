/**======> Reference By Comment <======
 * ===> 01 - Imports & Helpers
 * ===> 02 - Library Page
 */

//=====> Imports & Helpers <=====//

import { useEffect, useMemo, useState } from 'react'
import { FolderSearch, Library, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
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
  const toggle = (path: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
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
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const kind = kindById.get(item.kindId)
            const copy = copies.find((entry) => entry.itemId === item.id)

            return (
              <Card key={item.id} className="p-3.5">
                <div className="flex items-start gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-2 text-fg-subtle">
                    <Library className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-fg">{item.title}</p>
                    <p className="mt-0.5 text-[10px] text-fg-subtle">
                      {kind?.name ?? item.kindId} · {item.status}
                    </p>
                  </div>
                </div>
                {copy ? (
                  <p className="mt-2 truncate font-mono text-[9.5px] text-fg-subtle" title={copy.relPath}>
                    {copy.relPath}
                  </p>
                ) : null}
              </Card>
            )
          })}
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
