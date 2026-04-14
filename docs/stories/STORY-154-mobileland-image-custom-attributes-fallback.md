# STORY-154: Mobileland image map — fallback to Magento `custom_attributes` image

**Status:** ✅ Done
**Created:** 2026-03-19
**Package:** oraicle-retail-promo (server)

## What
When building the SKU→image URL map from Magento REST, use the product’s base image attributes (`image`, `small_image`, `thumbnail` in `custom_attributes`) if `media_gallery_entries[0]` is missing.

## Why
Catalog rows often have a base image in attributes before the media gallery is fully populated; this aligns the designer with “list all products, photos arrive over time” without dropping SKUs from the enrichment map when only one source is set.

## Acceptance Criteria
- [x] API request `fields` includes `custom_attributes[attribute_code,value]`.
- [x] `addToMap` prefers gallery file, then `image`, `small_image`, `thumbnail`; ignores empty / `no_selection`.
- [x] Unit tests cover gallery-only, attributes-only, and neither.

## Test Plan
- [x] `pnpm exec vitest run server/lib/mobileland-api.test.ts`

## Files Changed
- `server/lib/mobileland-api.ts` — resolve image path from gallery or custom_attributes
- `server/lib/mobileland-api.test.ts` — attribute fallback + extend no-image case

## Notes
Products with no gallery and no image attributes still omit from the map; the client continues to render placeholders for those rows.
