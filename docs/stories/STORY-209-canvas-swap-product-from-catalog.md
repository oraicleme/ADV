# STORY-209: Canvas — swap product slot from search-matched catalog

**Status:** ✅ Done  
**Created:** 2026-03-24  
**Package:** client

## What

Let users replace any product **slot** on the ad canvas with another row from the **loaded catalog**, using the **same search** as Add Products / Products tab (MiniSearch + rules + min-score when an index is available).

## Why

After narrowing the catalog with search, merchants want to **curate which exact SKUs appear** on the creative without re-importing or relying only on the agent — industry-standard “replace this tile” behavior.

## Acceptance Criteria

- [x] On canvas product image, user can open **Swap product** and pick a catalog row from **search-aligned** results (shared workspace search query).
- [x] **Only list search matches** (Products tab checkbox) is respected: empty search → empty list + guidance when that mode is on.
- [x] Swap replaces the **catalog row** backing that canvas slot; the current slot’s row is overwritten by a clone of the chosen row (same semantics as “this position shows that SKU”).
- [x] Unit tests cover index filtering parity with `filterCatalogBySearchQuery`.

## Test Plan

- [x] `pnpm vitest run client/src/lib/product-selection-panel-filters.test.ts`
- [x] `pnpm exec vite build` (production build)
- [ ] Manual: search in Add Products → canvas → Swap → pick a row → card updates

## Files Changed

- `client/src/lib/product-selection-panel-filters.ts` — `filterCatalogIndicesBySearchQuery`
- `client/src/components/ProductSwapPopover.tsx` — new
- `client/src/components/ProductImageSlotMenuPopover.tsx` — new
- `client/src/components/AdCanvasEditor.tsx` — slot menu + swap wiring
- `client/src/components/AgentChat.tsx` — `onSwapCanvasProduct` handler
- `client/src/lib/agent-chat-engine.ts` — prompt note for support
- `client/src/lib/product-selection-panel-filters.test.ts` — tests
- `.cursor/rules/guardian-agent.mdc` — Section 14 snapshot
- `docs/stories/TRACKER.md` — next id 210

## Notes

- Pass `templateProductCatalogIndices` (same as `templateProductOriginalIndices` in AgentChat) so swap targets the correct backing row.
- Clear `webImageSelections[origIdx]` on swap so web image overrides do not leak to the new SKU.
