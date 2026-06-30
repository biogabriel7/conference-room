"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"

import {
  BOOKING_BLOCK_MOTION,
  type SlotMetrics,
} from "@/lib/booking-block-motion"

export function useSlotMetrics(weekKey: string, ready: boolean) {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const columnRefs = useRef(new Map<string, HTMLTableCellElement>())
  const [metrics, setMetrics] = useState<SlotMetrics | null>(null)

  const registerDayColumn = useCallback(
    (slotDate: string, node: HTMLTableCellElement | null) => {
      if (node) {
        columnRefs.current.set(slotDate, node)
        return
      }

      columnRefs.current.delete(slotDate)
    },
    []
  )

  useLayoutEffect(() => {
    function measure() {
      const container = tableContainerRef.current
      const tbody = tbodyRef.current

      if (!container || !tbody) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const tbodyRect = tbody.getBoundingClientRect()
      const firstRow = tbody.querySelector("tr")

      if (!firstRow) {
        return
      }

      const rowHeight = firstRow.getBoundingClientRect().height
      const columns = new Map<string, { left: number; width: number }>()

      for (const [slotDate, cell] of columnRefs.current) {
        const rect = cell.getBoundingClientRect()
        columns.set(slotDate, {
          left: rect.left - containerRect.left,
          width: rect.width,
        })
      }

      setMetrics({
        bodyTop: tbodyRect.top - containerRect.top,
        rowHeight,
        columns,
      })
    }

    measure()

    const container = tableContainerRef.current
    const tbody = tbodyRef.current
    const observer = container ? new ResizeObserver(measure) : null

    if (container && observer) {
      observer.observe(container)
    }

    if (tbody && observer) {
      observer.observe(tbody)
    }

    window.addEventListener("resize", measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
    // `ready` re-runs measurement once the table mounts (it isn't in the DOM
    // while the loading spinner is shown), so refs resolve to real nodes.
  }, [weekKey, ready])

  return {
    tableContainerRef,
    tbodyRef,
    registerDayColumn,
    metrics,
    motion: BOOKING_BLOCK_MOTION,
  }
}
