# STORY-56: Per-Product-Block Configuration

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Per-product-block options: columns, field visibility, image height, max products. Configurable from AgentChat and persisted in saved creatives.

## Files Changed
- `client/src/lib/ad-constants.ts` — ProductBlockOptions type and defaults
- `client/src/components/AdCanvasEditor.tsx` — productBlockOptions prop
- `client/src/components/AgentChat.tsx` — product block options prop
- `client/src/lib/saved-creatives.ts` — productBlockOptions persistence
