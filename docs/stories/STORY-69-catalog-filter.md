# STORY-69: Catalog Filter for Product Search

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Filters the full product catalog and updates selectedProductIndices. Catalog summary sent to the AI on every message so it can answer product queries. Includes full catalog metadata for search/filter operations.

## Files Changed
- `client/src/lib/agent-actions.ts` — catalog_filter action type, allProducts field
- `client/src/lib/agent-actions.test.ts` — catalog_filter tests
- `client/src/lib/ad-canvas-ai.ts` — catalogSummary in serialization
- `client/src/lib/ad-canvas-ai.test.ts` — catalogSummary tests
- `client/src/components/AgentChat.tsx` — catalog summary computation
