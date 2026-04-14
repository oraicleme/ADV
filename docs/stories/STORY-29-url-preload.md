# STORY-29: URL Preload from Control Panel

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Read `?preload=<base64 JSON>` from URL on mount so the control-panel chat widget can pre-fill the ad designer with data.

## Why
Enables seamless handoff from the control-panel to the ad designer with pre-populated context.

## Files Changed
- `client/src/components/AgentChat.tsx` — preload query param parsing on mount
