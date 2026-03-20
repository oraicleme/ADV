# STORY-153: fetchMobilelandImageMap — tRPC v11 `result.data.json` shape

**Status:** ✅ Done
**Created:** 2026-03-19
**Package:** oraicle-retail-promo (client)

## What
Parse the real HTTP response from `GET /api/trpc/catalog.getMobilelandImages` correctly for tRPC v11 (`result.data.json`), not only the legacy flat `result.data` shape.

## Why
Standalone `fetchMobilelandImageMap()` / `getProductImageUrl()` returned `{}` against a live server because the JSON envelope wraps the map in `.json`. React Query + `@trpc/client` already deserializes correctly; this aligns the manual fetch helper.

## Acceptance Criteria
- [x] `fetchMobilelandImageMap` returns the SKU→URL map from a v11-style response
- [x] Legacy flat `result.data` map still works if ever returned
- [x] Unit tests cover v11 envelope and pass

## Test Plan
- [x] `pnpm exec vitest run client/src/lib/mobileland-images.test.ts`

## Files Changed
- `client/src/lib/mobileland-images.ts` — unwrap `result.data.json` when present
- `client/src/lib/mobileland-images.test.ts` — tRPC v11 response case

## Notes
Live check: `curl /api/trpc/catalog.getMobilelandImages` returns `"result":{"data":{"json":{...}}}`.
