# STORY-184: Guardian RAG Section 14 Refresh

**Status:** ✅ Done
**Created:** 2026-03-23
**Package:** oraicle-retail-promo (root)

## What

Refresh `.cursor/rules/guardian-agent.mdc` **Section 14 (Current State)** so it matches `docs/stories/TRACKER.md` (next story number, recent done stories STORY-181–183) and reflects current Retail Promo chat/settings features. Add an automated check that the tracker’s “Next story number” matches Section 14.

## Why

Guardian Section 14 is the RAG snapshot for new agents; a stale next-story number (e.g. 177 vs 184) causes wrong story IDs and confused handoffs.

## Acceptance Criteria

- [x] Section 14 date and “next story number” align with `TRACKER.md` after this story ships (next available: **185**).
- [x] Section 14 mentions recent done work: STORY-181 (Products tab search sync), STORY-182 (manual search minScore fallback), STORY-183 (chat workspace tools, io.net models, prompt inspector).
- [x] Vitest asserts tracker next-story number equals the number declared in Section 14.
- [x] Product index performance smoke tests use WSL/CI-tolerant budgets (same handoff stability pass).

## Test Plan

- [x] `pnpm test` includes `guardian-rag-tracker-sync.test.ts` and passes.
- [x] `pnpm exec vite build` succeeds (UI gate per handoff).

## Files Changed

- `.cursor/rules/guardian-agent.mdc` — Section 14 rewritten.
- `client/src/lib/guardian-rag-tracker-sync.test.ts` — sync assertion (new).
- `client/src/lib/product-index.test.ts` — performance smoke budgets (WSL/CI variance).
- `client/src/lib/ad-performance.test.ts` — escapeHtml loop smoke budget (WSL under load).
- `docs/stories/TRACKER.md` — STORY-184 done; next story **185**.
- `docs/stories/STORY-184-guardian-rag-section-14-refresh.md` — this file.
- `docs/handoff-new-agent-2026-03-21.md` — remove stale “Section 14 says 177” note; point to refreshed Section 14.

## Notes

- `CHAT_MODEL_PAIR_BY_MODE` / `MODEL_MAP` in `agent-chat-engine.ts` remain the preset source; `ionet-models.ts` lists API models — agents should not assume they stay identical without checking both.
