# STORY-68: Vision-Powered Product Analyzer

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Vision-powered product analysis: sends product images to a vision LLM for analysis. Runs once per product set (silent, non-blocking). Resets when products change.

## Files Changed
- `client/src/lib/product-vision-analyzer.ts` — vision analyzer
- `client/src/lib/product-vision-analyzer.test.ts` — tests
- `client/src/components/AgentChat.tsx` — vision analysis state, auto-trigger on product change
