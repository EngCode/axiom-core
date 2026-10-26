/**======> Reference By Comment <======
 * ===> 01 - Backup Bridge
 */

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export async function exportWorkspaceBackup(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('export_workspace_backup')
}

export async function importWorkspaceBackup(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('import_workspace_backup')
}

export async function restartApp(): Promise<void> {
  if (!isTauri()) return
  await invoke('restart_app')
}
