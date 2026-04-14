# STORY-125: catalog_filter No-Match — Don’t Select All Products

**Status:** ✅ Done
**Created:** 2026-03-13
**Package:** client

## What

When the two-stage search (MiniSearch + LLM) finds no matching products for the user’s prompt, the UI was still showing a grid of products (e.g. first N in catalog order). The root cause: the action had only `query` and `_debugReason`, but the legacy path in `applyAgentActions` used only `nameContains`/`category`. With both empty, the legacy path treated it as “no filter” and selected all products, so the user always saw the same “wrong” articles regardless of prompt.

## Why

Users see “LLM found no matching products…” in chat but the product grid still shows 8/21 items (cables, adapters, etc.). That contradicts the message and makes the system look broken. When there is no match, selection must be cleared (0 products) and the legacy path must not treat “query-only” payloads as “select all”.

## Acceptance Criteria

- [x] When `catalog_filter` payload has `_debugReason` (no match from LLM or MiniSearch) and no `resolvedIndices`, selection is cleared (0 products).
- [x] Legacy path uses `payload.query` when `nameContains` is missing, and `payload.hintCategories?.[0]` when `category`/`categoryContains` are missing, so agent-sent payloads still run a real search instead of “all products”.

## Test Plan

- [x] Unit test: action with `_debugReason` and no `resolvedIndices` clears selection.
- [x] Unit test: action with only `query` (no `nameContains`) uses query for legacy search and selects matching products.

## Files Changed

- `client/src/lib/agent-actions.ts` — _debugReason branch clears selection; legacy path uses query/hintCategories when nameContains/category empty.
- `client/src/lib/agent-actions.test.ts` — describe for _debugReason no-match, describe for query fallback in legacy path.

## Notes

- STORY-122 and earlier fixed race conditions and bounds checks; this fixes the “always same articles” behaviour when the server explicitly reports no match.
- No change in AgentChat.tsx; the payload already contains `query` and `_debugReason`. The fix is entirely in how `applyAgentActions` interprets that payload.
