# STORY-159: Unused Products Filter — Default On + Canvas-Aligned Catalog

**Status:** ✅ Done  
**Created:** 2026-03-19  
**Package:** oraicle-retail-promo (client)

## What

Default **“show only products not already on this ad”** to **on**, and drive the product list from the **full catalog** while **excluding products already placed on the canvas** by name. Align stats with industry-style “next creative” workflows (pick items not yet used on the current ad).

## Why

Merchandisers often ship **another** ad with **remaining** SKUs. The filter should start in the useful state, and “unused” must mean **not on the current ad**, not “unchecked in a local panel list,” while the rail still shows global selection (e.g. 13/1210).

## Acceptance Criteria

- [x] “Show only products not on this ad” (or legacy label when canvas names absent) is **checked by default**.
- [x] When the parent supplies **full catalog** + **names on canvas**, the panel lists **catalog − on-canvas** (by product **name**), and stats show **catalog size**, **count on ad**, and **available** (not on ad).
- [x] **Create New Ad** uses the same “not on this ad” remaining set when canvas names are supplied.
- [x] Filter/search behavior is covered by **unit tests** on the pure filter helpers.

## Test Plan

- [x] `product-selection-panel-filters.test.ts` — filter + remaining catalog with/without `namesOnCanvas`, search query, `showOnlyUnused`.
- [x] `pnpm vitest run client/src/lib/product-selection-panel-filters.test.ts` passes (full `client/` suite may have unrelated flaky perf test).

## Files Changed

- `client/src/lib/product-selection-panel-filters.ts` — pure filter + remaining catalog
- `client/src/lib/product-selection-panel-filters.test.ts` — tests
- `client/src/components/ProductSelectionPanel.tsx` — default toggle, props, stats, copy
- `client/src/components/AdCanvasEditor.tsx` — `selectionCatalogProducts`, pass canvas names + catalog
- `client/src/components/AgentChat.tsx` — pass full `products` catalog into the editor for the panel

## Notes

- Matching is by **`name`** (same as existing list/drag IDs). Duplicate names in catalog may all be treated as “on ad” if any row with that name is on canvas.
- Panel **checkbox** selection remains local for batch actions; this story does not lift that state to `AgentChat` (future if we wire batch → template).
