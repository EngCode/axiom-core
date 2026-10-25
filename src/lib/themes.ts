export interface ThemeDefinition {
  id: ThemeId
  name: string
  description: string
  mode: 'dark' | 'light'
  /** [canvas, accent, foreground] used for previews in the picker. */
  swatch: [string, string, string]
}

export type ThemeId = 'orbit' | 'paper' | 'graphite'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    description: 'Violet on near-black. The default.',
    mode: 'dark',
    swatch: ['#07080a', '#8b86ff', '#edeef3'],
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Warm paper, serif headings, rust accent.',
    mode: 'light',
    swatch: ['#f4eee3', '#a5482c', '#211d18'],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral dark, cyan accent, tighter radii.',
    mode: 'dark',
    swatch: ['#0a0b0c', '#5fd4d0', '#e6e8ea'],
  },
]

export const DEFAULT_THEME: ThemeId = 'orbit'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value)
}

/** Accepts legacy `dark` / `light` values from earlier builds. */
export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'dark') return 'orbit'
  if (value === 'light') return 'paper'
  return isThemeId(value) ? value : DEFAULT_THEME
}

export function themeMeta(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function nextTheme(id: ThemeId): ThemeDefinition {
  const index = THEMES.findIndex((theme) => theme.id === id)
  return THEMES[(index + 1) % THEMES.length]
}
