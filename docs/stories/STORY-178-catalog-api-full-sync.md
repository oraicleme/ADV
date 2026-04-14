# STORY-178: Catalog API — Full Sync (Pagination + Field Mapping → Products + Index)

**Status:** ✅ Done  
**Created:** 2026-03-21  
**Package:** oraicle (server + client)

## What

Server-side **paginated GET** of JSON catalog APIs with **configurable field paths** (dot notation) and **offset or page** pagination; normalize rows to Oraicle `ProductItem`-compatible objects. Persist mapping/pagination next to STORY-174 settings. **Sync catalog** in Settings → Import replaces the workspace product list and triggers existing Meilisearch indexing (AgentChat).

## Why

STORY-177 validated connectivity; users need to **pull** vendor/product feeds into Oraicle and search — without manual Excel — using the same SSRF-safe server proxy.

## Acceptance Criteria

- [x] `catalog.syncCatalogFromApi` returns normalized products (name required); paginates until empty/short page or caps; JSON body size cap per page; reuses catalog URL SSRF rules.
- [x] localStorage holds mapping + pagination defaults; merge-safe with STORY-174 fields.
- [x] Settings → Import: mapping fields + **Sync catalog**; success/error feedback; parent replaces `products` and selects all indices (AgentChat).
- [x] Unit tests: nested path extraction, pagination loop (mocked fetch), SSRF block in production mode.

## Test Plan

- [x] `pnpm vitest run` — 904 passed
- [x] Mocked pagination + mapping covered in `catalog-api-sync.test.ts`

## Files Changed

- `server/lib/catalog-url-ssrf.ts` — shared SSRF gate
- `server/lib/external-catalog-connection.ts` — uses shared SSRF
- `server/lib/catalog-api-sync.ts` — paginated sync + mapping
- `server/lib/catalog-api-sync.test.ts` — new
- `server/routers/catalog.ts` — `syncCatalogFromApi` mutation
- `client/src/lib/catalog-api-settings-storage.ts` — mapping + pagination fields
- `client/src/lib/catalog-api-settings-storage.test.ts` — updated defaults
- `client/src/components/CatalogApiImportStubSection.tsx` — mapping UI + Sync
- `client/src/components/WorkspaceSettingsPanel.tsx` — `onCatalogSync`
- `client/src/components/AdCanvasEditor.tsx` — `onCatalogSync` prop
- `client/src/components/AgentChat.tsx` — wire sync → `setProducts` + select all

## Notes

- Does not schedule hourly/daily jobs (cadence remains preference only). Image URLs / Magento hooks can follow later.
