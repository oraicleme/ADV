# STORY-119: AI-Driven Product Selection — General Architecture

**Status:** ✅ Done
**Created:** 2026-03-12
**Package:** client + server (Retail Promo Designer)

## What

Replaced client-side fuzzy/string matching for agent-driven product filtering with LLM-driven product selection. The agent now expresses user intent in natural language (`query`); the server calls `catalog.selectProducts` which receives the actual product names from this catalog and returns exact indices. Works for any catalog from any source (Excel, Magento, WooCommerce, custom API) without vocabulary assumptions.

## Why

- Client-side Levenshtein/fuzzy matching is vocabulary-dependent: "USB-C" ≠ "Type-C" even though they are the same connector.
- Different users load catalogs from different APIs — the system cannot assume any specific terminology.
- "Mi moramo napraviti generalni sistem kako ai agent i data koji dobija on filtrira i procesuira." — user requirement.

## Acceptance Criteria

- [x] `catalog.selectProducts` endpoint: receives `query` + compact candidate list → LLM reads actual product names → returns `{ indices, reasoning }`.
- [x] LLM prompt handles vocabulary bridging (USB-C = Type-C), semantic matching, brand+category filtering.
- [x] `CatalogFilterPayload` extended with `query`, `hintCategories`, `resolvedIndices` fields.
- [x] `applyAgentActions` handles `resolvedIndices` path (pre-resolved, no string matching).
- [x] `AgentChat` resolves `catalog_filter(query)` actions via `selectProducts` before `applyAgentActions`.
- [x] Client pre-filter by `hintCategories` limits candidates to ≤200 before server call.
- [x] Agent prompt updated: agent returns `query` + `hintCategories`, no `nameContains`/`category` guessing.
- [x] `catalogSummary.sampleNames` removed from agent chat context (no longer needed for vocabulary guessing).
- [x] Legacy `nameContains`/`category` path kept for backward compat and sidebar AI search.
- [x] 733 tests pass (18 new tests added).

## Test Plan

- [x] `catalog.selectProducts.test.ts`: LLM response parsing, index validation, hallucinated index rejection, maxSelect, semantic intent documentation.
- [x] `agent-actions.test.ts`: `resolvedIndices` path — direct apply, maxSelect, invalid index filtering, priority over legacy fields.
- [ ] Manual: 6213-product catalog — ask "USB-C punjači za auto" → agent sends `query` → server LLM reads catalog → correct chargers selected regardless of whether catalog says "USB-C" or "Type-C".

## Files Changed

- `server/routers/catalog.ts` — `selectProducts` mutation
- `server/routers/catalog.selectProducts.test.ts` — 15 new tests
- `client/src/lib/agent-actions.ts` — `CatalogFilterPayload` extended, `resolvedIndices` path in `applyAgentActions`
- `client/src/lib/agent-actions.test.ts` — 6 new `resolvedIndices` tests
- `client/src/lib/ad-canvas-ai.ts` — `sampleNames` made optional in `CatalogSummary`
- `client/src/lib/agent-chat-engine.ts` — agent prompt updated to `query`+`hintCategories` format
- `client/src/components/AgentChat.tsx` — `selectProductsMutation`, `resolveCatalogFilterActions` hook, async resolution in submit handler, `catalogSummary` cleanup

## Notes

- `hintCategories` uses EXACT category names from `catalogSummary.categories[].name` — agent picks from the list it receives.
- On `selectProducts` failure, the system falls back to the legacy `nameContains`/`category` path (graceful degradation).
- The sidebar `interpretProductSearch` and fuzzy search are unchanged — they serve the manual search UI.
- Next step if needed: increase `MAX_CANDIDATES` from 200 or add multi-category batching for catalogs with very large categories.
