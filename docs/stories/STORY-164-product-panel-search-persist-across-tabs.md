# STORY-164: Product Panel — Persist Search & Unused Filter Across Tab Switches

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client)

## What

Lift **search query** and **“show only not on this ad”** state from `ProductSelectionPanel` to `AdCanvasEditor` so leaving the Products tab (Chat / Export / Settings) does **not** unmount and reset them.

## Why

The bottom panel only renders `ProductSelectionPanel` when `activePanel === 'products'`. Local `useState` was cleared on unmount, so returning to Products showed the full “available” list (6000+) instead of the user’s active search.

## Acceptance Criteria

- [x] Search text and unused toggle survive Chat ↔ Products ↔ Export tab switches.
- [x] `ProductSelectionPanel` receives controlled props from `AdCanvasEditor`.

## Test Plan

- [x] Manual: type search, switch to Chat, back to Products — query still applied.
- [x] No new regressions in filter unit tests.

## Files Changed

- `client/src/components/AdCanvasEditor.tsx` — panel search state
- `client/src/components/ProductSelectionPanel.tsx` — controlled search + toggle
