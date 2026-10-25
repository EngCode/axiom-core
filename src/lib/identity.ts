/**======> Reference By Comment <======
 * ===> 01 - Defaults & Types
 * ===> 02 - Normalization
 * ===> 03 - Monogram
 */

import type { Identity } from './types'

/** Shipped defaults. Everything here can be changed at runtime in Settings → Personalization. */
export const DEFAULT_IDENTITY: Identity = {
  appName: 'Axiom Core',
  workspaceName: 'Personal',
  ownerName: 'Abdullah',
}

export function normalizeIdentity(value?: Partial<Identity> | null): Identity {
  return {
    appName: value?.appName?.trim() || DEFAULT_IDENTITY.appName,
    workspaceName: value?.workspaceName?.trim() || DEFAULT_IDENTITY.workspaceName,
    ownerName: value?.ownerName?.trim() || DEFAULT_IDENTITY.ownerName,
  }
}

/** First character(s) of the app name, used for the mark in the sidebar and tray. */
export function appMonogram(appName: string): string {
  const words = appName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'A'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
