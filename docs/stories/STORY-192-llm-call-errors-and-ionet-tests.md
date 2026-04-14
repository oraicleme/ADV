# STORY-192: LLM Call Errors (io.net) + Test / Report Strategy

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (root)

## What

Introduce a **small, provider-aware error model** (`LlmCallError` + `formatLlmCallErrorReport`) so failures from chat/listModels identify **provider**, **call kind**, **model id** (when relevant), and **HTTP status** — ready for **non–io.net backends** later without rewriting call sites.

Harden **io.net client tests**: **unit tests** mock `fetch` (no network in `pnpm test`); **live tests** stay in `*.integration.test.ts` with documented timeouts and clearer failure output.

## Why

Live `fetch` in `ionet-api.test.ts` caused flaky CI/timeouts; engineers need a **single report string** to see whether the failure is list vs chat, which model, and HTTP layer vs parse vs timeout.

## Acceptance Criteria

- [x] `client/src/lib/llm-call-error.ts` — `LlmCallError`, `isLlmCallError`, `formatLlmCallErrorReport`; extensible `LlmProviderId` (start with `io.net`).
- [x] `ionet-client.ts` throws `LlmCallError` for list/chat failures (HTTP, timeout, JSON parse).
- [x] `ionet-client.test.ts` — mocked `fetch` covers success, 401/500, timeout, invalid JSON (no real network).
- [x] `ionet-api.test.ts` — env-only (no live `fetch` in default `pnpm test`); integration file remains the network gate.
- [x] `vitest.integration.config.ts` — `testTimeout: 45_000`; `package.json` script `test:integration:client-ionet`.
- [x] Settings model list + `sendChatMessage` use `formatLlmCallErrorReport` for user/DEV-facing messages.
- [x] `pnpm test` + `pnpm exec vite build` pass; tracker + Guardian sync.

## Test Plan

- [x] Vitest: `llm-call-error.test.ts`, `ionet-client.test.ts` (mocked `fetch`).
- [x] Integration tests updated for `LlmCallError` assertions (tests 8–9).

## Files Changed

- `client/src/lib/llm-call-error.ts`, `llm-call-error.test.ts`
- `client/src/lib/ionet-client.ts`, `ionet-client.test.ts`
- `client/src/lib/ionet-api.test.ts`, `ionet-api.integration.test.ts`
- `vitest.integration.config.ts`, `package.json`
- `client/src/components/IonetModelsSettingsSection.tsx`, `client/src/lib/agent-chat-engine.ts`
- `docs/stories/TRACKER.md`, `.cursor/rules/guardian-agent.mdc`

## Notes

- Server `server/_core/llm.ts` can adopt the same error shape in a follow-up story.
