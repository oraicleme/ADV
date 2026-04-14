# STORY-169: Proactive Suggestions — Session Mute + Privacy-Safe Analytics

**Status:** ✅ Done  
**Created:** 2026-03-19  
**Package:** oraicle (client)

## What

- **Session mute:** pause proactive suggestion API calls until the user resumes or full page reload (in-memory state).
- **Analytics:** `logRetailPromoEvent` types for `suggestion_shown`, `suggestion_apply`, `suggestion_dismiss`, `suggestion_skipped_dedup`, `suggestion_api_error`, `proactive_suggestions_session_mute` with **hashed** tip key (no raw copy in logs).

## Why

Industry roadmap pillars A2 + D1 — user control without losing the main “Suggestions” toggle semantics; measure funnel without PII.

## Acceptance Criteria

- [x] Session mute blocks proactive `requestProactiveSuggestion` only; chat send unchanged.
- [x] Header control to mute / resume for this session (clear on full reload).
- [x] Events logged with `tipKeyHash` (8 hex) from normalized suggestion text, plus `actionsCount` where relevant.
- [x] Tests: hash stability, log types, vitest green.

## Test Plan

- [x] `proactive-suggestion-dedup.test.ts` — `hashProactiveSuggestionTipForAnalytics`
- [x] `retail-promo-log.test.ts` — new event types
- [x] `pnpm exec vitest run` on touched test files

## Files Changed

- `client/src/lib/retail-promo-log.ts`, `retail-promo-log.test.ts`
- `client/src/lib/proactive-suggestion-dedup.ts`, `proactive-suggestion-dedup.test.ts`
- `client/src/components/AgentChat.tsx`, `AgentChatPanel.tsx`, `AdCanvasEditor.tsx`
- `docs/proactive-suggestions-industry-standard-roadmap.md` — A2/D1 pointers
- `docs/stories/TRACKER.md` — next **170**
