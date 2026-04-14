# STORY-118: Search Quick Fixes — sampleNames, Enter=AI, Empty State CTA

**Status:** ✅ Done
**Created:** 2026-03-12
**Package:** client (Retail Promo Designer)

## What

Three targeted fixes for the sidebar product search identified in the search review (docs/search-review-findings.md):

1. Fix `sampleNames` sampling in `handleAiSearch` — use 5-per-category strategy (up to 60) instead of `slice(0, 40)`.
2. Add Enter key → AI search trigger on the sidebar search input.
3. Improve empty state: add "Search with AI ✨" CTA button when search returns 0 results.

## Why

- `slice(0, 40)` gives unrepresentative samples for a 6213-product catalog (all from the same part of import order). The LLM can't translate user terminology to catalog vocabulary if samples don't cover all categories.
- Users don't discover the ✨ button — Enter is the universal "run search" gesture.
- Empty state is a dead end — a CTA to try AI search turns it into a recovery path.

## Acceptance Criteria

- [x] `handleAiSearch` builds sampleNames with 5-per-category up to 60, matching the strategy in `AgentChat.catalogSummary`.
- [x] Pressing Enter in the sidebar search input (when query is non-empty and `onAiSearch` is available) triggers AI search.
- [x] When search returns 0 results and `onAiSearch` is provided, the empty state shows a "Search with AI ✨" button.
- [x] Vocabulary mismatch resilience: when `nameContains` finds 0 products but `category` is valid, fall back to all products in that category (agent says "USB-C" but catalog uses "Type-C" → still returns chargers).
- [x] Vocabulary mismatch with no category: nameContains finds 0 + no category → 0 results (no blind all-select).
- [x] All existing tests continue to pass (715 tests, 0 failures).

## Test Plan

- [ ] Unit: `handleAiSearch` sampleNames contain names from at least 3 different categories when catalog has them.
- [x] Manual: 6213-product catalog — type "auto punjači usb-c" → Enter → list narrows correctly (Enter handler wired, AI path confirmed).
- [x] Manual: type "xyznotaproduct" → empty state shows "Search with AI ✨" button → click → AI runs.

## Files Changed

- `client/src/components/ProductDataInput.tsx` — sampleNames 5-per-category strategy, AI search empty state CTA
- `client/src/components/ProductFilter.tsx` — Enter key → AI search trigger on search input
- `client/src/lib/agent-actions.ts` — vocabulary mismatch resilience in catalog_filter (nameContains=0 + valid category → category-only fallback)
- `client/src/lib/agent-actions.test.ts` — 2 new tests for vocabulary mismatch cases

## Notes

- sampleNames strategy in `AgentChat.tsx` (line 629–641) is the reference implementation.
- The Enter key handler should only fire if `onAiSearch` prop is provided (not all uses of ProductFilter have AI search).
- Empty state CTA is in `ProductDataInput.tsx` (line 765–772), not in ProductFilter.
