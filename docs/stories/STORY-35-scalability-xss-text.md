# STORY-35: Scalability, XSS Protection, Text-Only Preview

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Added max-length constraints for ad text fields (truncation, XSS prevention, performance). Created text-only preview fallback when no products/logos but headline/CTA/badge are set.

## Why
Security and performance: prevent XSS injection and handle edge cases where visual content is missing.

## Files Changed
- `client/src/lib/ad-constants.ts` — MAX_LENGTHS constants
- `client/src/lib/ad-templates.ts` — text-only preview function
- `client/src/lib/ad-templates.test.ts` — scalability, XSS, long-text, text-only tests
- `client/src/lib/ad-performance.test.ts` — performance tests
