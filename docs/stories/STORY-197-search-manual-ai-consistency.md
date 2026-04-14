# STORY-197: Search — Manual vs AI Consistency

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client + server)

## What

Smanjiti **divergenciju rezultata** između ručne pretrage (MiniSearch + min-score + vokabular na klijentu) i AI `catalog_filter` toka (Meilisearch + LLM): zajednička **normalizacija upita**, dijeljenje gdje je moguće, te dizajn odluke za **opciju** da se ručna lista u određenim uvjetima oslanja na isti Meilisearch endpoint kao agent.

## Why

Dva odvojena mehanizma mogu dati različite skupove za isti tekst upita; korisničko iskustvo i povjerenje zahtijevaju predvidljivost.

## Acceptance Criteria

- [x] Dokumentirana matrica razlika (tokenizacija, pragovi, embedder) i ciljano ponašanje nakon promjene.
- [x] Implementacija najmanje jednog konkretnog usklađivanja (npr. zajednička `normalizeSearchQuery` funkcija korištena u oba toka) **ili** eksplicitno odbijanje server-backed ručne pretrage s obrazloženjem.
- [x] Ako se uvodi server-backed ručna pretraga: jasni uvjeti (Meilisearch dostupan, veličina kataloga, latencija) i fallback na MiniSearch. *(Odbijeno za ovu iteraciju — dokumentirano u `search-architecture-technical-hr.md`; ručna lista ostaje MiniSearch.)*

## Test Plan

- [x] Testovi za normalizaciju / paritet gdje je primjenjivo.
- [x] Ručno: usporediti isti upit ručno vs agent na istom katalogu (očekivanja definirana u priči).

## Files Changed

- `client/src/lib/normalize-search-query.ts` — `normalizeSearchQueryForPipeline` (NFC, ZW strip, collapse spaces).
- `client/src/lib/normalize-search-query.test.ts`
- `client/src/lib/product-index.ts`, `product-search-min-score.ts`, `product-selection-panel-filters.ts`, `select-products-query-expansion.ts`, `select-products-query-expansion.test.ts`
- `client/src/lib/apply-search-rules.ts`, `search-rules-storage.ts` — rule / pattern match uses same pipeline norm + lowercase
- `client/src/components/AgentChat.tsx`, `ProductDataInput.tsx`
- `docs/search-architecture-technical-hr.md` — matrica + odluka o server-backed ručnoj pretrazi

## Notes

- Vidi `docs/search-improvements-roadmap.md` Faza 2.
