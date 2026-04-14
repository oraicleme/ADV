# STORY-181: Products Tab — Sync Catalog Search + MiniSearch (Not Full Catalog)

**Status:** ✅ Done  
**Created:** 2026-03-21  
**Package:** oraicle-retail-promo (client)

## What

When the user searches in **Add Products**, then opens the **Products** tab, the panel must show the **same narrowed list** (search query + MiniSearch behavior as the catalog table), not all **N** catalog rows.

## Why

`productPanelSearchQuery` lived only in `AdCanvasEditor` and started empty; **Add Products** search state lived only inside `ProductDataInput`. Switching tabs reset the mental model: **6213 shown** = full catalog.

## Acceptance Criteria

- [x] Single shared `catalogSearchQuery` in `AgentChat` drives both **Add Products** search and **Products** tab search when both are mounted from retail promo flow.
- [x] `ProductSelectionPanel` filters with **MiniSearch** (`queryIndex` + `getCatalogMinScoreForQuery`) when an index is built from `allProducts`, matching `ProductDataInput` behavior; substring fallback when index is unavailable.
- [x] Unit tests cover MiniSearch path and existing filters.

## Test Plan

- [x] `pnpm vitest run client/src/lib/product-selection-panel-filters.test.ts`

## Files Changed

- `client/src/components/AgentChat.tsx` — `catalogSearchQuery` state; pass to `ProductDataInput` + `AdCanvasEditor`
- `client/src/components/ProductDataInput.tsx` — optional controlled `catalogSearchQuery` / `onCatalogSearchQueryChange`
- `client/src/components/AdCanvasEditor.tsx` — optional controlled product panel search (merge with internal state when unset)
- `client/src/components/ProductSelectionPanel.tsx` — `buildSearchIndex(allProducts)` + pass into filter
- `client/src/lib/product-selection-panel-filters.ts` — optional MiniSearch path
- `client/src/lib/product-selection-panel-filters.test.ts` — MiniSearch case

## Notes

- `useSearchIndex` in `AgentChat` uses `{ skip: true }` (Meilisearch); MiniSearch for UI remains local in `ProductDataInput` / Products panel via `buildSearchIndex(allProducts)`.
