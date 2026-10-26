/**======> Reference By Comment <======
 * ===> 01 - Defaults
 * ===> 02 - Normalization
 */

//=====> Defaults <=====//

import type { Appearance, BackgroundKind, BackgroundScope, BackgroundSettings } from './types'

export const BACKGROUND_KINDS: { id: BackgroundKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
  { id: 'gradient', label: 'Glow' },
  { id: 'image', label: 'Image' },
]

export const BACKGROUND_SCOPES: { id: BackgroundScope; label: string }[] = [
  { id: 'window', label: 'Whole window' },
  { id: 'content', label: 'Page content' },
]

export const DEFAULT_APPEARANCE: Appearance = {
  background: {
    kind: 'none',
    imageUrl: '',
    opacity: 0.18,
    scope: 'window',
  },
  pageBackgrounds: {},
}

//=====> Normalization <=====//

function isKind(value: unknown): value is BackgroundKind {
  return BACKGROUND_KINDS.some((entry) => entry.id === value)
}

function isScope(value: unknown): value is BackgroundScope {
  return BACKGROUND_SCOPES.some((entry) => entry.id === value)
}

export function normalizeBackground(value?: Partial<BackgroundSettings> | null): BackgroundSettings {
  const fallback = DEFAULT_APPEARANCE.background
  const opacity = typeof value?.opacity === 'number' ? value.opacity : fallback.opacity

  return {
    kind: isKind(value?.kind) ? value.kind : fallback.kind,
    imageUrl: typeof value?.imageUrl === 'string' ? value.imageUrl.trim() : fallback.imageUrl,
    opacity: Math.max(0, Math.min(0.4, opacity)),
    scope: isScope(value?.scope) ? value.scope : fallback.scope,
  }
}

export function normalizeAppearance(value?: Partial<Appearance> | null): Appearance {
  const entries = Object.entries(value?.pageBackgrounds ?? {})
  const pageBackgrounds = Object.fromEntries(
    entries
      .filter((entry): entry is [string, BackgroundSettings] => typeof entry[1] === 'object')
      .slice(0, 64)
      .map(([path, background]) => [path, normalizeBackground(background)]),
  )

  return { background: normalizeBackground(value?.background), pageBackgrounds }
}
/** `?bg=grid&bgopacity=0.22&bgscope=content` previews a background without saving it. */
export function previewBackgroundFromUrl(): Partial<BackgroundSettings> | null {
  if (typeof window === 'undefined') return null

  //===> Read Preview Parameters <===//
  const params = new URLSearchParams(window.location.search)
  const kind = params.get('bg')
  if (!isKind(kind)) return null

  //===> Build Patch <===//
  const patch: Partial<BackgroundSettings> = { kind }

  const scope = params.get('bgscope')
  if (isScope(scope)) patch.scope = scope

  const opacity = Number(params.get('bgopacity'))
  if (Number.isFinite(opacity)) patch.opacity = Math.max(0, Math.min(0.4, opacity))

  const image = params.get('bgimage')
  if (image) patch.imageUrl = image

  return patch
}