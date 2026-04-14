# STORY-55: Per-Row Product Photo Picker

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Each product row in the table and canvas gets a clickable photo picker. "No img" cells become clickable when a saved photos library is provided. Users can assign or upload photos per-product.

## Files Changed
- `client/src/components/ProductTable.tsx` — per-row photo picker cells
- `client/src/components/AdCanvasEditor.tsx` — clickable product images, photo picker popover
- `client/src/components/PhotoPickerPopover.tsx` — popover component
- `client/src/components/AgentChat.tsx` — original product indices tracking
