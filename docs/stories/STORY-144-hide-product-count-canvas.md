# STORY-144: Hide Product Count in Products Block

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** client (AdCanvasEditor + product block options)

---

## What

Add an option to **hide the product count** (and the “more on next pages” line) in the products block on the canvas. Today we always show e.g. “Page 1: 7 of 20 products” and “13 on next pages — use ‹ › to switch”; some users do not want this info visible (e.g. for cleaner preview or export).

---

## Why

There is no way to hide the product count / summary in the products menu block. Users may want a cleaner look without “N products” or “X on next pages” under the grid.

---

## Acceptance Criteria

- [x] **M1** Product block has an option (e.g. toggle in Fields or a dedicated “Show count”) that controls visibility of (a) the “+X more” / “X on next pages” line and (b) the “N products” / “Page K: M of N products” line.
- [x] **M2** When the option is off, both lines are hidden in the canvas; when on, current behaviour is unchanged (default on for backward compatibility).
- [x] **M3** Option is persisted in product block options (saved creatives, export) so it applies consistently.

---

## Test Plan

- [x] **T1** Unit/UI: Toggle off → both summary lines hidden; toggle on → both visible.
- [x] **T2** Saved creative with option off loads with count hidden.

---

## Files Changed

- `client/src/lib/ad-constants.ts` — added `showProductCount?: boolean` (default `true`).
- `client/src/components/AdCanvasEditor.tsx` — conditional render of count lines + Count toggle in toolbar.
- `client/src/lib/show-product-count-story144.test.ts` — contract tests for visibility + saved-config round-trip.

---

## Notes

- Default `true` so existing creatives show count.
- Broj stranica: 20 → 3 str. (7+7+6), 18 → 3 str. (6+6+6). Za 2 stranice treba 16 ili manje proizvoda.
