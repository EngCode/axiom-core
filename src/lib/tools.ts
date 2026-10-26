/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Registry
 */

//=====> Types <=====//

import { Droplets, Palette, Scaling, SwatchBook, type LucideIcon } from 'lucide-react'

export type ToolId = 'resize' | 'convert' | 'tint' | 'palette'

export type ToolCategoryId = 'image' | 'color'

export interface ToolDefinition {
  id: ToolId
  name: string
  description: string
  category: ToolCategoryId
  keywords: string
  icon: LucideIcon
}

export const TOOL_CATEGORIES: { id: ToolCategoryId; label: string }[] = [
  { id: 'image', label: 'Image' },
  { id: 'color', label: 'Colour' },
]

//=====> Registry <=====//

export const TOOLS: ToolDefinition[] = [
  {
    id: 'resize',
    name: 'Resize',
    description: 'Change dimensions, lock the aspect ratio and use 25–100 % presets.',
    category: 'image',
    keywords: 'scale dimensions width height export',
    icon: Scaling,
  },
  {
    id: 'convert',
    name: 'Convert',
    description: 'Convert between PNG, JPEG and WebP with quality control.',
    category: 'image',
    keywords: 'png jpeg webp format quality export',
    icon: SwatchBook,
  },
  {
    id: 'tint',
    name: 'Tint',
    description: 'Wash an image with a colour at an adjustable strength.',
    category: 'color',
    keywords: 'colour overlay duotone wash',
    icon: Droplets,
  },
  {
    id: 'palette',
    name: 'Palette',
    description: 'Extract the dominant colours and copy their hex values.',
    category: 'color',
    keywords: 'colours swatches hex extract picker',
    icon: Palette,
  },
]

export function toolById(id: string | undefined): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.id === id)
}

export function categoryLabel(id: ToolCategoryId): string {
  return TOOL_CATEGORIES.find((category) => category.id === id)?.label ?? id
}
