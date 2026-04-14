# STORY-124: Pretraga ne radi ispravno — popravak + E2E testovi

**Status:** ✅ Done
**Created:** 2026-03-13
**Package:** client

## What

Korisnik prijavljuje da pretraga "definitivno ne radi, makar ne kako treba": (1) u sidebaru polje "Search by name or code" ne filtrira uvijek ispravno ili ažurno; (2) u AI chatu poruka "LLM found no matching products since product search results were empty" — pretraga po upitu (npr. slušalice za brand Demenn) vraća 0 rezultata iako katalog sadrži odgovarajuće proizvode. Rješavamo uzroke i dodajemo E2E/unit testove prije označavanja gotovim.

## Why

Bez ispravne pretrage, korisnik ne može ni ručno filtrirati proizvode ni dobiti AI odgovor koji uključuje tražene proizvode. "Search hardening" (STORY-122) je označen gotovim, ali u praksi se javljaju prazni rezultati i neažurni prikaz.

## Root causes (identificirano)

1. **Stale index u sidebaru**: `ProductDataInput` koristi `useMemo(..., [products, searchQuery, activeFilters])`. Shared index (`searchIndexRef`) ažurira se u parent `useEffect` nakon commita. Ažuriranje refa ne pokreće re-render, pa `visibleIndices` ostane izračunat sa starim indexom (ili praznim) dok korisnik ne promijeni upit/filter — pretraga u sidebaru "ne prati" novi katalog ili prvi put kad korisnik upiše upit.
2. **Index null u agent pathu**: Kad se `resolveCatalogFilterActions` pozove odmah nakon učitavanja kataloga, `searchIndexRef.current` je još `null` (effect nije odradio build). Funkcija vraća action bez rezultata → "product search results were empty".

## Acceptance Criteria

- [x] **A-1** Sidebar: kada korisnik upiše "Search by name or code", lista proizvoda se filtrira prema MiniSearch indexu; lista se ažurira i kada se katalog upravo učitao (index postane spreman) — `searchIndexVersion` u deps osigurava re-render kad index postane spreman.
- [x] **A-2** Agent: kada LLM pošalje `catalog_filter` s `query`, Stage 1 ne vraća 0 kandidata samo zato što je index još null — u `resolveCatalogFilterActions` build-on-the-fly ako je ref null.
- [x] **A-3** E2E/unit testovi: (1) pipeline test "slušalice" / "slusalice denmen" vraća Denmen TWS; (2) nameContains "slusalice" bez searchIndex (fallback path) vraća Audio proizvod; (3) `indexVersion` u useSearchIndex osigurava da ProductDataInput recomputes visibleIndices.

## Test Plan

- [x] `product-search-pipeline.e2e.test.ts`: "slušalice" (diakritik) i "slusalice denmen" / "slušalice brand demenn" → nalaze Audio proizvod (Denmen TWS).
- [x] `product-search-pipeline.e2e.test.ts`: nameContains "slusalice" s null searchIndex (fallback) vraća proizvode koji sadrže Slušalice/Bluetooth.
- [x] Agent path minScore 0 test: "slusalice" s minScore 0 vraća kandidate (LLM nije bez kandidata).
- [ ] Manual: učitaj katalog, upiši u "Search by name or code" — lista se filtrira; u chatu zatraži reklamu za slušalice / punjače — dobiješ proizvode.

## Files Changed

- `client/src/lib/use-search-index.ts` — expose `indexVersion` (state) koji se poveća kad se index rebuilda; child komponente ovise o njemu za re-render.
- `client/src/components/AgentChat.tsx` — proslijedi `searchIndexVersion` u ProductDataInput; u `resolveCatalogFilterActions` build-on-the-fly kad je `idx` null a ima producta; import `buildSearchIndex`.
- `client/src/components/ProductDataInput.tsx` — prop `searchIndexVersion?`; u `useMemo` za `visibleIndices` dependency `searchIndexVersion` kad se koristi shared index.
- `client/src/lib/product-search-pipeline.e2e.test.ts` — testovi: "slušalice" (diakritik), "slusalice denmen" / "slušalice brand demenn", agent path minScore 0, nameContains "slusalice" s null searchIndex (fallback).

## Notes

- Screenshot: "8/6213 selected", "Search by name or code" prazan; drugi screenshot: "product search results were empty for your query: 'slusalice za audio brand d...'".
- STORY-122 je Done; ovaj story adresira preostale runtime scenarije (stale ref, index-not-ready) i formalizira E2E testove.
