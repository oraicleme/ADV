# STORY-162: Catalog Filter Recall — Multi-Query Stage-1 + Inclusive LLM Selection

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client + server)

## What

Improve **agent catalog_filter** recall for natural-language queries (any vertical: mobility, pharma, tools):

1. **Stage 1 (Meilisearch):** Run **multiple complementary queries** (full phrase + diacritic-stripped + top token groups), **merge** hits by max score, then apply the existing noise floor — so relevant SKUs (e.g. inner tubes) are more likely to appear in the candidate set sent to the LLM.
2. **Stage 2 (selectProducts LLM):** Instruct **inclusive** selection for **product family / part-type** queries: include **variant forms** (solid/pneumatic/tubeless/inner/outer) unless the user **explicitly** excludes one.

## Why

Debug logs showed: (a) empty selection because **candidates** were unrelated (retrieval failure); (b) only 4 “outer tire” picks because the model required the literal **“spoljašnja”** string and dropped **puna** / **tubeless** tires that still match “spoljne gume za trotinete”.

## Acceptance Criteria

- [x] `buildExpandedSearchQueries` produces a small capped set of alternate queries; unit-tested.
- [x] `resolveCatalogFilterActions` merges multi-query Meilisearch results by **max score** per index, then existing floor / smart-routing logic applies.
- [x] `selectProducts` system prompt includes **inclusive variant** rules (category-agnostic wording).
- [x] Tests pass (`select-products-query-expansion.test.ts`, existing client/server tests).

## Test Plan

- [x] Unit tests for query expansion and merge helper.
- [x] `pnpm vitest run` on touched tests.

## Files Changed

- `client/src/lib/select-products-query-expansion.ts` — build queries + merge hits
- `client/src/lib/select-products-query-expansion.test.ts`
- `client/src/components/AgentChat.tsx` — Stage 1 multi-query
- `server/routers/catalog.ts` — `selectProducts` prompt

## Notes

**[Auth] Missing session cookie** in logs is unrelated to selection quality — tRPC catalog routes used as publicProcedure for search.
