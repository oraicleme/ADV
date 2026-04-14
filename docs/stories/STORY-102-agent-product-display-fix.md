# STORY-102: Agent Product Selection — Products Not Shown in Canvas

**Status:** ✅ Done
**Created:** 2026-03-09
**Package:** oraicle-retail-promo (client)

## What
The AI agent claims to have filtered/selected products (e.g. "Found 43 Daemen car holders, selecting them for the ad") but the ad canvas continues to show "No products selected yet". The selection is silently swallowed.

## Why
`templateProducts` (the products actually rendered in the ad canvas) gates on **both** `selectedProductIndices` (which products are selected for the ad) and `visibleProductIndices` (which products are currently visible in the product-table filter). When the product table has any active search or category filter, `visibleProductIndices` is a non-null subset of all products. The agent's `catalog_filter` action correctly updates `selectedProductIndices`, but if the newly-selected products are not in the current `visibleProductIndices` slice, the intersection is empty → the canvas shows nothing.

Example:
1. User has category filter "Automobile" active in product table → `visibleProductIndices = [200, 201, 202, ...]`
2. Agent runs `catalog_filter { nameContains: "Daemen" }` → `selectedProductIndices = new Set([3400, 3401, 3402, ...])`
3. `templateProducts` filters: `selectedProductIndices.has(i) && visibleSet.has(i)` → intersection is empty
4. Canvas: "No products selected yet"

The same bug affects `templateProductOriginalIndices` (used to route photo assignments back to the correct product row).

## Acceptance Criteria
- [x] After the agent runs a `catalog_filter`, the selected products appear immediately in the ad canvas, regardless of any active search/filter in the product table.
- [x] Manual selection (checkboxes in the product table) still works correctly — checked products appear in the canvas.
- [x] The product table's search/category filter continues to work as a navigation tool (narrows the visible rows) but does NOT gate what's rendered in the ad.
- [x] `templateProductOriginalIndices` stays in sync with `templateProducts` (same fix applied to both).

## Root Cause

In `client/src/components/AgentChat.tsx`, both `templateProducts` and `templateProductOriginalIndices` include:

```ts
const visibleSet = visibleProductIndices === null ? null : new Set(visibleProductIndices);
// ...
.filter(({ i }) => selectedProductIndices.has(i) && (visibleSet === null || visibleSet.has(i)))
```

`visibleProductIndices` tracks which rows are visible in the product table (after search/category filter). It should be a **UI navigation tool only** — it should NOT constrain which products are rendered in the ad canvas. The ad canvas must always render exactly the products in `selectedProductIndices`.

## Fix

Remove the `visibleProductIndices` gate from both `templateProducts` and `templateProductOriginalIndices`:

```ts
// BEFORE
.filter(({ i }) => selectedProductIndices.has(i) && (visibleSet === null || visibleSet.has(i)))

// AFTER
.filter(({ i }) => selectedProductIndices.has(i))
```

Also remove `visibleProductIndices` from both `useMemo` dependency arrays (and the `visibleSet` variable inside them).

## Test Plan
- [x] Load 6000+ products, apply a category filter in the product table, then ask the agent to filter a *different* category → products appear in canvas.
- [x] Load products, manually check a product that is NOT in the current table filter → it still appears in the ad canvas.
- [x] With no table filter (all rows visible), agent catalog_filter → products appear as before.
- [x] Photo assignment from canvas to product still routes to the correct row (templateProductOriginalIndices).

## Files Changed
- `client/src/components/AgentChat.tsx` — (1) removed `visibleProductIndices` gate from `templateProducts` and `templateProductOriginalIndices` memos; (2) changed `catalogSummary.sampleNames` from first-15 to 2 per category (up to 30) so the AI sees naming conventions across all categories; (3) moved `trpc.agents.getSuggestions.useMutation()` hook to component level (was illegally called inside the async callback); (4) added `products` and `getSuggestionsMutation` to `handleChatSend` useCallback deps
- `client/src/lib/agent-actions.ts` — `catalog_filter`: case-insensitive category matching; name-only fallback when category+name yields 0 results; guard against silently clearing selection when filter finds 0 matches with a non-empty filter term

## Notes
- `visibleProductIndices` state and `onVisibleIndicesChange` prop remain — the product table still calls it to track its visible rows for its own UI. It just no longer affects the ad canvas rendering.
- This is a pure rendering fix, no API or schema changes.
