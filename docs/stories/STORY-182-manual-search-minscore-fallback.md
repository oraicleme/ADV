# STORY-182: Manual search — minScore fallback when BM25 yields 0 rows

**Status:** ✅ Done
**Created:** 2026-03-21
**Package:** oraicle-retail-promo (client)

## What

When Workspace Settings → Search sets a **strict** minimum BM25 score, manual catalog search (Add Products + Products tab) could return **zero** rows even when products matched the query text. The agent path already used MiniSearch with `minScore: 0` and substring fallback; the manual UI applied `minScore` with **no** fallback.

## Why

Users saw “0 products” for valid searches (or slid thresholds high), which felt broken compared to substring-style matching they expect from catalog search.

## Acceptance Criteria

- [x] After strict `minScore` returns no hits, manual search retries with full BM25 recall (`minScore: 0`), then substring fallback on name/code/brand if still empty.
- [x] Unit tests cover strict threshold + substring path.
- [x] Product selection panel filter uses the same helper as Add Products.

## Test Plan

- [x] `pnpm exec vitest run client/src/lib/product-index.test.ts client/src/lib/product-selection-panel-filters.test.ts`

## Files Changed

- `client/src/lib/product-index.ts` — `substringMatchProductIndices`, `queryProductIndicesWithManualFallback`
- `client/src/components/ProductDataInput.tsx` — use fallback helper for visible rows
- `client/src/lib/product-selection-panel-filters.ts` — same for Products tab
- `client/src/lib/product-index.test.ts` — STORY-182 cases

## Notes

If users still see 0 rows, check **classification filters** (category/brand chips) and **“Show only products not on this ad”** — those apply after search.
