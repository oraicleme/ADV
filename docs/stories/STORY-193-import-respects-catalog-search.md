# STORY-193: Import / Sync / Paste — Respect Active Catalog Search

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (root)

## What

When **Add Products** has a non-empty **catalog search** query, **replace** operations (Excel upload, paste, Catalog API full sync) must apply the **same search filter** as the Products tab / `filterProductsForSelectionPanel`, so users do not accidentally load thousands of rows when they intended only the current search slice (e.g. Teracell chargers).

## Why

Repeated user report: after searching (~41 items), the system still “uploads” / replaces the catalog with **all** items from file or API. The shared `catalogSearchQuery` was not applied at import boundaries.

## Acceptance Criteria

- [x] Extract **search-only** filtering (`filterCatalogBySearchQuery`); `filterProductsForSelectionPanel` delegates to it.
- [x] **`filterImportedCatalogByActiveSearch`** builds MiniSearch index on imported rows and filters (STORY-193).
- [x] **Catalog API sync** (`onCatalogSync`): applies filter when search non-empty; `catalog_import_filtered` log; chat error if 0 matches.
- [x] **Excel** and **paste** in `ProductDataInput`: same filter; errors when 0 matches; hint under Excel dropzone when search active.
- [x] Empty search → full imported list (unchanged).
- [x] Unit tests; `pnpm test` + `pnpm exec vite build`; tracker + Guardian.

## Test Plan

- [x] `product-selection-panel-filters.test.ts` — `filterImportedCatalogByActiveSearch`, `filterCatalogBySearchQuery`.

## Files Changed

- `client/src/lib/product-selection-panel-filters.ts`, `product-selection-panel-filters.test.ts`
- `client/src/components/AgentChat.tsx`, `client/src/components/ProductDataInput.tsx`
- `client/src/lib/retail-promo-log.ts` — `catalog_import_filtered` event type
