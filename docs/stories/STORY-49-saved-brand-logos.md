# STORY-49: Saved Brand Logos Library

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Brand logos saved to localStorage as a persistent library. Independent of company logos. Includes save, load, delete, and sidebar library display.

## Files Changed
- `client/src/lib/saved-brand-logos.ts` — brand logo persistence
- `client/src/lib/saved-brand-logos.test.ts` — tests
- `client/src/components/LogoUploader.tsx` — saved brand logos sidebar
- `client/src/lib/saved-creatives.ts` — savedBrandLogoIds field
