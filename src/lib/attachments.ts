/**======> Reference By Comment <======
 * ===> 01 - Attachment Bridge
 * ===> 02 - Preview Helpers
 */

import { convertFileSrc, invoke } from '@tauri-apps/api/core'

import { isTauri } from './tauri'

export interface PickedAttachment {
  name: string
  size: number
  path: string
}

export type AttachmentKind = 'image' | 'pdf' | 'other'

export async function pickAttachment(): Promise<PickedAttachment | null> {
  if (!isTauri()) return null
  return invoke<PickedAttachment | null>('pick_issue_attachment')
}

export async function openAttachment(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('open_issue_attachment', { path })
}

/** Ask the OS to show its "Open with" picker (falls back to the default app). */
export async function openAttachmentWith(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('open_issue_attachment_with', { path })
}

/** Reveal the file in Explorer, Finder or the desktop file manager. */
export async function revealAttachment(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('reveal_issue_attachment', { path })
}

export async function deleteAttachmentFile(path: string): Promise<void> {
  if (!isTauri()) return
  await invoke('delete_issue_attachment', { path })
}

//=====> Preview Helpers <=====//

/** Turns an absolute attachment path into a WebView-safe asset URL. */
export function attachmentSrc(path: string): string {
  if (!isTauri()) return path
  return convertFileSrc(path)
}

/** Classify an attachment by its file extension for the thumbnail renderer. */
export function attachmentKind(name: string): AttachmentKind {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg'].includes(extension)) {
    return 'image'
  }
  if (extension === 'pdf') return 'pdf'
  return 'other'
}
