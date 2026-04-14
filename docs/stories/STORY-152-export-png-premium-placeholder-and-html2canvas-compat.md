# STORY-152: PNG Export — Premium Placeholder & html2canvas Compat

**Status:** ✅ Done
**Created:** 2026-03-19
**Package:** client (ad-layouts/shared.ts — renderImage + all 4 layout call sites)

## What
Two focused fixes to `renderImage` in `shared.ts` that affect canvas, preview, and PNG export simultaneously:

1. **Premium "No image" placeholder** — Replace the plain grey `<div>No image</div>` with an accent-tinted gradient background + camera SVG icon that matches the ad's visual identity. Requires adding `accentColor?: string` as a third parameter to `renderImage`, and updating all 4 layout call sites.

2. **html2canvas compat fix (STORY-151 follow-up)** — STORY-151 introduced `inset:0` shorthand in the blurred background layer. `html2canvas` parses CSS manually and does not reliably support shorthand properties like `inset`. Replace with explicit `top:0;left:0;right:0;bottom:0`.

## Why
When a product has no image available (SKU not in Mobileland cache, third-party catalog without images, etc.), the exported PNG currently shows a grey box with "No image" text — which is unpublishable on Instagram/TikTok. The industry standard (Canva, Figma, Shopify) is a tonally coherent, brand-colored placeholder that still looks intentional.

`inset:0` breaks the positioned container in `html2canvas`, meaning the two-layer blurred background introduced in STORY-151 does not render correctly in the exported PNG.

## Acceptance Criteria
- [x] `renderImage(product, heightPx, accentColor?)` — `accentColor` defaults to `'#f97316'` (orange, matches default accent).
- [x] When `imageDataUri` is absent: render a gradient placeholder using `accentColor` at low opacity, with a centered camera SVG icon at `accentColor` at 50% opacity. No "No image" text.
- [x] When `imageDataUri` is present: blurred background layer uses explicit `top:0;left:0;right:0;bottom:0` instead of `inset:0`.
- [x] All 4 layout call sites (`single-hero.ts`, `multi-grid.ts`, `category-group.ts`, `sale-discount.ts`) pass the resolved `accentColor`.
- [x] All existing `shared.test.ts` tests still pass.
- [x] New tests validate the placeholder and the html2canvas-compatible positioning.

## Test Plan
- [x] `premium placeholder contains gradient and SVG when imageDataUri is absent`
  - assert `linear-gradient` in output
  - assert `<svg` in output
  - assert no "No image" text
- [x] `premium placeholder uses accentColor in gradient`
  - assert output contains the hex value of the passed accentColor
- [x] `blurred background layer uses explicit position properties (not inset shorthand)`
  - assert `top:0` present, assert `left:0` present
  - assert `inset` absent
- [x] `foreground image layer uses explicit position properties (not inset shorthand)`
  - same check for the foreground img
- [x] Run: `pnpm test -- client/src/lib/ad-layouts/shared.test.ts` — 15/15 pass

## Files Changed
- `client/src/lib/ad-layouts/shared.ts` — `renderImage` signature + placeholder + inset fix
- `client/src/lib/ad-layouts/single-hero.ts` — pass `style.accentColor`
- `client/src/lib/ad-layouts/multi-grid.ts` — pass `accentColor` param
- `client/src/lib/ad-layouts/category-group.ts` — pass `accentColor` param
- `client/src/lib/ad-layouts/sale-discount.ts` — pass `accentColor` param
- `client/src/lib/ad-layouts/shared.test.ts` — new tests

## Notes
- `filter:blur()` in STORY-151 is NOT supported by html2canvas — the background layer will render as a sharp cover image in the PNG export (no blur). This is acceptable; the cover image fills the background without distorting the foreground. A future story can address this with a canvas-native blur workaround.
- The camera SVG (Feather icons `camera` path) is inline SVG — no external dependency, renders in all environments including html2canvas and pdf exporters.
- Gradient formula: `linear-gradient(135deg, ${accentColor}18, ${accentColor}2e)` — 18 and 2e are alpha hex values (~10% and ~18% opacity), giving a very subtle tint that works on both light and dark backgrounds.
