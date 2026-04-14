# STORY-146: Search Type-C Recall Too Low

**Status:** ✅ Done
**Created:** 2026-03-18
**Package:** client (product search UX)

## What
Kada korisnik u ProductDataInput pretražuje “type-c / usb-c”, UI trenutno prikazuje mnogo manje rezultata nego što realno postoji u katalogu.

Uzrok: MiniSearch Stage-1 filtrira rezultate kroz `minScore: 1.5`, što je preagresivno za kratke upite i za AI-interpretirane upite.

## Why
Korisnik očekuje da “type-c” vrati velik broj relevantnih kabela/adaptera, bez nepotrebnog rezanja hitova prije nego što LLM selection pipeline radi.

## Acceptance Criteria
- [x] **A1** Za kratke ručne upite (npr. “type-c”, “usb-c”) minScore se spušta tako da `visibleIndices` dobije više kandidata (veći recall).
- [x] **A2** Za “AI search” put (`interpretProductSearch`) minScore se postavlja na recall-friendly vrijednost (0), bez dodatnog sužavanja.
- [x] **A3** Odabir minScore je pokriven unit testovima (helper heuristika).

## Test Plan
- [x] **T1 (unit):** `getCatalogMinScoreForQuery('type-c', 'manual') === 0`
- [x] **T2 (unit):** `getCatalogMinScoreForQuery('iphone 15 punjač', 'manual') === 1.5` (ili >0 prema heuristici)
- [x] **T3 (unit):** `getCatalogMinScoreForQuery(any, 'ai') === 0`
- [ ] **T4 (manual):** U `agents/retail-promo` učitaj katalog s puno Type‑C proizvoda, pretraži “type-c” i provjeri da broj vidljivih rezultata značajno raste (u odnosu na staro ponašanje).

## Files Changed
- `client/src/components/ProductDataInput.tsx` — heuristika `minScore` i detekcija AI vs manual search source
- `client/src/lib/product-search-min-score.ts` — helper: mapiranje upita → minScore
- `client/src/lib/product-search-min-score.test.ts` — unit testovi za heuristiku

## Notes
- Ovaj fix je ciljano “recall-first” za kratke upite i AI put.
- Classification filters (category/brand chips) ostaju i dalje aktivni; ovaj story je samo za Stage‑1 hit filtering.

