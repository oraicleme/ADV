# STORY-137: Meilisearch Hybrid Search + Smart LLM Routing

**Status:** ✅ Done
**Created:** 2026-03-15
**Package:** client + server

## What

Extend the Meilisearch integration (STORY-136) with:
1. Hybrid search (BM25 + vector) using io.net's REST embeddings API as the Meilisearch embedder
2. Smart LLM routing: skip the expensive selectProducts LLM call when Meilisearch hybrid returns high-confidence results (ranking score above threshold)

## Why

- BM25 alone misses semantic matches ("auto punjac" => "car charger", cross-language paraphrases)
- selectProducts adds 2-8s latency on every agent turn even for unambiguous queries
- Industry standard for product search: BM25 + vector hybrid at Stage 1, LLM rerank only when confidence is low
- io.net already provides an OpenAI-compatible /embeddings endpoint — same key, no new vendor

## Acceptance Criteria

- [x] **M1** Server: when MEILI_EMBEDDING_MODEL is set, indexCatalog also configures a rest embedder on the Meilisearch index pointing to io.net /embeddings using ENV.forgeApiKey. Document template: "{{doc.name}} {{doc.brand}} {{doc.category}}".
- [x] **M2** Server: searchCatalog includes hybrid: { embedder: "io-net", semanticRatio } when embedder is configured. Returns _rankingScore and _semanticScore per hit. New env var MEILI_SEMANTIC_RATIO (default 0.5).
- [x] **M3** Client (AgentChat): when Meilisearch path returns scores, skip selectProducts if top-N hits all exceed MEILI_CONFIDENCE_THRESHOLD (env, default 0.85) AND count >= minCandidates (3). Return those hits directly as resolvedIndices.
- [x] **M4** Fallback chain preserved: hybrid off (env unset) => pure BM25 Meilisearch (STORY-136). Meilisearch off => MiniSearch. No behavior change when env is unset.
- [x] **M5** New env vars documented: MEILI_EMBEDDING_MODEL, MEILI_SEMANTIC_RATIO, MEILI_CONFIDENCE_THRESHOLD.

## Test Plan

- [x] **T1** indexCatalog sends embedder settings with correct REST shape for io.net when MEILI_EMBEDDING_MODEL is set; skips embedder update when unset.
- [x] **T2** searchCatalog passes hybrid param when embedder is configured; omits it when not.
- [x] **T3** Smart routing: skips selectProducts when all top scores exceed threshold; calls selectProducts when scores are below threshold.
- [x] **T4** Regression: all existing tests pass when MEILI_EMBEDDING_MODEL is unset.

## Files Changed

- `server/_core/env.ts` — added `meiliEmbeddingModel`, `meiliSemanticRatio`, `meiliConfidenceThreshold`
- `server/lib/meilisearch-service.ts` — `isHybridConfigured()`, embedder config in `indexCatalog`, hybrid param in `searchCatalog`, `MeiliSearchHit` type with `semanticScore`
- `server/routers/catalog.ts` — import `isHybridConfigured`, expose `hybridEnabled` + `confidenceThreshold` from `getSearchProvider`
- `client/src/components/AgentChat.tsx` — read `hybridEnabled`/`confidenceThreshold` from provider data; smart routing in `resolveCatalogFilterActions`
- `server/lib/meilisearch-service.test.ts` — added T1e/T1f/T2e/T2f/T2g tests for STORY-137; updated T1 waitForTask count
- `client/src/lib/meilisearch-smart-routing.test.ts` — T3 smart routing pure-logic unit tests (12 cases)

## Env Vars

| Var | Default | Description |
|-----|---------|-------------|
| MEILI_EMBEDDING_MODEL | (unset = hybrid off) | io.net embedding model id (e.g. thenlper/gte-small, multilingual) |
| MEILI_SEMANTIC_RATIO | 0.5 | Hybrid ratio: 0 = pure BM25, 1 = pure vector. 0.5 recommended for product catalogs. |
| MEILI_CONFIDENCE_THRESHOLD | 0.85 | _rankingScore threshold above which LLM rerank is skipped |

## Notes

- Embedder config reuses ENV.forgeApiKey (io.net key already required for selectProducts)
- io.net embeddings endpoint: https://api.intelligence.io.solutions/api/v1/embeddings (OpenAI-compatible)
- Response path: data[].embedding (matches OpenAI /embeddings format)
- Smart routing minimum candidates: 3 (avoids short-circuiting on trivially small result sets)
- Meilisearch experimental vectors must be enabled on the server for embedder to work (set MEILI_EXPERIMENTAL_ENABLE_VECTORS=true)
