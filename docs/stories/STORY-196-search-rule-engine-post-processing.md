# STORY-196: Search Rule Engine — Post-Processing (Exclude / Downrank)

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client + optional server)

## What

Uvesti **strukturirani sloj pravila** koji nakon pretrage (MiniSearch ili Meilisearch kandidati) **uklanja ili snižava prioritet** određenih proizvoda prema uzorku upita ili identifikatoru proizvoda — npr. „za ovaj upit sakrij SKU X“, „ovaj SKU je suvišan za upit Y“.

## Why

Bez perzistentnih pravila korisnik ne može izraziti poslovnu logiku koja odstupa od čistog tekstualnog matcha; izvještaj identificira ovaj nedostatak kao prioritet.

## Acceptance Criteria

- [x] Definiran model podataka za pravilo (npr. `queryPattern` ili hash upita, `productId`/`sku`/`index`, `action`: `exclude` | `downrank`).
- [x] Primjena na **ručnu** pretragu (nakon `filterCatalogBySearchQuery` ili ekvivalent).
- [x] Primjena na **agent** tok (nakon Stage-1 kandidata, prije ili u kombinaciji s `selectProducts`).
- [x] Perzistencija (MVP: `localStorage`; opcija: kasnije server/tenant).
- [x] Testovi za čisto funkcije (bez obveznog E2E u prvoj iteraciji ako je UI odvojen).

## Test Plan

- [x] Unit testovi za primjenu pravila na fiksni skup kandidata.
- [x] Ručno: dodati pravilo → isti upit → očekivano ponašanje. (Settings → Search → Search rules)

## Files Changed

- `client/src/lib/search-rules-storage.ts` — localStorage, `addSearchRule` / `removeSearchRule`, `SEARCH_RULES_CHANGED_EVENT` (max 50).
- `client/src/lib/apply-search-rules.ts` — `applySearchRulesToIndices`, `applySearchRulesToStage1Hits` (exact normalized query match).
- `client/src/lib/apply-search-rules.test.ts`, `client/src/lib/search-rules-storage.test.ts`, `product-selection-panel-filters.test.ts` (STORY-196 case).
- `client/src/lib/product-selection-panel-filters.ts` — `filterCatalogBySearchQuery` post-process.
- `client/src/components/ProductDataInput.tsx` — rules after MiniSearch indices + epoch on `SEARCH_RULES_CHANGED_EVENT`.
- `client/src/components/AgentChat.tsx` — Stage-1 hits after `applySearchRulesToStage1Hits`.
- `client/src/components/SearchSettingsSection.tsx` — minimal rules UI (query, SKU/name, exclude/downrank).

## Notes

- Vidi `docs/search-improvements-roadmap.md` Faza 1. Dugoročni RAG nad pravilima: STORY-201.
