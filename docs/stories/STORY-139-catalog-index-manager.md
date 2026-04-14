# STORY-139: Catalog Index Manager — Incremental Meilisearch Indexing (Diff + Health Check)

**Status:** ✅ Done
**Created:** 2026-03-15
**Package:** client (new: `client/src/lib/catalog-index-manager.ts`) + server (`server/lib/meilisearch-service.ts`, `server/routers/catalog.ts`) + `client/src/components/AgentChat.tsx`

## What

Build a **catalog index manager** that makes Meilisearch indexing incremental — only new or changed
products are sent to Meilisearch (and OpenAI for embeddings). Products already indexed with the same
content are skipped entirely. Deleted products are removed from the index.

## Why

Right now, every time `products` changes in `AgentChat` (page reload, new Excel upload, API refresh),
we call `indexProducts` with the **entire catalog**. With OpenAI embeddings enabled, Meilisearch
calls OpenAI for every single product — every time. For a 6000-product catalog that's:

- Wasted OpenAI API cost on products that haven't changed
- Slow indexing (OpenAI has per-request latency)
- No awareness of what's already indexed

Industry standard (Algolia, Elasticsearch, Shopify): hash per product, track state, diff on change,
only index delta. One full index on first load; incremental updates forever after.

## Root cause

```
products change in React
  → useEffect fires
  → indexProducts(ALL 6000 products)
  → Meilisearch: addDocuments(6000) → OpenAI: embed(6000) ← EVERY TIME
```

With incremental indexing:
```
products change in React
  → computeDiff(current, storedHashes)   ← pure JS, <5ms
  → getIndexStats()                       ← health check: is Meilisearch index alive?
  → if healthy: indexProducts(only 47 changed) + deleteProducts([3 removed IDs])
  → if empty:   indexProducts(all 6000, save state)
  → OpenAI: embed(only 47)               ← 99% cost reduction on repeat loads
```

## Acceptance Criteria

- **M1** New file `client/src/lib/catalog-index-manager.ts` exports:
  - `hashProduct(p: ProductItem): string` — deterministic hash of `name|brand|code|category`; pure, no I/O
  - `getUniqueKey(p: ProductItem): string` — `p.code.trim()` if non-empty, else `p.name.trim()` (normalized, lowercase)
  - `computeCatalogDiff(current: ProductItem[], storedState: CatalogIndexState): CatalogDiff`
    - Returns `{ toUpsert: ProductItem[], toDelete: string[], stats: { added, updated, deleted, unchanged } }`
    - `toDelete` = unique keys that were in storedState but not in current
    - `toUpsert` = new products + products whose hash changed
    - `unchanged` = products whose hash matches stored
  - `CatalogIndexState` interface: `Map<uniqueKey: string, hash: string>` — serializable to/from JSON
  - `buildIndexState(products: ProductItem[]): CatalogIndexState` — build fresh state from product list
  - `loadIndexState(storageKey: string): CatalogIndexState | null` — reads from localStorage; returns null if absent or corrupt
  - `saveIndexState(storageKey: string, state: CatalogIndexState): void` — writes to localStorage

- **M2** Server: `server/lib/meilisearch-service.ts`:
  - Add `deleteDocuments(ids: number[]): Promise<void>` — deletes docs by numeric Meilisearch ID
  - Add `getIndexStats(): Promise<{ documentCount: number }>` — returns number of indexed documents

- **M3** Server: `server/routers/catalog.ts`:
  - Add `deleteProducts` mutation: accepts `{ ids: number[] }`, calls `deleteDocuments`, no-op if empty
  - Add `getIndexStats` query: returns `{ documentCount: number }` from Meilisearch; returns `{ documentCount: 0 }` if not configured

- **M4** `client/src/components/AgentChat.tsx` — replace full re-index with incremental:
  - On `products` change:
    1. Call `getIndexStats` to check if Meilisearch index is populated
    2. Load stored state from localStorage (`'oraicle:catalog-index-state'`)
    3. If `documentCount === 0` OR no stored state → **full re-index**: `indexProducts(all)`, save state
    4. Else → **diff**: `computeCatalogDiff(products, storedState)` → `indexProducts(toUpsert)` + `deleteProducts(toDelete)`, update state
    5. Log stats: `[CatalogIndexManager] full|incremental: +N added, ~N updated, -N deleted, N unchanged`

- **M5** `getUniqueKey` collision detection: if two products in the catalog share the same unique key
  (same code or same name), append index suffix `_1`, `_2` to disambiguate. Log a warning.

## Test Plan

- **T1** `hashProduct` returns same string for same input, different string for any field change (name, brand, code, category)
- **T2** `getUniqueKey`: returns normalized code when present; falls back to name; handles empty/whitespace; appends suffix on collision
- **T3** `computeCatalogDiff` — new product → in `toUpsert`; changed product (any field) → in `toUpsert`; deleted product → in `toDelete`; unchanged product → in neither, counted in `stats.unchanged`
- **T4** `computeCatalogDiff` — empty stored state → all products in `toUpsert` (first load)
- **T5** `loadIndexState` / `saveIndexState` — round-trip through localStorage (mock)
- **T6** `deleteDocuments` calls Meilisearch `deleteDocuments` with correct IDs
- **T7** `getIndexStats` returns `{ documentCount: N }` from Meilisearch stats

## Files Changed

- `client/src/lib/catalog-index-manager.ts` — new (hashProduct, getUniqueKey, computeCatalogDiff, buildIndexState, loadIndexState, saveIndexState)
- `client/src/lib/catalog-index-manager.test.ts` — new (30 tests)
- `server/lib/meilisearch-service.ts` — added `deleteDocuments`, `getIndexStats`
- `server/lib/meilisearch-service.test.ts` — added T6 (deleteDocuments), T7 (getIndexStats)
- `server/routers/catalog.ts` — added `deleteProducts` mutation, `getIndexStats` mutation; `indexProducts` now accepts explicit `id` per product
- `client/src/components/AgentChat.tsx` — incremental indexing flow (full re-index on first load, diff thereafter)

## Key Files to Read First

- `client/src/lib/ad-constants.ts` — `ProductItem` interface
- `server/lib/meilisearch-service.ts` — current `indexCatalog`, `MeiliProductDoc`
- `server/routers/catalog.ts` — current `indexProducts` mutation
- `client/src/components/AgentChat.tsx` — current `useEffect` that calls `indexProductsMutation`

## Architecture

```
ProductItem[]  (from Excel / API)
      |
getUniqueKey()   hashProduct()
      |                |
      └──── computeCatalogDiff(current, storedState) ──────────────────┐
              |                                                         |
        toUpsert[]                                               toDelete[]
              |                                                         |
     indexProducts(toUpsert)                              deleteProducts(toDelete)
              |                                                         |
     Meilisearch addDocuments                          Meilisearch deleteDocuments
              |
        OpenAI embed (only new/changed)
              |
     saveIndexState(localStorage)
```

## localStorage Key

`'oraicle:catalog-index-state'` — JSON serialized `{ [uniqueKey: string]: hash: string }`.

For multi-source catalogs (future): key can be scoped per source URL.

## Collision Handling (M5)

Mobileland products have reliable `code` fields. Generic Excel may have duplicates.
`computeCatalogDiff` detects duplicate unique keys within the current batch and disambiguates
by appending `_1`, `_2` etc. This ensures the diff is always deterministic.

## Notes

- `hashProduct` uses a simple deterministic string hash (djb2 or similar) — no crypto dependency.
  Collision probability for 6000 products is negligible. If a hash collision causes a false "unchanged",
  the worst outcome is a stale embedding — not a correctness bug.
- `getIndexStats` is a lightweight call (`index.getStats()`) — no documents are fetched.
- On first load (no localStorage): `documentCount` from Meilisearch may be 0 (fresh instance) or
  N (data persisted from previous session). Either way, if localStorage is empty → full re-index
  to ensure state is synchronized.
- If localStorage is cleared by browser: next load triggers full re-index automatically.
- `deleteProducts` is a no-op when `ids` is empty — safe to call always.
- This story does NOT change the Meilisearch document shape (`MeiliProductDoc`) — same fields as STORY-138.
