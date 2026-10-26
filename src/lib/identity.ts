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

