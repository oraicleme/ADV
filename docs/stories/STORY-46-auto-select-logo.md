# STORY-46: Auto-Select First Saved Logo

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
When loading saved logos on mount, auto-select the first logo if none is currently selected.

## Files Changed
- `client/src/components/AgentChat.tsx` — logo auto-selection on mount
- `client/src/lib/saved-creatives.ts` — savedLogoId field
