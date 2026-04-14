# STORY-167: Proactive Suggestions — Phase B (Dedup + Cooldown)

**Status:** ✅ Done  
**Created:** 2026-03-19  
**Package:** oraicle (client)

## What

Phase B of [proactive-suggestions-roadmap.md](../proactive-suggestions-roadmap.md): **deduplicate** suggestion text against recent dismiss/apply, and use a **longer minimum interval** between suggestion API calls while the canvas was **recently edited** (activity-aware cooldown).

## Why

Users could see the same tip again after dismissing it, or get suggestion pings too soon while still adjusting the canvas.

## Acceptance Criteria

- [x] Normalized suggestion text is compared against a rolling list of **recently dismissed/applied** keys; duplicates are not shown.
- [x] After recent canvas activity (within a defined window), **min interval** between suggestion requests is higher than the baseline; baseline remains for idle canvases.
- [x] Unit tests cover dedup key normalization and skip logic.
- [x] `pnpm exec vitest run` passes for new + affected tests.

## Test Plan

- [x] `proactive-suggestion-dedup.test.ts` — key normalization, skip when in recent list, `rememberDismissedSuggestionKey` cap.
- [x] Run `pnpm exec vitest run client/src/lib/proactive-suggestion-dedup.test.ts`.

## Files Changed

- `client/src/lib/proactive-suggestion-dedup.ts` — keys, rolling list, exported constants.
- `client/src/lib/proactive-suggestion-dedup.test.ts`
- `client/src/components/AgentChat.tsx` — refs, debounce/min-gap, dismiss/apply remember.
- `docs/proactive-suggestions-roadmap.md` — Phase B marked shipped.
- `docs/stories/TRACKER.md` — next story **168**.

## Notes

Constants are centralized in `proactive-suggestion-dedup.ts` for one place to tune Phase B behavior.
