# Demo: report co-editing + restore

Goal: reframe the direct-multiplayer text page as a student report (Lola) co-edited
by teachers, and add version restore. Story for the team: Convex makes "moderation"
just live co-editing + attribution + reversible history — no approval pipeline needed.

## Plan

- [x] **Reseed content** — replaced `DEFAULT_CONTENT` in `convex/text.ts` with the
      cleaned-up Lola report (Volantis Q&A format, Spanish).
- [x] **Schema** — added optional `snapshot: array(textSegment)` to `textEdits` in
      `convex/schema.ts`. Each activity entry is now an immutable version snapshot.
- [x] **Capture snapshots** — `recordEditBurst` stores current document `segments`
      as `snapshot` (both insert and coalesce paths). Preserves attribution.
- [x] **Restore mutation** — `restoreToEdit(slug, editId, identity)` repoints
      `document.segments` to that edit's snapshot, then logs a new "restored to X's
      version" entry (itself a snapshot, so restore is fully reversible).
- [x] **Client** — added a "Restore" button to each Recent-edits entry (hidden on the
      newest = current state and on legacy entries without a snapshot); wired
      `api.text.restoreToEdit`.
- [x] **Verify** — `tsc --noEmit` clean; eslint shows no new errors from these changes
      (the 3 remaining `set-state-in-effect` errors are pre-existing, untouched code).

## Design notes

- Snapshot = full `segments` array (not plain text) so who-wrote-what survives restore.
- The activity feed doubles as version history. No new table, no new query.
- Restore is non-destructive: older/newer edit rows keep their own snapshots, so you
  can jump to any version. This is the elegant Convex moment to show the team.

## Review

- The activity feed is now version history: each burst snapshots the full `segments`
  array, so restoring preserves who-wrote-what (colors survive the round-trip).
- Restore is one mutation + reactive query — no approval pipeline, no polling. This is
  the line to deliver to the team: "moderation" = live co-edit + attribution + revert.
- Restore is non-destructive: older and newer entries keep their own snapshots, so you
  can jump to any version and back.
- Not addressed (out of scope): the 3 pre-existing `react-hooks/set-state-in-effect`
  lint errors in the page's data-init effects. Worth a separate cleanup pass.
- To run: `npm run dev` (Convex pushes the new optional `snapshot` field automatically;
  optional-field adds are a safe migration). Open two browser windows to demo live sync.
