# STORY-40: Element Order — Drag-to-Reorder Blocks

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Implemented configurable render order of the five named ad blocks (headline, products, badge, cta, disclaimer). Users can drag-to-reorder blocks within a rendered ad.

## Why
Different promotional strategies need different content hierarchy (e.g., price-first vs. brand-first).

## Files Changed
- `client/src/lib/ad-constants.ts` — NAMED_BLOCKS, DEFAULT_ELEMENT_ORDER
- `client/src/lib/ad-layouts/shared.ts` — renders blocks in user-defined order
- `client/src/lib/ad-templates.test.ts` — elementOrder tests
- `client/src/lib/saved-creatives.ts` — persists element order
