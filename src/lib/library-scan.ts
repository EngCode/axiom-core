/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Commands
 */

//=====> Types <=====//

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export interface ScanCandidate {
  path: string
  relPath: string
  title: string
  kind: string
  sizeBytes: number
  volumeRoot: string
  volumeLabel: string
}

//=====> Commands <=====//

export async function pickMediaFolder(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('pick_media_folder')
}

export async function scanMediaFolder(path: string): Promise<ScanCandidate[]> {
  if (!isTauri()) return []
  return invoke<ScanCandidate[]>('scan_media_folder', { path })
}
