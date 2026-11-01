import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Measures the expanded layout, excluding the burger itself, to avoid oscillation. */
export function useToolbarSlotOverflow({ panel, actions, content, search }: {
  panel: RefObject<HTMLDivElement | null>; actions: RefObject<HTMLDivElement | null>
  content: HTMLElement | null; search: boolean
}) {
  const [overflow, setOverflow] = useState(false)
  const width = useRef(0)
  useLayoutEffect(() => {
    if (!panel.current || !actions.current || !content) return
    const measure = () => {
      if (content.isConnected && !content.closest('[role="dialog"]')) width.current = content.scrollWidth
      const gap = parseFloat(getComputedStyle(panel.current!).columnGap) || 0
      const required = (search ? 400 : 0) + width.current + actions.current!.offsetWidth + gap * 2
      setOverflow(width.current > 0 && required > panel.current!.clientWidth + 1)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(panel.current); observer.observe(actions.current); observer.observe(content)
    measure()
    return () => observer.disconnect()
  }, [panel, actions, content, search])
  return overflow
}

