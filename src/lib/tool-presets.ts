/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Preset Storage
 */

//=====> Types <=====//

import type { ToolId } from './tools'

export type PresetFormat = 'png' | 'jpeg' | 'webp'

/**
 * A preset only stores the values a tool understands. Missing keys leave the
 * workspace at its current value, so one preset can rotate between tools
 * without carrying irrelevant settings around.
 */
export interface ToolPresetValues {
  width?: number
  height?: number
  lockAspect?: boolean
  format?: PresetFormat
  quality?: number
  tint?: string
  intensity?: number
}

export interface ToolPreset {
  id: string
  name: string
  tool: ToolId
  createdAt: string
  values: ToolPresetValues
}

const STORAGE_KEY = 'axiom.tools.presets.v1'

//=====> Preset Storage <=====//

function readAll(): ToolPreset[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (entry): entry is ToolPreset =>
        Boolean(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.tool === 'string' &&
        typeof entry.values === 'object',
    )
  } catch {
    return []
  }
}

function writeAll(presets: ToolPreset[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    /* storage may be unavailable */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listPresets(tool: ToolId): ToolPreset[] {
  return readAll()
    .filter((preset) => preset.tool === tool)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export function savePreset(tool: ToolId, name: string, values: ToolPresetValues): ToolPreset[] {
  const trimmed = name.trim()
  if (!trimmed) return listPresets(tool)

  const next: ToolPreset = {
    id: newId(),
    name: trimmed,
    tool,
    createdAt: new Date().toISOString(),
    values,
  }
  writeAll([...readAll(), next])
  return listPresets(tool)
}

export function removePreset(tool: ToolId, id: string): ToolPreset[] {
  writeAll(readAll().filter((preset) => preset.id !== id))
  return listPresets(tool)
}
