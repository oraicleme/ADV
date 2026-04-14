# STORY-160: Product Selection — Search/Filter Must Update the List (DraggableProductList Sync)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client)

## What

Fix the Products tab so **typing in search** actually **narrows the visible list** while **“not on this ad”** is on. Also match **brand** in the same search box (name/code/category/brand).

## Why

`DraggableProductList` kept **`orderedProducts`** from the **first mount only**. When `filteredProducts` from the parent changed, the list **did not update** — users saw the full “unused” catalog (~6000+) regardless of search.

## Acceptance Criteria

- [x] When `products` prop changes (search/filter), the rendered list **matches** the new prop (order state resets to parent order).
- [x] Search matches **brand** as well as name, code, and category.
- [x] Unit tests cover brand search and existing filter behavior.

## Test Plan

- [x] `product-selection-panel-filters.test.ts` — brand match.
- [x] `pnpm vitest run client/src/lib/product-selection-panel-filters.test.ts` passes.

## Files Changed

- `client/src/components/DraggableProductList.tsx` — sync `orderedProducts` when filtered `products` changes.
- `client/src/lib/product-selection-panel-filters.ts` — include `brand` in search.
- `client/src/lib/product-selection-panel-filters.test.ts` — brand search test.

## Notes

Duplicate product **names** in the catalog can still confuse dnd-kit ids (`id: product.name`) — out of scope.
