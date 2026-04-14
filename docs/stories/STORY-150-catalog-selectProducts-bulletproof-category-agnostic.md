# STORY-150: Catalog Selection — Bulletproof, Category-Agnostic selectProducts

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** server (catalog.selectProducts LLM prompt + tests)

## What
Update `catalog.selectProducts` LLM system prompt in `server/routers/catalog.ts` to follow a structured "bulletproof" architecture (Role → Task → Constraints → Format) and make product matching **category-agnostic** and **entity-strict** across catalog types.

In addition, add/extend unit tests to enforce negative constraints (no model bleed) and cross-category correctness.

## Why
Current prompt logic already attempts strict model/variant scope, but it still encourages category filtering behavior and lacks explicit negative-constraint tests that demonstrate "iPhone 15 excludes iPhone 14/16" across non-mobile categories.

This reduces precision errors in LLM-assisted product selection, improving downstream ad generation quality.

## Acceptance Criteria
- [x] Replace the existing `systemPrompt` string inside `selectProducts` in `server/routers/catalog.ts` with the structured prompt architecture from Manus proposals (Role → Task → Constraints → Format).
- [x] Ensure the prompt is **category-agnostic**: it should not assume "mobile accessories" patterns; it should apply the same entity-strict rules for any catalog category.
- [x] Keep and strengthen **strict entity scope**:
  - if query mentions a model/variant (e.g. iPhone 15, S24, 18V), exclude other models/variants.
- [x] Add negative-constraint tests:
  - Query: `iPhone 15` must exclude `iPhone 14` and `iPhone 16` when they exist in candidates.
- [x] Add cross-category validation:
  - Query: `Makita 18V baterija` must exclude non-18V batteries when present in candidates.
- [x] Update any existing tests that document prompt intent to match the new category-agnostic wording/behavior.

## Test Plan
- [x] Update `server/routers/catalog.selectProducts.test.ts` with:
  - a simulated response test that reflects the new "entity-strict, category-agnostic" intent
  - at least 2 explicit negative constraint cases (iPhone 15, Makita 18V)
  - a validation that the parsed indices are only taken from the provided candidate list (no hallucinated indices)
- [x] Run unit tests: `pnpm test -- server/routers/catalog.selectProducts.test.ts`
- [ ] (Optional) Re-run manual integration test with live LLM if API keys are configured:
  - `pnpm test -- server/routers/catalog.selectProducts.integration.test.ts`

## Files Changed
- `server/routers/catalog.ts` — updated `selectProducts` LLM `systemPrompt` to Role → Task → Constraints → Format, category-agnostic examples (Makita 18V, iPhone 15)
- `server/routers/catalog.selectProducts.test.ts` — added `selectProducts — negative constraints (STORY-150)` describe block with 3 tests; updated prompt structure test to assert `Constraints` / `Format` sections

## Notes
- The system prompt is built inline in `selectProducts` as `const systemPrompt = ...` and fed into `invokeLLM({ messages: [{ role: 'system', content: systemPrompt }, ...] })`.
- Tests in `catalog.selectProducts.test.ts` currently simulate correct/incorrect LLM outputs via mocked `invokeLLM` and validate response parsing + intent documentation.
- All 20 unit tests pass (3 new negative-constraint tests added).
