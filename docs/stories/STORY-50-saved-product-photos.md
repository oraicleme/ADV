# STORY-50: Saved Product Photos Library

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Product photos saved to localStorage. Independent of logos. Loaded on mount for the Retail Promo designer. Displayed in ProductImageUploader when there are saved photos.

## Files Changed
- `client/src/lib/saved-product-photos.ts` — product photo persistence
- `client/src/lib/saved-product-photos.test.ts` — tests
- `client/src/components/ProductImageUploader.tsx` — saved photos display
- `client/src/components/AgentChat.tsx` — loads saved photos on mount
