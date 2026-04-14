# STORY-134: Katalogom vođen vokabular pretrage (modul)

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client

## What

Poseban modul koji **iz kataloga proizvoda** (lista za obradu) izvlači pravila pretrage: space-compounds i grupe sinonima. Cilj je da pretraga radi kako treba na osnovu proizvoda koje imamo, bez ručnog dodavanja primjer po primjer (play station, joystick, …).

## Why

- STORY-133 je riješio PlayStation/joystick s fiksnim listama (SPACE_COMPOUNDS, GAMING_SYNONYMS). Za svaku novu domenu (npr. "Apple oprema", "Samsung punjači") bi opet trebalo ručno dodavati termine.
- Jedan modul koji iz kataloga izvuče compounds i sinonime omogućuje da se pretraga prilagodi bilo kojem katalogu bez hardkodiranja.

## Acceptance Criteria

- [x] **P1** Modul `catalog-search-vocabulary.ts`: prima `ProductItem[]`, vraća `SearchVocabulary` (spaceCompounds, synonymGroups).
- [x] **P2** Space-compounds: osnovna lista u modulu; u vokabular ulaze samo oni čiji **joined** oblik postoji u tokenima kataloga.
- [x] **P3** Sinonimi: iz kataloga se po kategoriji izvlače grupe (name/brand tokeni); API `expandQueryWithSynonyms` je u modulu. Za sada se **ne koriste** u product-index za proširenje upita (preširoke kategorije kvare rangiranje); zadržan je hardcodirani gaming fallback.
- [x] **P4** product-index koristi vokabular pri buildSearchIndex (tokenizer s vocabulary.spaceCompounds); svi postojeći testovi prolaze.

## Test Plan

- [x] **T1** catalog-search-vocabulary.test.ts: katalog s "PlayStation" → spaceCompounds sadrži (play, station, playstation); katalog bez toga → nema.
- [x] **T2** Modul: katalog s kategorijom "Gaming oprema" i proizvodima gamepad/kontroler → synonymGroups sadrži grupu s oba termina; expandQueryWithSynonyms radi.
- [x] **T3** Regresija: product-index (35), product-search-pipeline.e2e (24), agent-actions (70) prolaze.
- [ ] **T4** (Opcionalno) Ručno: katalog s PlayStation opremom.

## Files Changed

- `client/src/lib/catalog-search-vocabulary.ts` — novi modul: buildSearchVocabulary, expandQueryWithSynonyms, BASE_SPACE_COMPOUNDS, extractCatalogTokens, getSpaceCompoundsForCatalog, getSynonymGroupsFromCatalog.
- `client/src/lib/catalog-search-vocabulary.test.ts` — T1/T2 testovi za modul.
- `client/src/lib/product-index.ts` — import buildSearchVocabulary, SpaceCompound, SearchVocabulary; buildSearchIndex gradi vocabulary i koristi ga za tokenizer (spaceCompounds); tip ProductSearchIndex proširen s vocabulary; query expansion bez katalog-sinonima (samo gaming fallback).

## Notes

- Grupe sinonima iz kataloga su spremne za buduću uporabu (npr. kada se ograniči na uske kategorije ili manje grupe).
- Osnovna lista compounds je u catalog-search-vocabulary (BASE_SPACE_COMPOUNDS).
