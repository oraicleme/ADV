# STORY-204: VC Doc — Operations, Smoke & Deferred Registry Links

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (docs + tests)

## What

Update **`docs/system-overview-vc.md`** so investors/engineers see **release-style checks** (`pnpm run smoke`), **manual QA** (`docs/qa-manual-smoke-retail-promo.md`), and **deferred / not-built** scope (`docs/deferred-features-registry.md`). Extend **`vc-system-overview-doc.test.ts`** to lock these references.

## Why

STORY-203 added tooling and registries outside the VC doc; the overview should point to them without duplicating full specs.

## Acceptance Criteria

- [x] `docs/system-overview-vc.md` links to deferred registry + QA smoke + mentions `pnpm run smoke` (or equivalent).
- [x] `vc-system-overview-doc.test.ts` asserts those paths/phrases.
- [x] Version footer bumped; tracker/guardian/handoff next id advanced.

## Test Plan

- [x] `pnpm test` includes updated VC tests; green.

## Files Changed

- `docs/system-overview-vc.md` — § Operations & release checks, v2.2.
- `client/src/lib/vc-system-overview-doc.test.ts` — fourth test case.
- `docs/stories/TRACKER.md` — STORY-204 done, next id **205**.
- `docs/handoff-new-agent-2026-03-21.md` — next id **205**.
- `.cursor/rules/guardian-agent.mdc` — §14.
- `docs/technical-status-guardian-review-2026-03-23.md` — header ids.

## Notes

- No product code paths changed.
