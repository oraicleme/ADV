# STORY-84: Manus — Intelligent Product Selection & Multi-Ad Campaigns

**Status:** ✅ Done
**Created:** 2025-10-03 (retroactive)
**Package:** root
**Agent:** Manus
**Phase:** 19–20

## What
selectProductsForAgent() with fuzzy search, product management UI with pagination/filtering, "Create new ad with remaining products", Figma-style tab panels (Chat, Products, Export, Settings), drag-and-drop reordering (@dnd-kit), batch operations.

## Files Changed
- `server/lib/select-products-for-agent.ts` + `.test.ts`
- `client/src/components/ProductSelectionPanel.tsx`, `DraggableProductList.tsx`, `ProductBatchOperations.tsx`, `PanelTabBar.tsx`

## Notes
- Git commits: c98429b, df83df6
