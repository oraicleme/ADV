# STORY-120: Candidate Selection Fix — Product Search Returns 0

**Status:** ✅ Done
**Created:** 2026-03-12
**Package:** client

## What
Fixed `resolveCatalogFilterActions` in `AgentChat.tsx` so that it finds the right candidate products to send to the LLM for selection — even when the agent guesses the wrong category name.

## Why
Agent was generating `hintCategories: ["Punjači za auto"]` but the real category in the catalog was `"Auto Moto"`. Exact match returned 0 candidates, and the fallback `products.slice(0, 200)` sent the first 200 products (wrong category). The LLM correctly returned `indices: []` because it was shown non-charger products. Result: canvas always showed 0 products.

## Root Cause
Two bugs:
1. `hintCategories` was matched with strict `Set.has()` exact equality
2. Fallback was `products.slice(0, 200)` — first 200 alphabetically, not representative of the catalog

## Acceptance Criteria
- [x] hintCategories partial/contains match tried when exact match returns 0
- [x] keyword token scan on product name/brand/code tried when category match returns 0
- [x] representative sample (5/category, up to 200) used as last resort instead of slice(0,200)
- [x] agent prompt no longer uses fake hardcoded category name examples
- [x] console log shows which strategy fired + candidate count
- [x] hintCategories instruction updated: only use verbatim names from catalogSummary

## Test Plan
- [x] Strategy logic is in place and documented via console logging
- [x] Manual: load 6213-product catalog, type "USB-C punjači za auto" → >0 products selected

## Files Changed
- `client/src/components/AgentChat.tsx` — replaced lines 323–341 with 4-strategy cascade (exact-category → partial-category → keyword-scan → representative-sample)
- `client/src/lib/agent-chat-engine.ts` — updated hintCategories prompt rule + replaced fake category examples with placeholders

## Notes
The `catalog.selectProducts` server mutation was never broken — the issue was 100% in which candidates were sent to it.
