# Demo: report lifecycle — live co-edit → review diff → lock → share

Decision (from team discussion): drop per-change approval. Assigning who can edit IS
the governance decision; re-approving every keystroke is ceremony, not safety. Model =
live co-edit + attribution + history + owner review-and-lock. The lock is the single
sign-off gate; the activity feed + snapshots are the audit trail.

## Plan

- [ ] **Schema** (`convex/schema.ts`) — add to `textDocuments` (all optional, default
      "drafting"): `status: "drafting" | "locked"`, `lockedAt`, `lockedByName`,
      `lockedByCompany`, `baselineSegments` (the last-locked version, for the diff).
- [ ] **Server lifecycle** (`convex/text.ts`):
  - `getTextContent` returns status + lock info + `baselineContent` (joined baseline).
  - `lockDocument` — set locked + lock metadata, set baseline = current segments, log
    a "locked the report" activity entry.
  - `reopenDocument` — back to drafting, log "reopened for editing".
  - Guard `applyEdit` and `restoreToEdit` to reject writes when locked.
  - Defaults in `ensureDocument` / `resetDocument` (status drafting, baseline = seed).
- [ ] **Diff util** (`lib/text-diff.ts`) — word-level LCS diff → tokens
      (`equal | added | removed`), merged into runs for clean rendering.
- [ ] **Diff view** (`components/report-diff-view.tsx`) — render tokens: added = green,
      removed = red strikethrough.
- [ ] **Page lifecycle** (`components/collaborative-text-page.tsx`) — three states:
  - drafting → textarea editor (current) + a "Review & lock" button
  - reviewing (client toggle) → diff vs baseline + "Lock & publish" / "Back to editing"
  - locked → read-only `AttributedTextView` "official version" + banner (locked by /
    when) + "Reopen for editing" + "Copy share link"
  - disable editor + restore when locked.
- [ ] **Verify** — `tsc`, lint (no new errors), reseed if needed, sanity-check the
      lock/reopen round-trip.

## Notes

- Role-free on purpose: anyone can lock, framed as the owner action. Adding an explicit
  owner role is a later step if the team wants it — kept out to stay true to the
  "don't add ceremony" decision.
- Share is lightweight (copy current link + "official version" badge), not a separate
  public route — enough to narrate the lifecycle.
- Real concurrency caveat unchanged: segment model is last-write-wins for simultaneous
  edits to the same region; fine for async, would need a CRDT for true simultaneity.

## Review

- Three states ship: drafting (live textarea + attribution), reviewing (word-level diff
  vs. last locked version), locked (read-only official view + reopen/share).
- Lock sets the locked version as the next review baseline, so each cycle's diff shows
  exactly "what changed since we last published." Lock & reopen are logged in the feed.
- Server guards: `applyEdit` and `restoreToEdit` reject writes while locked (verified via
  CLI — the lock error fires). Restore buttons hidden in the UI when locked too.
- Verified end-to-end on the local deployment: lock → status locked, write rejected,
  reopen → drafting.
- `tsc` clean; lint adds no new errors (only the 3 pre-existing set-state-in-effect ones
  remain) and I cleaned 2 pre-existing nits (prefer-const, unused var).
- Role-free by design (anyone can lock, framed as the owner action), per the team
  decision that assigning editors is the real governance gate.
- To start the demo from a pristine state: `npx convex run text:resetDocument '{}'`.
