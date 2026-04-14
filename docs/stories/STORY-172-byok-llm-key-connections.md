# STORY-172: BYOK — LLM API Key in Connections

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle (client)

## What

- `llm-api-key-storage.ts`: user key in `localStorage` (key `oraicle-retail-promo-ionet-api-key-v1`), `getResolvedLlmApiKey()` prefers user over env (`VITE_IONET_API_KEY` chain).
- `ConnectionsByokSection`: form under Workspace Settings → Connections (save, clear, show/hide, security copy).
- `AgentChat`: all LLM paths use `getResolvedLlmApiKey()`; `LLM_API_KEY_CHANGED_EVENT` bumps proactive suggestion effect.

## Why

[`left-panel-settings-roadmap.md`](../left-panel-settings-roadmap.md) P1 — users configure API without editing `.env` on every machine.

## Acceptance Criteria

- [x] Saved key overrides env; clear removes override.
- [x] Chat error points to Settings → Connections or env.
- [x] Tests for storage roundtrip.

## Test Plan

- [x] `pnpm exec vitest run client/src/lib/llm-api-key-storage.test.ts`

## Files Changed

- `client/src/lib/llm-api-key-storage.ts`, `llm-api-key-storage.test.ts`
- `client/src/components/ConnectionsByokSection.tsx`
- `client/src/components/WorkspaceSettingsPanel.tsx`
- `client/src/components/AgentChat.tsx`
- `docs/left-panel-settings-roadmap.md`
- `docs/stories/TRACKER.md`
