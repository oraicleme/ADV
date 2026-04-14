# STORY-208: Products tab — list only search matches (optional)

**Status:** ✅ Done  
**Created:** 2026-03-24  
**Package:** oraicle-retail-promo (root)

## What

In the bottom **Products** tab, when **“Only list search matches”** is on (default), an **empty** search box shows **no rows** so the user works only with **search hits** (pickable subset), not the full catalog. Optional checkbox turns off this behavior (legacy: full catalog when search is empty).

## Why

Large catalogs made the panel unusable: “All matching search” with empty query equals entire catalog; merchants want to **search first**, then pick rows.

## Acceptance Criteria

- [x] With default on, empty search → `shown` = 0 and a clear empty hint.
- [x] User can uncheck to restore browsing full catalog without typing search (STORY-159 style).
- [x] Non-empty search unchanged (still uses MiniSearch + List scope).

## Test Plan

- [x] Manual: Products tab — empty search → no rows; type query → rows; uncheck → rows without query.

## Files Changed

- `client/src/components/ProductSelectionPanel.tsx`
- `client/src/components/AdCanvasEditor.tsx`
- `docs/stories/TRACKER.md`
- `.cursor/rules/guardian-agent.mdc`
