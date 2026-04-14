# STORY-136: Switch to Meilisearch (hybrid with MiniSearch fallback)

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client + server

## What

Introduce Meilisearch as the primary product search backend when configured, with MiniSearch + catalog-search-vocabulary as fallback when Meilisearch is unavailable (e.g. no server, Excel-only flow). All communication with Meilisearch goes through our server (no client-side Meilisearch URL or keys). Based on [STORY-135](STORY-135-meilisearch-research.md) research and [meilisearch-options.md](../research/meilisearch-options.md).

## Why

- Meilisearch gives typo tolerance, synonym support, filtering, and <50 ms search without maintaining a custom tokenizer.
- Server-side proxy keeps keys and URL secret; client stays unchanged from a "search API" perspective.
- Hybrid keeps the app working when Meilisearch is not deployed (e.g. local Excel-only usage).

## Acceptance Criteria

- [x] **M1** Server: when `MEILI_HOST` and `MEILI_API_KEY` are set, Oraicle can index a catalog (ProductItem[]) into a Meilisearch index: documents with `id`, `name`, `brand`, `code`, `category`; searchable attributes order `['name','brand','code','category']`; filterable `category`, `brand`.
- [x] **M2** Server: synonyms (space-compounds + synonym groups) are derived from `buildSearchVocabulary` / catalog-search-vocabulary and pushed to Meilisearch index settings when indexing (same vocabulary source as MiniSearch path).
- [x] **M3** Server: search endpoint (e.g. tRPC `catalog.searchProducts` or equivalent) that accepts query + optional filters; calls Meilisearch and returns matching product indices (and scores if needed). Used when Meilisearch is configured.
- [x] **M4** Client: product search pipeline uses Meilisearch-backed search when server reports it available (e.g. feature flag or "search provider" from server); otherwise uses existing MiniSearch + `buildSearchIndex` / `queryIndex`. No duplicate indexing (if Meilisearch, client does not build MiniSearch index for that catalog).
- [x] **M5** When Meilisearch is not configured, behavior is unchanged: MiniSearch + vocabulary + existing `selectProducts` LLM rerank.

## Test Plan

- [x] **T1** Server: unit or integration test — index N products, update synonyms (e.g. "play station" ↔ "playstation"), search "play station" returns expected document ids.
- [x] **T2** Server: search with filter (e.g. `category = "Gaming"`) returns only documents in that category.
- [x] **T3** E2E or integration: same catalog and representative queries ("play station", "joystick", "USB-C punjači") — Meilisearch path returns results consistent with or better than MiniSearch recall (smoke).
- [x] **T4** Regress: when Meilisearch env is unset, existing product-index and catalog_filter (and selectProducts) tests still pass. All 727 tests pass (54 files).

## Files Changed

- `server/_core/env.ts` — added `meiliHost` (MEILI_HOST) and `meiliApiKey` (MEILI_API_KEY)
- `server/lib/meilisearch-service.ts` — new internal module: `isMeilisearchConfigured`, `indexCatalog`, `searchCatalog`, `buildMeiliSynonyms`; ported vocabulary logic from client
- `server/lib/meilisearch-service.test.ts` — 15 tests covering T1–T4
- `server/routers/catalog.ts` — added `getSearchProvider`, `indexProducts`, `searchProducts` tRPC procedures
- `client/src/lib/use-search-index.ts` — added `skip?: boolean` option to `useSearchIndex`
- `client/src/components/AgentChat.tsx` — query `getSearchProvider`, skip MiniSearch build when Meilisearch active, index products on catalog change, call `catalog.searchProducts` in `resolveCatalogFilterActions` when provider is meilisearch, MiniSearch fallback when Meilisearch returns empty

## Notes

- Index name: `products` (single index for POC).
- Primary key: array index (0, 1, 2, …) — returned ids map directly to client `products` array positions.
- LLM rerank (selectProducts) unchanged: still receives candidates from either Meilisearch or MiniSearch.
- ProductDataInput sidebar search: when Meilisearch is active, `sharedSearchIndex` is not passed to ProductDataInput so it builds its own local MiniSearch — sidebar search remains functional.
- Race condition (indexing in flight when agent runs): if Meilisearch returns empty, falls back to on-the-fly MiniSearch automatically.
