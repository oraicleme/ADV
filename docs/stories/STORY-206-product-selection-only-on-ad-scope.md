# STORY-206: Product Selection — “Only on this ad” scope (search ∩ canvas)

**Status:** ✅ Done  
**Created:** 2026-03-24  
**Package:** oraicle-retail-promo (root)

## What

Add a third filter mode in the Products tab so users can list **only products that are already on the current ad**, optionally **intersected with the active search** — not only “not on this ad” (STORY-159).

## Why

Merchants need to review or batch-select the subset of on-ad rows that match a query; the previous boolean excluded on-ad rows whenever “not on this ad” was on (default), so the on-ad set was never visible in that mode.

## Acceptance Criteria

- [x] User can choose **All matching search**, **Not on this ad**, or **Only on this ad** (after search pipeline).
- [x] **Only on this ad** = intersection of search hits with `namesOnCanvas` (by product `name`).
- [x] Default scope remains **Not on this ad** (preserves STORY-159 “remaining SKUs” workflow).
- [x] Unit tests cover the new scope + existing behaviors.
- [x] Empty state copy distinguishes “no matches” when scope is only-on-ad + search.

## Test Plan

- [x] `pnpm exec vitest run client/src/lib/product-selection-panel-filters.test.ts`

## Files Changed

- `client/src/lib/product-selection-panel-filters.ts` — `ProductSelectionCanvasScope`, filter logic
- `client/src/lib/product-selection-panel-filters.test.ts` — cases for `only_on_canvas`
- `client/src/components/ProductSelectionPanel.tsx` — Select UI + props
- `client/src/components/AdCanvasEditor.tsx` — state `productPanelCanvasScope`
- `client/src/lib/agent-chat-engine.ts` — prompt line for “Available”
- `docs/product-selection-on-ad-vs-search-technical.md` — resolved note
- `docs/stories/TRACKER.md` — Done row 206 (207 row preserved for parallel STORY-207); next id **208**
- `.cursor/rules/guardian-agent.mdc` — §14 next id sync

## Notes

See `docs/product-selection-on-ad-vs-search-technical.md` for prior analysis.
