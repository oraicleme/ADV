# STORY-205: Industry Layout — Explicit Contracts (Safe-Zone / Chrome Reserve)

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client)

## What

Implement the **first industry-standard roadmap step** from `docs/industry-standard-manner.md` § “Naredni koraci”: make vertical **chrome reserve** (header + footer + padding estimate) an **explicit named constant** in `ad-constants.ts`, use it in `computeEffectiveImageHeight`, and add **contract tests** (image height bound vs available band, footer `margin-top:auto`). Document the increment in the industry doc.

## Why

Today the 300px reserve was a magic number inside `shared.ts`. Industry manner calls for testable contracts so future safe-zone padding can build on the same API.

## Acceptance Criteria

- [x] `INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX` exported from `ad-constants.ts` and used by `computeEffectiveImageHeight` in `ad-layouts/shared.ts`.
- [x] `shared.test.ts` asserts image height respects the 0.6 × per-row band after reserve (with existing clamp rules).
- [x] `ad-templates.test.ts` asserts enabled footer HTML includes `margin-top:auto` (dock contract).
- [x] `docs/industry-standard-manner.md` updated: what’s done vs remaining pixel safe-zone work.

## Test Plan

- [x] `pnpm test` green.

## Files Changed

- `client/src/lib/ad-constants.ts` — `INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX`
- `client/src/lib/ad-layouts/shared.ts` — uses constant
- `client/src/lib/ad-layouts/shared.test.ts` — STORY-205 contract tests
- `client/src/lib/ad-templates.test.ts` — footer `margin-top:auto`
- `docs/industry-standard-manner.md` — STORY-205 subsection + roadmap

## Notes

- Visual output unchanged while reserve remains 300px.
