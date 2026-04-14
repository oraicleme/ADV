# STORY-202: VC Doc + Dev Session Note — Search Stack Sync

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (docs)

## What

Refresh **`docs/system-overview-vc.md`** so the investor-facing overview matches the current search stack (through **STORY-201**): post-processing rules, optional RAG-lite, feedback loop, and where to read more. Add an explicit **dev session / auth** note to **`docs/handoff-new-agent-2026-03-21.md`** (Phase A stability).

## Why

Due diligence and onboarding agents should not see an outdated “search = MiniSearch + Meilisearch only” picture; Phase A also asks to document that missing session cookies in dev are expected.

## Acceptance Criteria

- [x] `docs/system-overview-vc.md` summarizes search rules + optional similar-query (RAG-lite) and points to architecture/roadmap docs.
- [x] `docs/handoff-new-agent-2026-03-21.md` states clearly that **`[Auth] Missing session cookie`** in dev without login is normal for demos.
- [x] A Vitest file asserts key phrases remain in `system-overview-vc.md` so the VC doc cannot silently drift.

## Test Plan

- [x] `pnpm test` includes `vc-system-overview-doc.test.ts` and passes.

## Files Changed

- `docs/system-overview-vc.md` — architecture table, roadmap §5 search bullet, key file map, version 2.1.
- `docs/handoff-new-agent-2026-03-21.md` — next id **203**, **Dev session / auth** subsection.
- `client/src/lib/vc-system-overview-doc.test.ts` — regression guard on VC doc.
- `docs/stories/TRACKER.md` — STORY-202 done, next id 203.
- `.cursor/rules/guardian-agent.mdc` — §14 snapshot.

## Notes

- Full technical detail stays in `docs/search-architecture-technical-hr.md` and `docs/search-rules-rag-roadmap.md`.
