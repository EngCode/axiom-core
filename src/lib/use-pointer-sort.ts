/**======> Reference By Comment <======
 * ===> 01 - Types
 * ===> 02 - Pointer Sort Hook
 */

//=====> Types <=====//

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface SortPoint {
  x: number
  y: number
}

export interface PointerSortHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onClick: (event: React.MouseEvent<HTMLElement>) => void
}

//=====> Pointer Sort Hook <=====//

/**
 * Pointer-driven sorting. HTML5 drag is intercepted by WebView2 on Windows even with the window
 * setting disabled, so this uses pointerdown/move/up plus elementFromPoint instead.
 */
export function usePointerSort({
  onReorder,
  itemSelector,
  threshold = 4,
}: {
  onReorder: (id: string, targetId: string) => void
  itemSelector: string
  threshold?: number
}) {
  //===> Session & Visual State <===//
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [pointer, setPointer] = useState<SortPoint | null>(null)
  const active = useRef(false)
  const latestPoint = useRef<SortPoint | null>(null)
  const frame = useRef<number | null>(null)

  //===> Reset On Unmount <===//
  useEffect(
    () => () => {
      document.body.classList.remove('pointer-sorting')
    },
    [],
  )

  //===> Resolve Item Under Pointer <===//
  const itemUnder = useCallback(
    (point: SortPoint): string | null => {
      const element = document
        .elementFromPoint(point.x, point.y)
        ?.closest<HTMLElement>(itemSelector)
      return element?.dataset.sortId ?? null
    },
    [itemSelector],
  )

  //===> Handle Binder <===//
  const handleProps = useCallback(
    (id: string): PointerSortHandleProps => ({
      onPointerDown: (event) => {
        //===> Guard Clause: Primary Mouse Button Only <===//
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()
        if (active.current) return
        active.current = true

        const start = { x: event.clientX, y: event.clientY }
        let started = false
        setDraggingId(id)
        setOverId(null)
        setPointer(start)
        latestPoint.current = start
        document.body.classList.add('pointer-sorting')

        //===> Auto-Scroll While Near The Viewport Edge <===//
        function scrollStep() {
          if (!active.current) return
          const scroller = document.getElementById('main-scroll')
          const point = latestPoint.current
          if (scroller && point) {
            const rect = scroller.getBoundingClientRect()
            const edge = 64
            if (point.y < rect.top + edge) scroller.scrollTop -= 14
            else if (point.y > rect.bottom - edge) scroller.scrollTop += 14
          }
          frame.current = requestAnimationFrame(scrollStep)
        }
        frame.current = requestAnimationFrame(scrollStep)

        //===> Track Movement <===//
        function move(native: PointerEvent) {
          if (!active.current) return
          if (!started && Math.hypot(native.clientX - start.x, native.clientY - start.y) < threshold) {
            return
          }

          started = true
          const point = { x: native.clientX, y: native.clientY }
          latestPoint.current = point
          setPointer(point)
          const targetId = itemUnder(point)
          setOverId(targetId && targetId !== id ? targetId : null)
        }

        //===> Finish Or Cancel <===//
        function finish(native: PointerEvent) {
          cleanup()
          if (started) {
            const targetId = itemUnder({ x: native.clientX, y: native.clientY })
            if (targetId && targetId !== id) onReorder(id, targetId)
          }
          setDraggingId(null)
          setOverId(null)
          setPointer(null)
        }

        function cancel() {
          cleanup()
          setDraggingId(null)
          setOverId(null)
          setPointer(null)
        }

        function cleanup() {
          active.current = false
          if (frame.current !== null) cancelAnimationFrame(frame.current)
          frame.current = null
          latestPoint.current = null
          document.body.classList.remove('pointer-sorting')
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', finish)
          window.removeEventListener('pointercancel', cancel)
        }

        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', finish)
        window.addEventListener('pointercancel', cancel)
      },
      onClick: (event) => {
        //===> Never Open The Row/Card From The Drag Handle <===//
        event.preventDefault()
        event.stopPropagation()
      },
    }),
    [itemUnder, onReorder, threshold],
  )

  return { draggingId, overId, pointer, handleProps }
}
