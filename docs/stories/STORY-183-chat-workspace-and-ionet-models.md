# STORY-183: Chat workspace tools + io.net model picker + prompt inspector in Settings

**Status:** ✅ Done
**Created:** 2026-03-21
**Package:** oraicle-retail-promo (client)

## What

Bring **Search**, **Agent brief**, and **API key** controls into the **main Chat** panel (collapsible “Workspace tools”) so users do not need a second context for catalog search tuning. In **Workspace Settings**, add **Models** (full io.net model list from the API, with recommended defaults) and **Prompts** (read-only merged system prompts for power users to copy). Support **Custom** chat model pair persisted in the browser.

## Why

Power users want search management next to the assistant; beginners should still use Settings for deep configuration. Exposing prompts and all API models supports self-hosting instructions and external AI tooling.

## Acceptance Criteria

- [x] Chat tab includes a collapsible **Workspace tools** block with Search thresholds, Agent brief, and BYOK key (same components as Settings where applicable).
- [x] Link/buttons jump to full **Settings** for Import, Design defaults, Models, and Prompts.
- [x] New Settings section **Models**: fetch io.net `/models` with resolved API key; user picks primary + fallback; show recommended labels (Fast/Smart/Vision/Generate defaults).
- [x] New Settings section **Prompts**: show merged main-chat system prompt (with current brief) and proactive suggestion prompt; copy buttons.
- [x] Chat header: **Fast / Smart / Custom**; Custom uses stored pair; defaults documented in UI.
- [x] Tests for model preference storage and `sendChatMessage` receives `modelPair` from `resolveModelPairForMode`.

## Test Plan

- [x] `pnpm exec vitest run client/src/lib/ionet-model-preferences-storage.test.ts client/src/lib/workspace-settings-sections.test.ts client/src/lib/agent-chat-engine.test.ts`

## Files Changed

- `client/src/lib/agent-chat-engine.ts` — `ChatModelMode` + `custom`, `modelPair` on send/ proactive, export `CHAT_MODEL_PAIR_BY_MODE`, `PROACTIVE_SUGGESTION_SYSTEM_PROMPT`
- `client/src/lib/ionet-model-preferences-storage.ts` — persist custom pair + chat mode
- `client/src/lib/workspace-settings-sections.ts` — `models`, `prompts`
- `client/src/components/ChatWorkspaceTools.tsx` — collapsible workspace in chat
- `client/src/components/IonetModelsSettingsSection.tsx` — Settings → Models
- `client/src/components/PromptInspectorSection.tsx` — Settings → Prompts
- `client/src/components/WorkspaceSettingsPanel.tsx` — wire sections
- `client/src/components/AdCanvasEditor.tsx` — `showChatWorkspaceTools`, layout
- `client/src/components/AgentChatPanel.tsx` — Custom model button
- `client/src/components/AgentChat.tsx` — `modelPair`, `handleChatModelChange`, workspace tools
- `client/src/lib/ionet-model-preferences-storage.test.ts` — new
- `client/src/lib/workspace-settings-sections.test.ts` — section count

## Notes

- `listModels` requires a valid key; show a clear message if missing.
- Do not log API keys.
