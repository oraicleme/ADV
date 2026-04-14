# STORY-138: Meilisearch Hybrid Search — OpenAI Embedder + MiniSearch Fallback Removed

**Status:** ✅ Done
**Created:** 2026-03-15
**Package:** server (`server/lib/meilisearch-service.ts`, `server/_core/env.ts`, `server/routers/catalog.ts`) + client (`client/src/components/AgentChat.tsx`)

## What

Switched Meilisearch to use the **OpenAI native embedder** (`text-embedding-3-small`) for hybrid search (BM25 + semantic vectors), and **removed MiniSearch as a fallback** from the main search pipeline in `AgentChat.tsx`. Meilisearch is now the sole search provider.

## Why

The previous architecture had two problems:

1. **io.net REST embedder** was unstable — custom REST template config, not natively supported by Meilisearch, difficult to debug.
2. **MiniSearch fallback** required constant domain-specific tuning (vocabulary tables, synonym groups, fuzzy parameters) for every new product type. It was not an "auto solution" — it needed manual work per catalog.

`text-embedding-3-small` is a multilingual model trained on BCS + EN. It understands `kola = auto`, `futrola = case`, `punjač = charger` **without any hardcoded synonym tables or rule engines**. Once configured, it works for any product catalog, any language, any domain.

## Changes Made

### `server/_core/env.ts`
- Added `openAiApiKey: process.env.OPENAI_API_KEY ?? ""`

### `server/lib/meilisearch-service.ts`
- **Removed** catalog-derived vocabulary/synonym system (`buildVocabulary`, `buildMeiliSynonyms`, all vocabulary helpers) — embeddings handle semantic bridging automatically
- **Changed** `isHybridConfigured()` to check `ENV.openAiApiKey` instead of `ENV.forgeApiKey + ENV.meiliEmbeddingModel`
- **Changed** embedder from io.net REST to **OpenAI native** (`source: 'openAi'`, `model: 'text-embedding-3-small'`)
- **Added** industry-standard index settings: `rankingRules`, `typoTolerance` (enabled for words ≥5 chars)
- Embedder name changed from `'io-net'` to `'openai'`

### `server/routers/catalog.ts`
- `getSearchProvider` now returns `'unconfigured'` instead of `'minisearch'` when Meilisearch is not set up

### `client/src/components/AgentChat.tsx`
- **Removed** `import { buildSearchIndex, queryIndex }` from `product-index`
- **Removed** MiniSearch fallback in `resolveCatalogFilterActions` (entire if/else block)
- `useSearchIndex` now always called with `{ skip: true }` — only used for catalog version tracking (stale detection), never builds MiniSearch index
- Indexing `useEffect` no longer gated on `searchProvider === 'meilisearch'`
- `sharedSearchIndex` prop to `ProductDataInput` always `undefined` (ProductDataInput builds its own local index for sidebar search)
- Smart LLM routing condition simplified (removed `searchProvider === 'meilisearch'` check)

## Acceptance Criteria

- [x] Meilisearch hybrid search uses OpenAI `text-embedding-3-small` natively
- [x] `isHybridConfigured()` returns true when `OPENAI_API_KEY` is set
- [x] MiniSearch fallback removed from main search pipeline
- [x] Index settings include `rankingRules` and `typoTolerance`
- [x] No vocabulary/synonym tables in `meilisearch-service.ts`
- [x] All tests pass (21 new tests in `meilisearch-service.test.ts`)

## Test Plan

- [x] T1 — `indexCatalog` sets correct searchable/filterable/rankingRules/typoTolerance settings
- [x] T2 — `searchCatalog` filter expressions (category, brand, combined)
- [x] T3 — Integration smoke: representative queries via mocked Meilisearch
- [x] T4 — Regression: env guards (`isMeilisearchConfigured`, `isHybridConfigured`)
- [x] T5 — `indexCatalog` configures OpenAI embedder with `source=openAi`, `model=text-embedding-3-small`
- [x] T6 — `indexCatalog` skips embedder when `openAiApiKey` is empty
- [x] T7 — `searchCatalog` passes `hybrid.embedder='openai'` when configured
- [x] T8 — `searchCatalog` omits hybrid param when OpenAI key is absent
- [x] T9 — `semanticScore` correctly extracted from `_rankingScoreDetails`

## New Env Var Required

```
OPENAI_API_KEY=sk-...
```

Add to `.env.local`. Without this, Meilisearch still works (BM25 only), but hybrid semantic search is disabled.

## Notes

- `product-index.ts` (MiniSearch) is NOT deleted — it's still used by `agent-actions.ts` for category string matching (`calculateSimilarity`) and by `ProductDataInput.tsx` for sidebar product search. That's a separate story.
- `use-search-index.ts` is kept as a lightweight catalog version counter (the `versionRef` is still used for stale detection in `resolveCatalogFilterActions`).
- `MEILI_EMBEDDING_MODEL` env var is no longer used by the service (model is hardcoded as `text-embedding-3-small`). It can be removed from env in a future cleanup story.
