/**======> Reference By Comment <======
 * ===> 01 - Native Window Bridge
 */

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

/** Keeps the native window title in sync with the editable app name. */
export async function setWindowTitle(title: string): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('set_window_title', { title })
  } catch {
    /* the title is cosmetic; never block on it */
  }
}
