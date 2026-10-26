/**======> Reference By Comment <======
 * ===> 01 - Drag Overlay
 */

import type { SortPoint } from '@/lib/use-pointer-sort'

export function DragOverlay({ pointer, label }: { pointer: SortPoint | null; label: string }) {
  //===> Guard Clause: Only While Dragging <===//
  if (!pointer) return null

  //===> Render Floating Label <===//
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[80] max-w-[260px] truncate rounded-control border border-accent/40 bg-surface px-2 py-1 text-[11px] text-fg shadow-xl"
      style={{ left: pointer.x + 14, top: pointer.y + 14 }}
    >
      {label}
    </div>
  )
}
