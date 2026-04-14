# STORY-52: Product Image Height Control

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Configurable product image height in the canvas editor (range 40–300 px, default 80 px). Prop-controlled or default.

## Files Changed
- `client/src/lib/ad-constants.ts` — PRODUCT_IMAGE_HEIGHT_LIMITS
- `client/src/components/AdCanvasEditor.tsx` — productImageHeight prop + image size slider
