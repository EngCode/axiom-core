/**======> Reference By Comment <======
 * ===> 01 - Colour Parsing
 * ===> 02 - WCAG Contrast
 */

//=====> Colour Parsing <=====//

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Normalise `abc` or `#AABBCC` into `#aabbcc`; returns null when invalid. */
export function normalizeHex(value: string): string | null {
  const match = value.trim().match(HEX)
  if (!match) return null
  const raw = match[1].toLowerCase()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((part) => part + part)
          .join('')
      : raw
  return `#${full}`
}

function channels(hex: string): [number, number, number] {
  const value = normalizeHex(hex) ?? '#000000'
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ]
}

//=====> WCAG Contrast <=====//

function linear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = channels(hex).map(linear)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG 2.x contrast ratio, always between 1 and 21. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface ContrastRating {
  /** AA for normal text (4.5:1). */
  aa: boolean
  /** AAA for normal text (7:1). */
  aaa: boolean
  /** AA for large text and UI components (3:1). */
  aaLarge: boolean
  label: 'Fail' | 'AA Large' | 'AA' | 'AAA'
}

export function contrastRating(ratio: number): ContrastRating {
  const aaLarge = ratio >= 3
  const aa = ratio >= 4.5
  const aaa = ratio >= 7
  const label: ContrastRating['label'] = aaa ? 'AAA' : aa ? 'AA' : aaLarge ? 'AA Large' : 'Fail'
  return { aa, aaa, aaLarge, label }
}

/** Pick black or white text for a background, judged by contrast. */
export function readableOn(background: string): '#000000' | '#ffffff' {
  return contrastRatio('#ffffff', background) >= contrastRatio('#000000', background)
    ? '#ffffff'
    : '#000000'
}
