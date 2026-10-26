/**======> Reference By Comment <======
 * ===> 01 - Theme Registry
 * ===> 02 - Resolution & Cycling
 */

//=====> Theme Registry <=====//

export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  mode: 'dark' | 'light'
  /** [canvas, accent, foreground] used for previews in the picker. */
  swatch: [string, string, string]
}

export type ThemeId = 'classic' | 'paper' | 'terminal'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Crimson on near-black. The original interface.',
    mode: 'dark',
    swatch: ['#07080a', '#f5253f', '#edeef3'],
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Warm paper, serif headings, rust accent.',
    mode: 'light',
    swatch: ['#f4eee3', '#a5482c', '#211d18'],
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Phosphor green, monospace, square edges.',
    mode: 'dark',
    swatch: ['#050806', '#4ff08a', '#d8f7de'],
  },
]

export const DEFAULT_THEME: ThemeId = 'classic'

//=====> Resolution & Cycling <=====//

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value)
}

/** Accepts legacy ids from earlier builds (dark, light, orbit, axiom, graphite). */
export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'dark' || value === 'orbit' || value === 'axiom' || value === 'graphite') {
    return 'classic'
  }
  if (value === 'light') return 'paper'
  return isThemeId(value) ? value : DEFAULT_THEME
}

/** `?theme=terminal` previews a theme without touching the picker. */
export function previewThemeFromUrl(): ThemeId | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('theme')
  return isThemeId(value) ? value : null
}

export function themeMeta(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function nextTheme(id: ThemeId): ThemeDefinition {
  const index = THEMES.findIndex((theme) => theme.id === id)
  return THEMES[(index + 1) % THEMES.length]
}
