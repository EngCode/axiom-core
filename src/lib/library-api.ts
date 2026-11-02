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
  CategoryInput,
  ImportSummary,
  LibraryCategoryCount,
  LibraryItemDetail,
  LibraryItemPatch,
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

/** Create a category, or update the one matching `input.id`. */
export async function saveCategory(input: CategoryInput): Promise<MediaCategory> {
  return invoke<MediaCategory>('library_save_category', { input })
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isTauri()) return
  await invoke('library_delete_category', { id })
}

/** Persist the category order shown in the manager, first id first. */
export async function reorderCategories(ids: string[]): Promise<void> {
  if (!isTauri()) return
  await invoke('library_reorder_categories', { ids })
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

/** Edit status, rating, notes, category or title on one Library item. */
export async function updateLibraryItem(id: string, patch: LibraryItemPatch): Promise<void> {
  if (!isTauri()) return
  await invoke('library_update_item', { id, patch })
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
