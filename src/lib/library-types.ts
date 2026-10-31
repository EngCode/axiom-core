/**======> Reference By Comment <======
 * ===> 01 - Categories & Roots
 * ===> 02 - Browse Models
 * ===> 03 - Detail Models
 * ===> 04 - Rebuild Models
 */

//=====> Categories & Roots <=====//

export type MediaStatus =
  | 'wishlist'
  | 'downloading'
  | 'acquired'
  | 'in_progress'
  | 'completed'
  | 'dropped'

/**
 * A user-managed category such as English, Arabic or Anime. Categories are rows,
 * not enums, so adding one never needs a schema migration.
 */
export interface MediaCategory {
  id: string
  key: string
  name: string
  sortOrder: number
  hidden: boolean
  /** Kind keys this category appears under, e.g. `['movies', 'series']`. */
  appliesTo: string[]
}

export type ScanRootKind = 'auto' | 'movies' | 'series' | 'games' | 'books' | 'music'

/** A folder the scanner owns. The kind and category seed how its files group. */
export interface ScanRoot {
  id: string
  path: string
  volumeId: string | null
  kind: ScanRootKind
  categoryId: string | null
  depth: number
  lastScanAt: string | null
  createdAt: string
}

//=====> Browse Models <=====//

/** One row in the Library grid. Only aggregates are loaded, never per-file copies. */
export interface LibraryCard {
  id: string
  kindId: string
  kindKey: string
  categoryId: string | null
  categoryKey: string | null
  categoryName: string | null
  title: string
  year: number | null
  status: MediaStatus
  coverPath: string | null
  folderPath: string | null
  primaryPath: string | null
  copyCount: number
  episodeCount: number
  seasonCount: number
  totalSizeBytes: number
  updatedAt: string
}

export type LibrarySort = 'title' | 'recent' | 'size' | 'episodes'

export interface LibraryQuery {
  kind?: string | null
  category?: string | null
  volume?: string | null
  status?: string | null
  search?: string | null
  sort?: LibrarySort | null
  page?: number | null
  pageSize?: number | null
}

export interface LibraryPage {
  items: LibraryCard[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface LibraryCount {
  key: string
  name: string
  count: number
}

export interface LibraryCategoryCount {
  id: string
  key: string
  name: string
  sortOrder: number
  hidden: boolean
  appliesTo: string[]
  count: number
  /** Count per kind key, e.g. `{ movies: 12, series: 4 }`. */
  byKind: Record<string, number>
}

export interface LibraryVolumeCount {
  id: string
  label: string
  mountPath: string | null
  itemCount: number
  copyCount: number
  totalSizeBytes: number
}

export interface LibraryOverview {
  totalItems: number
  totalCopies: number
  totalSizeBytes: number
  kinds: LibraryCount[]
  categories: LibraryCategoryCount[]
  volumes: LibraryVolumeCount[]
  roots: ScanRoot[]
}

//=====> Detail Models <=====//

export interface LibraryCopyView {
  id: string
  volumeId: string
  volumeLabel: string
  relPath: string
  sizeBytes: number | null
  quality: string | null
  season: string | null
  episode: number | null
  missingAt: string | null
}

export interface LibrarySeasonView {
  label: string
  number: number
  episodeCount: number
  totalSizeBytes: number
}

export interface LibraryItemDetail {
  item: LibraryCard
  notes: string
  rating: number | null
  originalTitle: string | null
  seasons: LibrarySeasonView[]
  copies: LibraryCopyView[]
}

//=====> Rebuild Models <=====//

export interface ScanSeasonPreview {
  number: number
  label: string
  episodeCount: number
  totalSizeBytes: number
}

export interface ScanRootPreview {
  id: string
  path: string
  kind: string
  category: string | null
  exists: boolean
  groupCount: number
  fileCount: number
  totalSizeBytes: number
}

export interface ScanGroupSummary {
  key: string
  kind: string
  category: string | null
  title: string
  year: number | null
  folderPath: string | null
  primaryPath: string
  totalSizeBytes: number
  copyCount: number
  episodeCount: number
  seasonCount: number
  seasons: ScanSeasonPreview[]
  confidence: number
  reason: string
}

/** Dry-run result: what a rebuild would import, without writing anything. */
export interface RebuildPreview {
  roots: ScanRootPreview[]
  groups: ScanGroupSummary[]
  totalGroups: number
  totalFiles: number
  totalSizeBytes: number
  episodeCount: number
  warnings: string[]
}

export interface ImportSummary {
  items: number
  copies: number
  removedItems: number
  removedCopies: number
  backupPath: string | null
  durationMs: number
}

export interface ScanRunSummary {
  id: string
  startedAt: string
  finishedAt: string | null
  kind: string
  status: string
  itemCount: number
  copyCount: number
  message: string
}
