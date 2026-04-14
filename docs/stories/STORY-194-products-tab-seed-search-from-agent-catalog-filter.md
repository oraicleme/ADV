# STORY-194: Products Tab — Seed Search From Last Agent `catalog_filter`

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client)

## What

When the user opens the bottom **Products** tab, the catalog search field is filled with the **last successful agent `catalog_filter` query** (`query` or legacy `nameContains`), so they can refine the same search manually.

## Why

After the agent filters products in chat, users often open Products to review or tweak selection; mirroring the agent’s query avoids retyping and keeps Add Products / Products search aligned with what the agent used (STORY-181 shared search).

## Acceptance Criteria

- [x] After a chat turn applies `catalog_filter` with a non-empty `query` or `nameContains`, switching to the Products tab copies that text into the shared catalog search box.
- [x] Proactive suggestion apply with `catalog_filter` updates the same “last query” source.
- [x] Stale / superseded chat responses do not update the stored query.
- [x] Pure helper `extractLastCatalogFilterQueryText` is unit-tested.

## Test Plan

- [x] `pnpm vitest run client/src/lib/agent-actions.test.ts` — `extractLastCatalogFilterQueryText` cases.
- [x] Manual: agent selects products via natural-language filter → Products tab → search matches agent query.

## Files Changed

- `client/src/lib/agent-actions.ts` — `extractLastCatalogFilterQueryText()`
- `client/src/lib/agent-actions.test.ts` — tests for STORY-194
- `client/src/components/AgentChat.tsx` — track last query; pass to canvas
- `client/src/components/AdCanvasEditor.tsx` — seed search on Products tab open

## Notes

- Uses **raw** actions from the model (before async resolve strips `query` from resolved payloads).
