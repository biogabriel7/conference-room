# Lessons

## Tailwind: border-color utilities are all-sides
`border-foreground/10`, `border-border/40` etc. set `border-color` for ALL sides,
not just the side implied by a sibling `border-t`/`border-l` width utility. If a
cell has both a row line (`border-t border-foreground/10`) and a column separator
(`border-l border-border/40`), the later color wins for every side — so the grid
lines rendered correctly only on the first column (which had no `border-l`).
Fix: use side-specific color utilities — `border-t-foreground/10`, `border-l-border/40`.

## Measurement hooks must re-run when the measured node mounts
`useSlotMetrics`' `useLayoutEffect([weekKey])` ran while the component still showed
its loading `<Spinner>` (table not in the DOM), so refs were null and `metrics`
stayed null forever — overlays/now-line only appeared after a window resize.
Fix: pass a `ready` flag (e.g. `bookings !== undefined`) into the effect deps so it
re-measures once the real table mounts.

## Buenos Aires time without Intl
Argentina is UTC-3 year-round (no DST). Shift UTC by -3h directly instead of relying
on Intl time-zone data — simpler and safe in the Convex runtime. Saturday 11pm ART
= Sunday 02:00 UTC (use that for `crons.weekly`).

## Touch drag selection needs pointermove, not pointerenter
Multi-slot timetable selection used `pointerenter` to extend the range. Touch devices
don't fire enter events while dragging, so only single-slot bookings worked on mobile.
Fix: `setPointerCapture` on pointerdown, track `pointermove` with
`elementFromPoint` + `data-slot-*` attributes, and `touch-action: none` on slot
targets so scroll doesn't cancel the gesture.
