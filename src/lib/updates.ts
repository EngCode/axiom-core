/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Version
 * ===> 03 - Check & Install
 */

//=====> Types <=====//

import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import { isTauri } from './tauri'

/** What the installed app can show about an available release. */
export interface AvailableUpdate {
  currentVersion: string
  version: string
  date?: string
  body?: string
}

export interface UpdateProgress {
  downloaded: number
  total: number
}

// The `check` result owns the download URL and signature, so it must survive
// between the check click and the install click.
let pending: Update | null = null

//=====> Version <=====//

export async function getAppVersion(): Promise<string | null> {
  if (!isTauri()) return null
  try {
    return await getVersion()
  } catch {
    return null
  }
}

//=====> Check & Install <=====//

/** Ask the release endpoint for a newer version. Returns null when up to date. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri()) return null
  pending = await check({ timeout: 20_000 })
  if (!pending) return null
  return {
    currentVersion: pending.currentVersion,
    version: pending.version,
    date: pending.date,
    body: pending.body,
  }
}

/**
 * Download the installer, verify its minisign signature and run it in place.
 * Axiom Core restarts itself afterwards; no uninstall step is involved.
 */
export async function installAvailableUpdate(
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  if (!pending) throw new Error('Check for updates before installing one.')

  let downloaded = 0
  let total = 0
  await pending.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        downloaded = 0
        total = event.data.contentLength ?? 0
        onProgress?.({ downloaded, total })
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        onProgress?.({ downloaded, total })
        break
      case 'Finished':
        total = total || downloaded
        onProgress?.({ downloaded: total, total })
        break
      default:
        break
    }
  })
  pending = null
}

/** Relaunch the desktop shell after the installer has replaced the binaries. */
export async function relaunchApp(): Promise<void> {
  if (!isTauri()) return
  await relaunch()
}
