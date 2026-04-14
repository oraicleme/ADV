# STORY-47: Header Brand Logos

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Brand/partner logos displayed in the ad header (max 5, fixed 32px height, right-aligned). Includes constraints and rendering in shared layout.

## Files Changed
- `client/src/lib/ad-constants.ts` — BRAND_LOGO_LIMITS
- `client/src/lib/ad-layouts/shared.ts` — renderBrandLogos, header brand logo row
- `client/src/lib/ad-templates.test.ts` — header brand logos tests
- `client/src/components/AdCanvasEditor.tsx` — brandLogoDataUris prop
