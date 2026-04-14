# STORY-198: Search — LLM Query Expansion Before Meilisearch Stage-1

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (server + client)

## What

Opcionalno **proširiti prirodnojezični upit** prije Meilisearch Stage-1 (sinonimi, parafraze, dodatni podupiti) kako bi se povećao **recall** kada jedan literalni upit ne pokriva kataloški vokabular.

## Why

Ako Stage-1 ne vrati relevantne kandidate, LLM rerank ne može „stvoriti“ proizvode; proširenje upita adresira slabost iz izvještaja.

## Acceptance Criteria

- [x] Dizajn: kada se expansion poziva (samo agent? cache? limit tokena?). **Agent `catalog_filter` only;** server + `STAGE1_QUERY_EXPANSION=1` + client `VITE_STAGE1_QUERY_EXPANSION=1`; `max_tokens` 200; max 2 phrases; cache nije u MVP-u (moguće kasnije).
- [x] Sigurnost: bez curenja PII; ograničen budžet poziva. **Prompt zabranjuje PII;** samo uzorci naziva proizvoda kao vokabular; poziv samo kad su oba flaga uključena.
- [x] Integracija s postojećim `buildExpandedSearchQueries` / ne zamjenjuje ga naslijepo — jasna uloga svakog sloja. **`mergeStage1Subqueries`:** LLM prvo, zatim deterministički; ukupno do 8 podupita.
- [x] Metrika: prije/poslije broj kandidata ili recall na fiksnom test skupu (ako postoji). **`console.info`** u `AgentChat` kada LLM vrati prijedloge.

## Test Plan

- [x] Unit / integration testovi za čisto proširenje stringa ili mock LLM odgovora.
- [x] Ručno: upit s niskim recallom prije/poslije. (Uključiti oba env flaga + LLM ključ.)

## Files Changed

- `server/_core/env.ts` — `stage1QueryExpansionEnabled`
- `server/lib/expand-search-query-stage1.ts`, `expand-search-query-stage1.test.ts`
- `server/routers/catalog.ts` — `expandSearchQueryStage1` mutation
- `client/src/lib/stage1-query-expansion.ts`, `stage1-query-expansion.test.ts`
- `client/src/components/AgentChat.tsx` — merge prije Meilisearch podupita
- `client/src/lib/agent-chat-engine.ts` — `AGENT_SEARCH_ARCHITECTURE_PROMPT` (jedna rečenica)
- `docs/search-architecture-technical-hr.md`

## Notes

- Ovisi o trošku LLM-a; može biti iza feature flaga. Vidi roadmap Faza 3.
