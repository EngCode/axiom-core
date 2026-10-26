/**======> Reference By Comment <======
 * ===> 01 - Attachment Bridge
 */

import { invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export interface PickedAttachment {
  name: string
  size: number
  path: string
}

export async function pickAttachment(): Promise<PickedAttachment | null> {
  if (!isTauri()) return null
  return invoke<PickedAttachment | null>('pick_issue_attachment')
}

export async function openAttachment(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('open_issue_attachment', { path })
}

export async function deleteAttachmentFile(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('delete_issue_attachment', { path })
}
