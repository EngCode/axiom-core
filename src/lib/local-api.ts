/**======> Reference By Comment <======
 * ===> 01 - Local API Bridge
 */

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export interface LocalApiStatus {
  enabled: boolean
  port: number
  token: string
  running: boolean
  error: string | null
  restartRequired: boolean
}

export async function getLocalApiStatus(): Promise<LocalApiStatus | null> {
  if (!isTauri()) return null
  return invoke<LocalApiStatus>('local_api_status')
}

export async function saveLocalApiConfig(config: {
  enabled: boolean
  port: number
  token: string
}): Promise<LocalApiStatus> {
  if (!isTauri()) throw new Error('The local API is only available in the desktop app.')
  return invoke<LocalApiStatus>('save_local_api_config', { config })
}
