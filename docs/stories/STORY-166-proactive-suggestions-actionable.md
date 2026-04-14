# STORY-166: Proactive Suggestions — Actionable, Multi-Page Aligned, Roadmap

**Status:** ✅ Done  
**Created:** 2026-03-19  
**Package:** oraicle (client)

## What

Make proactive AI suggestions **actually helpful**: every shown suggestion must have **Apply-able** actions; align the LLM with **multi-page** product grids (no bogus “show fewer products” advice); replace stacked suggestion bubbles with **one** current tip; **undo** after Apply like the main chat.

## Why

Users saw suggestion text like “reduce to 9 products” with **Apply** that either did nothing (no parsed actions) or conflicted with **STORY-127/161** paging rules — frustrating and not guardian-friendly. This story defines a **product roadmap** and ships the first concrete guardrails.

## Acceptance Criteria

- [x] Non-empty suggestion **must** include ≥1 valid action; message-only responses are discarded before UI.
- [x] Suggestion system prompt forbids “cap products / maxProducts for clarity” and explains portrait grid capacity using `productBlockOptions.columns`.
- [x] Only **one** proactive suggestion message at a time (new replaces previous).
- [x] **Apply** on a suggestion sets **undo snapshot** before applying (same idea as main chat).
- [x] **Apply** is only shown when there is at least one action; **Dismiss** remains for actionable tips.
- [x] Tests cover normalization + prompt invariants; `pnpm test` passes for touched files.

## Test Plan

- [x] `requestProactiveSuggestion` drops message-without-actions; fallback label when actions-only.
- [x] Source invariants: multi-page / no-maxProducts-cap guardrails in suggestion prompt.
- [x] Run `pnpm exec vitest run client/src/lib/agent-chat-engine.test.ts`.

## Files Changed

- `docs/proactive-suggestions-roadmap.md` — roadmap (phases A–D).
- `docs/stories/STORY-166-proactive-suggestions-actionable.md` — this story.
- `client/src/lib/agent-chat-engine.ts` — `SUGGESTION_SYSTEM_PROMPT` + internal `normalizeProactiveSuggestionResponse` in `requestProactiveSuggestion`.
- `client/src/lib/agent-chat-engine.test.ts` — suggestion invariants + API tests.
- `client/src/components/AgentChat.tsx` — `buildCanvasUndoSnapshot`, suggestion apply undo + `flushSync`, single suggestion slot.
- `client/src/components/AgentChatPanel.tsx` — Apply only when actions exist.
- `docs/stories/TRACKER.md` — STORY-166 done, next **167**.

## Notes

Future phases (see roadmap): frequency caps per session, suggestion categories, telemetry, optional server-side validation of actions.
