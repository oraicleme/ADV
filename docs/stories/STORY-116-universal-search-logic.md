# STORY-116: Universal Search Logic — One Algorithm for All Products

**Status:** 🟡 In Progress
**Created:** 2026-03-12
**Package:** client (Retail Promo Designer)

## What

Search/filter logic was split into product-specific branches (chargers vs adapters, connector mismatch, first-token fallback, category-only fallback). We unified it into a single universal path: one token-based search for all products, no per-product-type logic.

## Why

- Maintaining separate logic per product type does not scale and is hard to reason about.
- User request: "ne mozemo za svaki proizvod raditi dodatnu logiku, to je kretenski" — we must not add extra logic for each product.

## Acceptance Criteria

- [x] One search algorithm: tokenize query, score products on name/code/brand (and category when filtering), no product-type penalties.
- [x] catalog_filter: single path — nameToIndices → applyCategoryFilter → maxSelect. No first-token fallback, no charger-relevance filter, no category-only fallback.
- [x] When category is specified but no product matches that category, return 0 selected (do not fall back to name-only).
- [x] Removed filterIndicesByChargerRelevance and relevanceMultiplier (connector/charger-specific logic) from product-search.
- [x] Tests updated for universal behaviour; e2e and unit tests pass.

## Test Plan

- [x] product-search.test.ts: universal token match tests (no "exclude adapter/Lightning" assertions).
- [x] agent-actions.test.ts: wrong category yields 0 selected; no fallback tests.
- [x] product-catalog-e2e.test.ts: "E2E: Filter with universal search" expectations updated.

## Files Changed

- `client/src/lib/product-search.ts` — Removed STORY-111 connector/charger relevance; searchProducts uses only token score.
- `client/src/lib/agent-actions.ts` — Removed fallbacks and filterIndicesByChargerRelevance; applyCategoryFilter returns [] when category specified but no match.
- `client/src/lib/agent-actions.test.ts` — catalog_filter tests for universal search.
- `client/src/lib/product-search.test.ts` — Universal search describe block.
- `client/src/lib/product-catalog-e2e.test.ts` — E2E filter expectations for universal search.

## Notes

- Agent/LLM should still send nameContains + category from catalog vocabulary; the client now applies one consistent filter. Refining results (e.g. "samo punjači") is done by correct category, not by product-type hacks in the client.
