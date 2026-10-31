/**======> Reference By Comment <======
 * ===> 01 - Imports
 * ===> 02 - Categories & Roots
 * ===> 03 - Browse
 * ===> 04 - Detail & Covers
 * ===> 05 - Rebuild
 */

//=====> Imports <=====//

import { invoke } from '@tauri-apps/api/core'

import type {
  ImportSummary,
  LibraryCategoryCount,
  LibraryItemDetail,
  LibraryOverview,
  LibraryPage,
  LibraryQuery,
  MediaCategory,
  RebuildPreview,
  ScanRoot,
  ScanRootKind,
  ScanRunSummary,
} from './library-types'
import { isTauri } from './tauri'

//=====> Categories & Roots <=====//

export async function loadCategories(): Promise<MediaCategory[]> {
  if (!isTauri()) return []
  return invoke<MediaCategory[]>('library_categories')
}

export async function loadScanRoots(): Promise<ScanRoot[]> {
  if (!isTauri()) return []
  return invoke<ScanRoot[]>('library_roots')
}

export async function saveScanRoot(input: {
  path: string
  kind: ScanRootKind
  categoryId: string | null
  depth: number
}): Promise<ScanRoot> {
  return invoke<ScanRoot>('save_scan_root', {
    path: input.path,
    kind: input.kind,
    categoryId: input.categoryId,
    depth: input.depth,
  })
}

export async function deleteScanRoot(id: string): Promise<void> {
  if (!isTauri()) return
  await invoke('delete_scan_root', { id })
}

//=====> Browse <=====//

export async function loadLibraryOverview(): Promise<LibraryOverview | null> {
  if (!isTauri()) return null
  return invoke<LibraryOverview>('library_overview')
}

export async function queryLibrary(query: LibraryQuery): Promise<LibraryPage> {
  const empty: LibraryPage = {
    items: [],
    total: 0,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 60,
    pageCount: 0,
  }
  if (!isTauri()) return empty
  return invoke<LibraryPage>('library_query', { request: query })
}

export async function loadLibraryItem(id: string): Promise<LibraryItemDetail | null> {
  if (!isTauri()) return null
  return invoke<LibraryItemDetail | null>('library_item', { id })
}

export async function loadRecentRuns(): Promise<ScanRunSummary[]> {
  if (!isTauri()) return []
  return invoke<ScanRunSummary[]>('library_recent_runs')
}

//=====> Detail & Covers <=====//

/** Point one item at a new poster, or clear it with `null`. */
export async function setLibraryCover(id: string, path: string | null): Promise<void> {
  if (!isTauri()) return
  await invoke('library_set_cover', { id, path })
}

//=====> Rebuild <=====//

export async function previewLibraryRebuild(): Promise<RebuildPreview> {
  return invoke<RebuildPreview>('library_rebuild_preview')
}

/** Scans, backs up the database, wipes the library tables, then reimports. */
export async function rebuildLibrary(): Promise<ImportSummary> {
  return invoke<ImportSummary>('library_rebuild')
}

export type { LibraryCategoryCount }
