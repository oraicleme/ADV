# STORY-161: Multi-Page Canvas — Page Size Matches Grid Columns (12 for 4×3)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client)

## What

Drive **`maxProductsPerPage`** for portrait Story/Square from the **product grid column count**: **3 rows × columns** (e.g. **4 columns → 12** products per page). Wire **`getPages`** / **`splitProductsByPage`** from **`adProductBlockOptions.columns`** in **AgentChat** and **AdCanvasEditor**.

## Why

Paging used a fixed **9** slots for Story while the UI often uses **4 columns** — only **9** items appeared per page (**3×3** mental model) with empty space where a **fourth row** could show **12** (**3×4**).

## Acceptance Criteria

- [x] `maxProductsPerPage(Story|Square, 4) === 12`; default (no columns / 0) remains **9** (3×3).
- [x] Landscape format still caps at **4**; grid column argument is ignored.
- [x] `getPages(101, Story, 4)` first page has **12** indices; total indices sum to product count.
- [x] **AgentChat** `exportPages` and **AdCanvasEditor** `pages` use **`productBlockOptions.columns`**.

## Test Plan

- [x] `canvas-pages.test.ts` — new cases for `maxProductsPerPage(..., 4)` and `getPages(101, STORY, 4)`.
- [x] `canvas-multipage-export.test.ts` still passes (backward-compatible API).

## Files Changed

- `client/src/lib/canvas-pages.ts` — optional `gridColumns`; portrait capacity `3 * cols`.
- `client/src/lib/canvas-pages.test.ts` — assertions for 12-up paging.
- `client/src/components/AgentChat.tsx` — pass `adProductBlockOptions.columns` into `getPages`.
- `client/src/components/AdCanvasEditor.tsx` — define `productBlockOptions` before `getPages`; pass columns.

## Notes

`columns === 0` (auto) still maps to **3** columns for **capacity**; if the renderer picks a different column count via auto-layout, paging may differ until columns are set explicitly — acceptable follow-up.
