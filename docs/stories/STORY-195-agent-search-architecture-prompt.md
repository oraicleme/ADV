# STORY-195: Agent — Grounded Search Architecture Explanation

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client)

## What

Add an authoritative **SEARCH ARCHITECTURE** block to the main chat system prompt so the agent can explain how product search and AI selection work (manual MiniSearch + settings vs Meilisearch + LLM rerank) without inventing stack details. Relax STORY-189 intent (A) slightly so structured technical answers are allowed when the user asks for consulting depth.

## Why

Merchants and partners need accurate explanations to tune data and settings; the previous prompt discouraged “internal” detail and the model often hallucinated generic stacks (e.g. “React → API” without matching this app).

## Acceptance Criteria

- [x] System prompt includes `AGENT_SEARCH_ARCHITECTURE_PROMPT` merged into `AGENT_MAIN_CHAT_SYSTEM_PROMPT`.
- [x] Intent routing (A) references SEARCH ARCHITECTURE and allows numbered pipeline explanations without raw JSON payloads.
- [x] Vitest asserts the system message contains key grounded terms.

## Test Plan

- [x] `pnpm vitest run client/src/lib/agent-chat-engine.test.ts` — STORY-195 test case.

## Files Changed

- `client/src/lib/agent-chat-engine.ts` — `AGENT_SEARCH_ARCHITECTURE_PROMPT`, intent (A) tweak, prompt merge.
- `client/src/lib/agent-chat-engine.test.ts` — STORY-195 assertion.

## Notes

- Prompt Inspector shows the merged prompt automatically (uses `AGENT_MAIN_CHAT_SYSTEM_PROMPT`).
