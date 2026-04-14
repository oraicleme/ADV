# STORY-191: Agent Chat — Empty Actions DEV Logging + Session Telemetry

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (root)

## What

When the main chat LLM returns **no parsed actions**, distinguish **likely JSON truncation** (unbalanced braces / cut mid-response) from **informational or valid `actions: []`** so developers are not misled and session logs can summarize outcomes without PII.

## Why

STORY-189 switched misleading `console.warn` to `console.debug`, but truncation and “explain search only” still look similar without a cheap structural check. Retail Promo session logs already emit `ai_chat_message` with `actionsCount` — adding an optional **reason** when `actionsCount === 0` helps support and debugging.

## Acceptance Criteria

- [x] After `parseAgentResponse`, if `actions.length === 0`, classify **truncation suspected** vs **informational/valid empty** using a brace-balance heuristic on the raw model text (ignore misleading logs for valid empty JSON).
- [x] DEV: `truncation_suspected` → `console.warn` with short hint; otherwise `console.debug` (not noisy for normal informational turns).
- [x] `logRetailPromoEvent('ai_chat_message', …)` includes optional privacy-safe metadata when `actionsCount === 0` (e.g. reason enum), without raw model text.
- [x] Unit tests cover the classifier with balanced vs truncated JSON strings.
- [x] `pnpm test` and `pnpm exec vite build` pass; `TRACKER.md` and Guardian Section 14 updated when Done.

## Test Plan

- [x] Vitest: `classifyEmptyActionsLogReason` + `jsonBraceDepthOutsideStrings` with samples: complete JSON, truncated mid-array, plain prose, markdown fence.
- [x] (Session log shape is covered by existing `logRetailPromoEvent` contract + new payload field.)

## Files Changed

- `client/src/lib/agent-chat-engine.ts` — `classifyEmptyActionsLogReason`, `jsonBraceDepthOutsideStrings`, `AgentResponse.emptyActionsLogReason`, `sendChatMessage` DEV logs.
- `client/src/components/AgentChat.tsx` — `emptyActionsReason` on `ai_chat_message` when `actionsCount === 0`.
- `client/src/lib/agent-chat-engine.test.ts` — STORY-191 tests.
- `docs/stories/TRACKER.md`, `.cursor/rules/guardian-agent.mdc` Section 14.

## Notes

- Follow STORY-169: no user message text or raw LLM content in analytics payloads.
