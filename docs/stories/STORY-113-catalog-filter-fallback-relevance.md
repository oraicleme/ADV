# STORY-113: catalog_filter fallback — relevance (ne prikazivati adaptere kad korisnik traži punjače)

**Status:** ✅ Done
**Created:** 2026-03-11
**Package:** oraicle (client)

## What
Kada korisnik traži "USB-C punjači za auto", fallback u catalog_filter (name-only kad kategorija ne odgovara) je vraćao sve USB-C proizvode — uključujući adaptere i kablove. Trebalo je da fallback i dalje vrati nešto, ali samo proizvode relevantne za nameru (punjači), ne adaptere/kablove.

## Why
Korisnik je dobijao proizvode koji nemaju veze sa USB-C auto punjačima (npr. VGA+USB switch, adapteri). Fallback je bio previše širok.

## Acceptance Criteria
- [x] U product-search: exportovana funkcija za filtriranje indeksa po "charger relevance" (isključi adapter/cable-only kada upit ima charger intent).
- [x] U catalog_filter fallback (korak 2): kada koristimo name-only, prvo primeniti filterIndicesByChargerRelevance; ako rezultat nije prazan, koristiti ga; ako jeste prazan, ne koristiti ceo byName (ostaviti 0 ili probati category-only).
- [x] Unit test: za upit "USB-C punjači za auto" + nepostojeća kategorija, izabrani proizvodi ne smeju uključivati Bluetooth USB Adapter, Micro USB to LAN Adapter, Lightning kabel; moraju uključivati bar jedan USB punjač.

## Test Plan
- [x] agent-actions.test.ts: "catalog_filter fallback does not return USB-C adapters when user asked for punjači za auto" prolazi
- [x] Svi postojeći catalog_filter testovi i dalje prolaze

## Files Changed
- `client/src/lib/product-search.ts` — filterIndicesByChargerRelevance(), CHARGER_QUERY_MARKERS
- `client/src/lib/agent-actions.ts` — fallback korak 2 koristi filterIndicesByChargerRelevance; ako prazan, ne koristiti byName
- `client/src/lib/agent-actions.test.ts` — test da fallback ne vraća adaptere kada korisnik traži punjače

## Notes
Nastavak STORY-112 (handoff search/selection). Relevance logika već postoji u product-search (STORY-111); iskorišćena za fallback path u agent-actions.
