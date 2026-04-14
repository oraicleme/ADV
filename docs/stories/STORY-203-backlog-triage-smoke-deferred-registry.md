# STORY-203: Backlog Triage, Smoke Gate & Deferred Features Registry

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (tooling + docs)

## What

Close the gaps called out as “not done” in the technical status review: **automated smoke** (`pnpm run smoke`), **manual browser smoke** checklist, **central deferred-features registry** (Faza C, STORY-197 optional), **tracker triage** for STORY-93–97, and **less flaky** product-index performance budgets.

## Why

Seniors and agents need one place for deferred work, a repeatable CI-style gate, and a cleared distinction between “legacy aspirational backlog” and active work—without pretending Faza C or server-backed manual search are shipped.

## Acceptance Criteria

- [x] `package.json` exposes `smoke` = `vitest run && vite build` (same practical gate as `pnpm test` + client build).
- [x] `docs/qa-manual-smoke-retail-promo.md` lists manual steps for Phase A browser verification.
- [x] `docs/deferred-features-registry.md` lists Faza C, STORY-197 optional, and points to roadmaps.
- [x] `TRACKER.md` separates **legacy aspirational** rows (93–97) from active backlog.
- [x] `product-index.test.ts` performance thresholds tolerate slow CI/WSL (no arbitrary flakes).
- [x] Vitest asserts `package.json` defines `smoke` with vitest + vite build.
- [x] `docs/handoff-new-agent-2026-03-21.md` Phase A updated (what’s automated vs manual).

## Test Plan

- [x] `pnpm test` passes including `repo-smoke-script.test.ts`.
- [x] `pnpm run smoke` passes locally.

## Files Changed

- `package.json` — `smoke` script.
- `docs/qa-manual-smoke-retail-promo.md` — manual checklist.
- `docs/deferred-features-registry.md` — Faza C, STORY-197, 93–97, Parked pointer.
- `docs/stories/TRACKER.md` — Pending (active) empty; Legacy aspirational table; next id **204**.
- `client/src/lib/product-index.test.ts` — perf budgets 3500ms / 1200ms.
- `client/src/lib/repo-smoke-script.test.ts` — guard `scripts.smoke`.
- `docs/handoff-new-agent-2026-03-21.md` — Phase A, health commands, Phase C, next id **204**.
- `.cursor/rules/guardian-agent.mdc` — §14.
- `docs/technical-status-guardian-review-2026-03-23.md` — §4.3, §4.5.
- `docs/search-rules-rag-roadmap.md` — link to deferred registry.

## Notes

- Browser automation (Playwright) remains **out of scope**; use manual QA doc + `pnpm run smoke`.
