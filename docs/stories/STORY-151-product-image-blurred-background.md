# STORY-151: Product Image — Blurred Background (Aspect-Ratio Intelligence)

**Status:** ✅ Done
**Created:** 2026-03-19
**Package:** client (ad-layouts/shared.ts — renderImage)

## What
Upgrade `renderImage` in `client/src/lib/ad-layouts/shared.ts` so that when a product image is present, the card background becomes a **blurred, scaled version of the same image** — instead of a plain light-grey fill.

The foreground image remains `object-fit: contain` (crisp, correct proportions). The background layer uses `object-fit: cover` + `filter: blur(24px) brightness(0.75) saturate(1.2)` + a slight scale to hide blur-edge artefacts.

This is one targeted change that propagates to all 4 ad layouts (single-hero, multi-grid, category-group, sale-discount) and to canvas, preview, and export simultaneously (they all call the same `renderImage`).

## Why
When a product image aspect ratio doesn't match the card (e.g. a portrait phone case in a square grid cell, or a wide laptop in a portrait story card) the current implementation leaves dead whitespace filled with `#f8fafc`. The "blurred background" technique — used by Spotify, Apple Music, Canva, and all premium design tools — converts that dead space into a visually coherent, premium-looking blur that matches the product's own color palette.

Result: any product image (square, portrait, landscape) looks high-end without any manual cropping.

## Acceptance Criteria
- [x] `renderImage` wraps the image in a `position:relative` container with `overflow:hidden`.
- [x] A background `<img>` layer renders the same `imageDataUri` with `object-fit:cover`, `filter:blur(24px) brightness(0.75) saturate(1.2)`, and `transform:scale(1.15)` (prevents blur-edge white rings).
- [x] A foreground `<img>` layer renders the same `imageDataUri` with `object-fit:contain` (crisp, proportionally correct).
- [x] The `alt` attribute appears only on the foreground image; the background layer uses `aria-hidden="true"`.
- [x] The "No image" fallback (`<div>` with grey background) is unchanged.
- [x] All existing `shared.test.ts` tests still pass.
- [x] New tests confirm the blurred background HTML structure.

## Test Plan
- [x] `renderImage returns blurred background container when imageDataUri is present`
  - assert output contains `filter:blur` or `blur(`
  - assert output contains `object-fit:contain` (foreground)
  - assert output contains `object-fit:cover` (background)
  - assert `aria-hidden="true"` on background layer
- [x] `renderImage fallback still renders grey div when no imageDataUri`
  - assert output contains `No image`
- [x] Run: `pnpm test -- client/src/lib/ad-layouts/shared.test.ts` — 12/12 pass

## Files Changed
- `client/src/lib/ad-layouts/shared.ts` — `renderImage` upgraded to blurred-background pattern
- `client/src/lib/ad-layouts/shared.test.ts` — 8 new tests for blurred background HTML structure

## Notes
- This is a pure HTML/CSS change inside the shared rendering engine. Canvas, preview, and PNG export all call `renderImage` via the layout renderers — so all three stages get the upgrade automatically with zero additional changes.
- The `scale(1.15)` on the background prevents the blur algorithm from leaving a thin transparent ring at the container edge (a common CSS artefact when `overflow:hidden` clips a blurred element exactly at its natural boundary).
- `brightness(0.75)` darkens the background slightly so the foreground product image always reads as the "hero" element, regardless of how bright or vibrant the product image is.
- If needed in future: `saturate(1.2)` can be lowered (or removed) for catalogs where the background color should be more neutral.
