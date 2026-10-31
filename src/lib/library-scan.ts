/**======> Reference By Comment <======
 * ===> 01 - Folder Picker
 */

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

/** Native folder picker used when registering a new scan root. */
export async function pickMediaFolder(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('pick_media_folder')
}
