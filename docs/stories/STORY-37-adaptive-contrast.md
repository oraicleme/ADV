# STORY-37: Adaptive Text Contrast & Saved Creatives

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Implemented adaptive text contrast so inputs are always visible regardless of background color. Added saved creatives system (save/load ad states to localStorage). Mobile "Done" button for input blur on small screens.

## Why
Dark backgrounds made text invisible; users needed a way to save and revisit their work.

## Files Changed
- `client/src/components/AdCanvasEditor.tsx` — adaptive contrast helpers, mobile Done button
- `client/src/lib/saved-creatives.ts` — save/load creative states
- `client/src/lib/saved-creatives.test.ts` — tests
