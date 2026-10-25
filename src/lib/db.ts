/**======> Reference By Comment <======
 * ===> 01 - Workspace Database Bridge
 */

import { invoke } from '@tauri-apps/api/core'

import type { AppState } from './types'
import { isTauri } from './tauri'

/** Durable state lives in SQLite when the app runs in Tauri. */
export async function loadStateFromDisk(): Promise<AppState | null> {
  if (!isTauri()) return null
  try {
    return await invoke<AppState | null>('load_state')
  } catch (error) {
    console.error('Axiom Core: could not load the database', error)
    return null
  }
}

export async function saveStateToDisk(state: AppState): Promise<void> {
  if (!isTauri()) return
  try {
    await invoke('save_state', { state })
  } catch (error) {
    console.error('Axiom Core: could not write to the database', error)
  }
}
