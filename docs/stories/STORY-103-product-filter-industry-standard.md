# STORY-103: Product Filter — Industry Standard (Smart Search, Product-Agnostic)

**Status:** 🟡 In Progress
**Created:** 2025-03-09
**Package:** oraicle-retail-promo (client + agent prompt)

## What

- Use the **existing** `product-search` library (fuzzy matching, `filterProductsIntelligent` / `searchProducts`) for `catalog_filter` instead of naive substring-only matching.
- **Product-agnostic**: no hardcoded brands or models (no iPhone, Samsung, etc. in prompt or tests). The AI uses only `catalogSummary.categories` and `catalogSummary.sampleNames` to build `nameContains` and `category` for any catalog.
- Filtering: fuzzy on name/code/brand, category exact then fuzzy fallback. Works for any product type.

## Why

- Current filter was substring-only and broke on naming variations and typos. Users need reliable filtering for any catalog without wrong counts or chaos.

## Acceptance Criteria

- [ ] `catalog_filter` uses `filterProductsIntelligent` (or `searchProducts`) from `product-search.ts` for `nameContains` (fields: name, code, brand), with fuzzy matching enabled.
- [ ] Category filter: exact match first; if 0 results and category was given, fallback to substring/fuzzy on category so slight AI misspellings still match.
- [ ] Agent prompt documents: futrole = cases; model/class/pro/pro max semantics; use of `sampleNames` to choose short, representative search terms; prefer terms that appear in sampleNames when they match user intent.
- [ ] No temporary debug logs in `catalog_filter` (remove existing console.log/console.warn from agent-actions.ts).
- [ ] Existing `catalog_filter` unit tests still pass; add at least one test that asserts fuzzy match is used (e.g. typo or variant matches).

## Test Plan

- [ ] Unit: `applyAgentActions` catalog_filter with fuzzy: e.g. nameContains "Denmen" matches "Denmen 360 Holder", "DENMEN Auto držač"; nameContains "drzac" matches "držač".
- [ ] Unit: category exact match; category fuzzy/fallback when exact yields 0.
- [ ] Manual: Load Excel with mixed products (futrole, držači, punjači, various brands). Ask "daj mi denmen auto držače" and "daj mi denmen auto punjace" → correct subset and count. Ask "futrole za iPhone 15 Pro" → only cases for that model/variant.

## Files Changed

- `client/src/lib/agent-actions.ts` — catalog_filter uses product-search fuzzy; category fallback; remove debug logs.
- `client/src/lib/agent-chat-engine.ts` — PRODUCT CATALOG INTELLIGENCE prompt: futrole, model/class/pro/pro max, sampleNames guidance.
- `docs/stories/TRACKER.md` — add STORY-103 In Progress.

## Notes

- Library: `client/src/lib/product-search.ts` (`searchProducts`, `filterProductsIntelligent`, `calculateSimilarity`). No new deps.
- Prompt and tests use no concrete product names: AI derives nameContains/category only from catalogSummary; tests use generic names (Proizvod Alpha/Beta, Tip A/B).
