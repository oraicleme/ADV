# STORY-141: Build Chunk Optimization

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** oraicle-retail-promo (client)

## What

Fix two Vite build warnings:
1. `ionet-client.ts` is statically imported by `product-vision-analyzer.ts` but dynamically imported elsewhere — Vite cannot move it into a separate chunk
2. The main `index` chunk is ~994 kB (gzip 281 kB), well above the 500 kB warning threshold

## Why

Large initial bundles slow down first-load performance. The ionet-client conflict prevents code-splitting from working correctly, keeping AI-client code in the critical path.

## Acceptance Criteria
- [x] No "dynamically imported but also statically imported" Vite warning for `ionet-client.ts`
- [x] `index` chunk is below 500 kB (minified)
- [x] Build completes without errors

## Test Plan
- [x] `pnpm build` completes with no static/dynamic import conflict warning
- [x] Chunk sizes listed — main index chunk 284 kB (was 994 kB, 71% reduction)

## Files Changed
- `client/src/lib/product-vision-analyzer.ts` — change static `ionet-client` import to dynamic
- `vite.config.ts` — add `manualChunks` to split vendor libraries

## Notes
The `product-vision-analyzer.ts` file uses `chatCompletion` only inside the async `callVisionModel` function, so switching to a dynamic import is safe and idiomatic.
