/**======> Reference By Comment <======
 * ===> 01 - Imports & Pattern Builder
 * ===> 02 - Background Layer
 */

//=====> Imports & Pattern Builder <=====//

import { useLocation } from 'react-router-dom'

import { useApp } from '@/lib/store'
import type { BackgroundScope, BackgroundSettings } from '@/lib/types'

function backgroundImage(background: BackgroundSettings): string | null {
  //===> Guard Clause: Nothing To Render <===//
  if (background.kind === 'none') return null

  //===> Build Theme-Aware Patterns <===//
  switch (background.kind) {
    case 'grid':
      return [
        'linear-gradient(to right, color-mix(in oklab, var(--fg) 8%, transparent) 1px, transparent 1px)',
        'linear-gradient(to bottom, color-mix(in oklab, var(--fg) 8%, transparent) 1px, transparent 1px)',
      ].join(', ')
    case 'dots':
      return 'radial-gradient(color-mix(in oklab, var(--fg) 16%, transparent) 1px, transparent 1px)'
    case 'gradient':
      return 'radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, var(--accent) 60%, transparent), transparent 72%)'
    case 'image': {
      const url = background.imageUrl.trim()
      if (!url) return null
      return `url("${url.replace(/"/g, '\\"')}")`
    }
    default:
      return null
  }
}

function backgroundSize(background: BackgroundSettings): string | undefined {
  if (background.kind === 'grid') return '32px 32px'
  if (background.kind === 'dots') return '18px 18px'
  if (background.kind === 'image') return 'cover'
  return undefined
}

//=====> Background Layer <=====//

export function AppBackground({ scope }: { scope: BackgroundScope }) {
  //===> Read Appearance <===//
  const { state } = useApp()
  const location = useLocation()
  const background = state.appearance.pageBackgrounds[location.pathname] ?? state.appearance.background

  //===> Guard Clause: Scope, Kind & Opacity <===//
  if (background.scope !== scope || background.opacity <= 0) return null

  //===> Guard Clause: Resolvable Image <===//
  const image = backgroundImage(background)
  if (!image) return null

  //===> Render Decorative Layer <===//
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: image,
        backgroundSize: backgroundSize(background),
        backgroundPosition: 'center',
        opacity: background.opacity,
        mixBlendMode: background.kind === 'image' ? 'soft-light' : 'normal',
      }}
    />
  )
}
