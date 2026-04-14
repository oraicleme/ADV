# STORY-107: Catalog Upload — Zero-Selection Start & Agent-First Flow

**Status:** ✅ Done
**Created:** 2026-03-10
**Package:** client

## What

When a user uploads an Excel catalog, the system currently auto-selects **all** products (e.g. 6213 of them). This means the canvas immediately renders thousands of products and the agent's context says `productCount=6213 selected`.

The fix: upload → **zero products selected** → canvas stays empty → agent waits for the user's first prompt → agent issues `catalog_filter` to make a meaningful selection.

This follows the industry-standard "catalog-as-context, not catalog-as-canvas" pattern used by Canva Commerce, Shopify Collabs, and Google Merchant Center.

## Why

- Auto-selecting 6213 products renders an unusable canvas and overwhelms the agent.
- The agent should receive a catalog _summary_ (count, categories, sample names) and pick products _only when asked_, not receive a pre-filled selection.
- The current behaviour forces the agent to deselect thousands of products before doing any real work.

## Root Cause

`ProductDataInput.tsx` line 285 / 313:
```typescript
onSelectionChange(new Set(result.products.map((_, i) => i)));
```
Immediately after parsing, every index is pushed into `selectedProductIndices`.

## Acceptance Criteria

- [x] After Excel/paste upload: `selectedProductIndices` is **empty** (Set size = 0).
- [x] Canvas shows "No products selected yet" placeholder when selection is empty.
- [x] The agent system prompt explicitly teaches: "catalog loads with 0 selected — always use catalog_filter on first turn."
- [x] The agent's first turn response to any product-related request issues a `catalog_filter` action that selects a meaningful subset (≤ 12 products for Story/Square, ≤ 4 for Landscape).
- [x] Existing "Select All" / "Select None" buttons in ProductDataInput still work.
- [x] Saved creatives that stored a full product list still restore correctly (keep existing `setSelectedProductIndices(new Set(config.products.map(...)))` for restores).

## Test Plan

- [x] Upload a 6213-product Excel → verify `selectedProductIndices.size === 0` immediately after upload.
- [x] Paste products manually → verify same zero-start behaviour.
- [x] Send agent a message "show me Denmen phone holders" → verify `catalog_filter` action is returned and products appear on canvas.
- [x] Restore a saved creative → verify all products are re-selected correctly (regression test).
- [x] Existing `filterProductsIntelligent` unit tests still pass.

## Files Changed

- `client/src/components/ProductDataInput.tsx` — removed `onSelectionChange(new Set(...))` from Excel parse path (line ~285) and paste parse path (line ~313).
- `client/src/lib/agent-chat-engine.ts` — added ZERO-SELECTION START rule to PRODUCT CATALOG INTELLIGENCE section of `AGENT_SYSTEM_PROMPT`.
- `client/src/lib/excel-parser.test.ts` — added STORY-107 zero-selection contract tests (2 new tests).

## Notes

- The `catalogSummary` (totalProducts, categories, sampleNames) is already correctly computed from the full `products` array and passed to the agent — only the **selection** changes to zero start.
- `filterProductsIntelligent` already handles the 6213-product case efficiently client-side — no performance concern there.
- The agent should cap its initial selection: `maxSelect: 8` for Story/Square, `maxSelect: 4` for Landscape.
- Do NOT change the auto-select in the "restore saved creative" flow (line 779 in AgentChat.tsx).
