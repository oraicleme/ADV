# STORY-140: Embedder Config Decoupled + BM25 Fallback on Missing Embedder

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** server (`server/lib/meilisearch-service.ts`, `server/routers/catalog.ts`) + client (`client/src/components/AgentChat.tsx`)

## What

Two fixes for the critical bug where search returns 0 candidates:

1. **Decouple embedder configuration from document upsert**: `configureIndex()` — a new server function that sets index settings + embedder (without touching documents). Called on app startup and on `OPENAI_API_KEY` first-available, regardless of whether any documents changed.

2. **Graceful fallback in `searchCatalog`**: if Meilisearch returns `"Cannot find embedder with name 'openai'"`, transparently retry without hybrid (pure BM25). This ensures search works even if the embedder is not yet configured.

## Why / Root Cause

```
Bug observed: Stage 1 returns 0 candidates → LLM gets empty list → no products shown

Root cause chain:
  User has OPENAI_API_KEY now (added today)
  → products loaded from Excel (6213 products, same as before)
  → STORY-139 getIndexStats() → documentCount > 0 (old index still has data)
  → STORY-139 loadIndexState() → stored state matches (same catalog)
  → computeCatalogDiff → toUpsert = [] (zero changes)
  → indexProductsMutation is NOT called (no delta)
  → indexCatalog() never runs → updateEmbedders() never runs
  → Meilisearch index has no 'openai' embedder
  → searchCatalog(hybrid: { embedder: 'openai' }) → "Cannot find embedder"
  → search throws → hits = [] → Stage 1 = 0 candidates
```

This is a STORY-139 design gap: embedder lifecycle is tied to document upsert. When the env changes (new OpenAI key added), the embedder must be configured independently.

## Acceptance Criteria

- [x] **M1** New server function `configureIndex(): Promise<void>` in `meilisearch-service.ts`:
  - Updates index settings (searchableAttributes, filterableAttributes, rankingRules, typoTolerance)
  - Configures OpenAI embedder when `isHybridConfigured()`
  - Does NOT touch documents
  - Idempotent — safe to call on every app startup

- [x] **M2** New tRPC procedure `catalog.configureIndex` (mutation, no input):
  - Calls `configureIndex()` server-side
  - No-op if Meilisearch not configured
  - Returns `{ ok: boolean, reason? }`

- [x] **M3** `AgentChat.tsx`: call `configureIndex` mutation on mount (once). This ensures the embedder is always set up before any search.

- [x] **M4** `searchCatalog` in `meilisearch-service.ts`: catch the specific Meilisearch error `"Cannot find embedder with name"` and retry without hybrid (pure BM25). Log a warning.

- [x] **M5** `indexCatalog` still configures embedder as part of full re-index/upsert (belt-and-suspenders).

## Test Plan

- [x] **T10** `configureIndex` calls `updateSettings` and `updateEmbedders` without calling `addDocuments`
- [x] **T11** `configureIndex` does NOT call `updateEmbedders` when `openAiApiKey` is empty
- [x] **T12** `searchCatalog` fallback: when Meilisearch throws "Cannot find embedder", retries without hybrid
- [x] **T12** `searchCatalog` does NOT fall back on unrelated errors

## Files Changed

- `server/lib/meilisearch-service.ts` — added `configureIndex()`, shared `INDEX_SETTINGS`/`buildEmbedderConfig()`, BM25 fallback in `searchCatalog`
- `server/lib/meilisearch-service.test.ts` — added T10, T11, T12 (32 total tests)
- `server/routers/catalog.ts` — added `catalog.configureIndex` mutation
- `client/src/components/AgentChat.tsx` — added `configureIndexMutation`, mount effect calls it

## Console evidence

```
[AgentChat] Meilisearch search failed: TRPCClientError: Cannot find embedder with name `openai`.
[AgentChat] Stage 1 returned 0 candidates for: iPhone auto punjači
```

## Notes

- M4 (search fallback) is the immediate safety net — even if M3 (startup configure) hasn't run yet, search still works with BM25.
- M3 (startup configure) ensures hybrid is active ASAP without waiting for a document upsert.
- Together they eliminate the entire class of "embedder not configured" failures.
