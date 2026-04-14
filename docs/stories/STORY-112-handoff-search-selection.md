# STORY-112: Handoff — Search & Selection (0 of 6213 selected)

**Status:** ✅ Done
**Created:** 2026-03-11
**Package:** oraicle (client)

## What
Verify and fix the flow that leads to "0 of 6213 selected for ad" when the user requests e.g. "Brzi USB-C punjači za aut": ensure catalog_filter is applied with correct data, catalogSummary is sent to the LLM, and add diagnostics + unit test.

## Why
Users see a headline about USB-C car chargers but no products selected; manual search and agent-driven catalog_filter should both surface the right products.

## Acceptance Criteria
- [x] Data flow verified: applyAgentActions receives allProducts and setSelectedProductIndices where catalog_filter is used (AgentChat.tsx ~956–978, ~1037–1057)
- [x] catalogSummary (categories + sampleNames) built from products and included in state sent to LLM (useMemo from products → canvasState → serializeCanvasState → meta.catalogSummary)
- [x] Dev-only logging when parsed actions contain catalog_filter (payload visible for debugging)
- [x] Manual search "Search by name or code..." uses same filterProductsIntelligent as catalog_filter (ProductDataInput.tsx visibleIndices)
- [x] Unit test: catalog_filter with category "Punjači za auto" + nameContains "USB-C" yields non-empty selection

## Test Plan
- [x] Run agent-actions tests; new test for Punjači za auto + USB-C passes
- [ ] Load catalog with chargers; send "daj mi reklamu za brze USB-C punjače za auto" → expect >0 selected (manual if needed)
- [ ] In dev, confirm console shows catalog_filter payload when agent returns it

## Files Changed
- `client/src/lib/agent-chat-engine.ts` — log catalog_filter in parsed actions (dev)
- `client/src/lib/agent-actions.test.ts` — test catalog_filter Punjači za auto + USB-C (STORY-112)
- `docs/catalog-filter-zero-selection-debug.md` — checklist for future debugging
- `docs/stories/STORY-112-handoff-search-selection.md` — this story
- `docs/stories/TRACKER.md` — STORY-112 in progress, next # 113

## Notes
Handoff from docs/agent-handoff-prompt-search-selection.md. Diakritici and relevance (STORY-111) already done; this story is verification + test + docs.
