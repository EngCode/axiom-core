import { invoke } from '@tauri-apps/api/core'

import type { LibrarySnapshot, MediaCopy, MediaItem, Volume } from './library-types'
import { isTauri } from './tauri'

const EMPTY_LIBRARY: LibrarySnapshot = {
  kinds: [],
  items: [],
  copies: [],
  volumes: [],
  progress: [],
}

/**
 * The Library is separate from the workspace snapshot: it will be written by the
 * file scanner, not by the reducer that saves tasks and notes.
 */
export async function loadLibrary(): Promise<LibrarySnapshot> {
  if (!isTauri()) return EMPTY_LIBRARY
  return invoke<LibrarySnapshot>('load_library')
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  if (!isTauri()) return
  await invoke('save_media_item', { item })
}

export async function attachMediaCopy(copy: MediaCopy): Promise<void> {
  if (!isTauri()) return
  await invoke('attach_media_copy', { copy })
}

export async function upsertVolume(volume: Volume): Promise<void> {
  if (!isTauri()) return
  await invoke('upsert_volume', { volume })
}
