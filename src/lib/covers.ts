/**======> Reference By Comment <======
 * ===> 01 - Cover Bridge
 */

import { convertFileSrc, invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export async function pickMediaCover(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('pick_media_cover')
}

export async function removeMediaCover(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('remove_media_cover', { path })
}

/** Turns an absolute cover path into a WebView-safe asset URL. */
export function coverSrc(path: string): string {
  if (!isTauri()) return path
  return convertFileSrc(path)
}
