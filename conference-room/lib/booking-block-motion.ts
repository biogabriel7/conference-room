/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Booking block drag
 *
 * On move or resize, the block lifts to an overlay layer so it
 * can slide vertically instead of jumping with table rowSpan.
 *
 *   0ms   pointer down — block moves to overlay at current slot
 *  +Δms   each slot step — top / height eases with a soft spring
 *  up    pointer up — block settles into the table grid
 * ───────────────────────────────────────────────────────── */

export const BOOKING_BLOCK_MOTION = {
  durationMs: 160, // ms per slot transition
  ease: "cubic-bezier(0.22, 1, 0.36, 1)", // soft settle, no bounce
  cellPaddingPx: 2, // matches p-0.5
  blockInsetPx: 2, // matches inset-0.5
  overlayZIndex: 20,
} as const

export type SlotMetrics = {
  bodyTop: number
  rowHeight: number
  columns: Map<string, { left: number; width: number }>
}

export function getBookingBlockRect(
  metrics: SlotMetrics,
  slotDate: string,
  slotIndex: number,
  slotCount: number
) {
  const column = metrics.columns.get(slotDate)

  if (!column || slotIndex < 0) {
    return null
  }

  const { cellPaddingPx, blockInsetPx } = BOOKING_BLOCK_MOTION
  const inset = cellPaddingPx + blockInsetPx

  return {
    top: metrics.bodyTop + slotIndex * metrics.rowHeight + inset,
    left: column.left + inset,
    width: column.width - inset * 2,
    height: slotCount * metrics.rowHeight - inset * 2,
  }
}
