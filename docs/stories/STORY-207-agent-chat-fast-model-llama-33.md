# STORY-207: Agent chat — Llama-3.3-70B umjesto gpt-oss-20b (io.net)

**Status:** ✅ Done
**Created:** 2026-03-24
**Package:** client

## What

Zamjena `openai/gpt-oss-20b` s `meta-llama/Llama-3.3-70B-Instruct` u presetima agent chata (`CHAT_MODEL_PAIR_BY_MODE`: fast primary i smart fallback), isti io.net `chatCompletion` poziv kao dosad.

## Why

Korisnik želi jači model u agentu na io.net API-ju umjesto gpt-oss-20b.

## Acceptance Criteria

- [x] Fast preset koristi Llama-3.3-70B-Instruct kao primary (umjesto gpt-oss-20b).
- [x] Smart preset koristi Llama-3.3-70B-Instruct kao fallback kad primary nije dostupan.
- [x] Test potvrđuje ID-jeve modela.

## Test Plan

- [x] `pnpm vitest run client/src/lib/agent-chat-engine.test.ts client/src/lib/ionet-model-preferences-storage.test.ts`

## Files Changed

- `client/src/lib/agent-chat-engine.ts` — `CHAT_MODEL_PAIR_BY_MODE`
- `client/src/lib/agent-chat-engine.test.ts` — assert na Llama-3.3-70B

## Notes

Model ID: `meta-llama/Llama-3.3-70B-Instruct` (usklađeno s `ionet-models.ts` i server agentima).
