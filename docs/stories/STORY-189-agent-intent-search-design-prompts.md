# STORY-189: Agent Intent — Search vs Canvas vs “Make an Ad” + Predefined Prompts

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (root)

## What

Improve how the **Retail Promo chat agent** interprets user intent so it reliably separates:

1. **Search / catalog** — tuning or explaining *how* to find products (workspace search sliders, `catalog_filter`, category hints) *without* dumping internal JSON or redesigning the ad unless the user asks.
2. **Canvas / basic design** — headline, layout, palette, grid, footer-visible tweaks that affect the **preview/export** (existing `block_patch`, `layout_change`, `style_change`, etc.).
3. **“Give me an ad” / holistic creative** — full campaign-style updates (selection + many canvas actions) when the user clearly wants a **finished-looking** creative, aligned with patterns used by large consumer design tools (clear modes, short suggested prompts, no mixed developer docs in user-facing copy).

Optional but in scope: **predefined quick prompts** (chips, starter actions, or a small “intent picker”) so users and the model share the same vocabulary — industry-standard UX similar to suggested prompts in ChatGPT, Copilot chat starters, or Canva’s “Try: …” patterns — without turning the chat into a settings manual.

## Why

Field observation (see `docs/handoff-new-agent-2026-03-21.md` and recent session logs): the same system prompt mixes **creative director** instructions, **catalog_filter** API details, and **first-turn selection** rules. Users asking to “improve search” or “explain how it works” sometimes get long **internal JSON** in `message`, while vague “improve this” turns can trigger a **full ad + catalog_filter** when the user meant something narrower. Tighter **intent routing** and optional **predefined prompts** reduce confusion and match how “giants” scope assistant behavior.

## Acceptance Criteria

- [x] **System prompt** (or a clearly scoped additive module merged into `buildMessagesForApi`) defines explicit **intent rules**: when to prioritize search-only explanation, canvas-only design, vs full “campaign” responses; when **not** to paste `catalog_filter` JSON for end users; when **zero actions** is correct (informational-only turns).
- [x] **Holistic vs targeted** requests are disambiguated in prompt text (e.g. “adjust headline only” vs “full reklama”) so the model does not apply 10+ actions for narrow asks or output empty actions for holistic asks without justification.
- [x] **Predefined prompts** (minimum viable): at least **one** UI surface in the Retail Promo chat (e.g. chip row or dropdown) with **≥3** distinct starter strings covering **search**, **canvas/design**, and **make an ad** — labels can be HR/EN per existing i18n patterns; selecting one **inserts or sends** text the agent is trained to understand.
- [x] **Regression tests** cover prompt construction or intent helper logic (Vitest): e.g. merged system prompt contains new intent section; optional: snapshot or substring tests for predefined labels (avoid brittle full-prompt snapshots).
- [x] `pnpm test` and `pnpm exec vite build` pass; update `docs/stories/TRACKER.md` when moving to Done.

## Test Plan

- [x] Unit test(s) for new intent / prompt helper(s) or merged system content (if extracted for testability).
- [x] Component or smoke test if UI chips are added (e.g. render + click inserts expected string).
- [x] Manual: open `/agents/retail-promo`, use each predefined prompt, confirm agent response style matches intent (search vs design vs full ad) without internal JSON in user message for search-only starters.

## Files Changed (expected)

- `client/src/lib/agent-chat-engine.ts` — `AGENT_INTENT_ROUTING_PROMPT`, `AGENT_MAIN_CHAT_SYSTEM_PROMPT`, merged in `buildMessagesForApi`; PROACTIVE line clarified; `console.debug` when no actions.
- `client/src/lib/agent-chat-starters.ts` — `RETAIL_PROMO_CHAT_STARTERS` (4 starters: search, design, full ad, EN search).
- `client/src/components/AgentChatPanel.tsx` — optional `starterPrompts`; empty-state chips.
- `client/src/components/AdCanvasEditor.tsx`, `AgentChat.tsx` — pass retail starters.
- `client/src/components/PromptInspectorSection.tsx` — `AGENT_MAIN_CHAT_SYSTEM_PROMPT` for copy.
- `client/src/lib/agent-chat-engine.test.ts`, `agent-chat-starters.test.ts`, `AgentChatPanel.starters.test.ts`.
- `docs/stories/TRACKER.md` — STORY-189 Done; next id **191**.

## Notes

- **Industry reference (non-prescriptive):** “Giants” often use **scoped modes** (Chat), **suggested prompts** (short, action-oriented), and **separation of system vs user-facing copy** — adapt to this codebase (single agent, JSON actions) without adding a second LLM unless justified in a follow-up story.
- **DEV logging:** Empty `actions` in dev now logs at **`console.debug`** (not `warn`) to avoid implying failure on informational turns.
- **i18n:** Starter chip labels use Croatian/English mix consistent with the rest of the panel.

## Prompt for the next agent

_(none — story complete.)_
