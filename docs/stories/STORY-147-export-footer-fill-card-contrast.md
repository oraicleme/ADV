# STORY-147: PNG Export — Footer Too Low & Card Text Contrast

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** client (ad layouts, templates)

## What
- On PNG export for tall formats (e.g. 1080×1920), the footer sat in a large empty area because product image height was capped at 280px, so content did not fill the artboard.
- Product card text (e.g. names) inherited body’s light color on dark-background ads and became unreadable on white cards.

## Why
- Industry manner: use available space so the ad looks optimized; avoid a “footer too low” look and low-contrast card text.

## Acceptance Criteria
- [x] Product image height can exceed 280px on tall formats so content fills the artboard and the footer is not left in a big gap.
- [x] Product cards always use dark text on white background (explicit `color:#111827`) so they stay readable regardless of body color.

## Test Plan
- [x] `computeEffectiveImageHeight` tests updated for dynamic effectiveMax (shared.test.ts).
- [x] ad-templates and preview-export-story132 tests updated for height cap 600 and filters.
- [x] Manual: Export PNG on 1080×1920 ad; confirm larger product images and readable card text.

## Files Changed
- `client/src/lib/ad-layouts/shared.ts` — effectiveMax = max(PREVIEW_MAX, computed); card contrast not in shared (in layouts).
- `client/src/lib/ad-layouts/multi-grid.ts` — card wrapper `color:#111827`.
- `client/src/lib/ad-layouts/sale-discount.ts` — card wrapper `color:#111827`.
- `client/src/lib/ad-layouts/category-group.ts` — card wrapper `color:#111827`.
- `client/src/lib/ad-layouts/single-hero.ts` — card wrapper `color:#111827`.
- `client/src/lib/ad-layouts/shared.test.ts` — T1 assertions for effectiveMax.
- `client/src/lib/ad-templates.test.ts` — height cap 600, filter ≤600.
- `client/src/lib/preview-export-story132.e2e.test.ts` — height cap 600, getProductHeights filter ≤600.

## Notes
- PREVIEW_MAX (280) remains the cap for smaller formats; for tall formats the “fill space” computed value is used as the upper bound so images can grow and reduce the gap above the footer.
