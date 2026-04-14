# STORY-175: Agent Workspace Brief (P4) — Persist + Merge

**Status:** ✅ Done
**Created:** 2026-03-20
**Package:** oraicle (client)

## What

Add a **workspace creative brief** textarea under **Settings → Agent**, persisted in `localStorage`, and **merged into the system prompt** for main chat and proactive suggestions (additive only — does not replace `AGENT_SYSTEM_PROMPT`).

## Why

P4 from `docs/left-panel-settings-roadmap.md`: power users can steer tone/brand without editing code; brief stays bounded and separate from safety rules.

## Acceptance Criteria

- [x] Settings → **Agent** shows brief textarea + save/clear + character limit.
- [x] Brief is capped (2000 chars), sanitized (no null bytes), stored browser-local.
- [x] `buildMessagesForApi` / `sendChatMessage` include merged brief in system content when non-empty.
- [x] `requestProactiveSuggestion` uses the same merge for the suggestion system prompt.
- [x] Unit tests: storage + merge + `buildMessagesForApi` with brief.

## Test Plan

- [x] `agent-brief-storage.test.ts`
- [x] `agent-chat-engine.test.ts` updated
- [x] `pnpm vitest run` on touched tests passes

## Files Changed

- `client/src/lib/agent-brief-storage.ts` — persist, sanitize, merge helper
- `client/src/lib/agent-brief-storage.test.ts` — new
- `client/src/lib/agent-chat-engine.ts` — `buildMessagesForApi` + send + proactive merge
- `client/src/lib/agent-chat-engine.test.ts` — brief cases
- `client/src/components/AgentBriefSection.tsx` — Settings → Agent UI
- `client/src/components/WorkspaceSettingsPanel.tsx` — embed Agent section
- `client/src/components/AgentChat.tsx` — pass `readAgentBrief()` into chat + suggestions

## Notes

- Do not expose raw brief in dev logs beyond existing message logging.
