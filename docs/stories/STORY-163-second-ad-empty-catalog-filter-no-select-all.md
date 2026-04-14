# STORY-163: Second Ad / Suggestion — Stop Legacy catalog_filter From Selecting Entire Catalog

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client)

## What

1. **Legacy `catalog_filter`** with **no** name/query, **no** category, and **`maxSelect === 0`** must **not** select **all** products (previously `nameToIndices('')` returned every index).
2. **`handleApplySuggestion`** must run **`resolveCatalogFilterActions`** (Meilisearch + `selectProducts`) like the main chat send path, not raw `applyAgentActions` on unresolved `query` actions.

## Why

Second-turn or “second advertise” flows could apply a **malformed or empty** `catalog_filter` or a **suggestion** that only had natural-language `query` in the JSON. The legacy path then treated “empty filter” as **match everything** → **6213** selected instead of the **~22** (or search-limited) set the user expected.

## Acceptance Criteria

- [x] Empty legacy filter (`nameContains`/`query`/`category` all empty, `maxSelect` 0) performs **no** selection change.
- [x] `maxSelect` with empty name still caps to first N (existing test).
- [x] Applying a **chat suggestion** that includes `catalog_filter` uses the same async resolution as `handleChatSend`.
- [x] `agent-actions` tests updated; suite passes.

## Test Plan

- [x] `pnpm vitest run client/src/lib/agent-actions.test.ts`

## Files Changed

- `client/src/lib/agent-actions.ts` — early `break` on empty filter; remove select-all fallback.
- `client/src/lib/agent-actions.test.ts` — empty filter no longer selects all.
- `client/src/components/AgentChat.tsx` — `handleApplySuggestion` awaits `resolveCatalogFilterActions`.

## Notes

To intentionally select **all** products, the agent should use an explicit **natural-language** `query` (e.g. per prompts) or a non-empty filter — not an empty payload.
