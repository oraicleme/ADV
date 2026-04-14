# STORY-156: Mobileland slike — Excel šifra mora odgovarati Magento SKU / entity ID

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (server + client)

## What
Document and fix the dominant cause of “sve je u .env, API radi, ali nema slika”: kolona **šifra** u Excelu mora biti vrijednost koju Magento koristi za lookup — tipično **SKU** (npr. `1052510`), a ne interni ERP kod koji u REST-u ne postoji (npr. `102237`).

Server: u SKU→URL mapu dodati i alias ključeve **`entity_id` (`id`)** i **`url_key`** (kad se razlikuje od SKU) da izvozi koji koriste te vrijednosti dobiju slike.  
Client: amber upozorenje kada je mapa velika ali **nijedan odabran** red nema podudaranje.

## Why
Storefront ([mobileland pretraga](https://mobileland.me/catalogsearch/result/?q=teracell+auto+punjac)) prikazuje proizvode po Magento identitetu; enrichment ključ je `sku` iz REST-a. Interni kodovi iz drugog sistema ne postoje u `/rest/V1/products` kao `sku`, pa je `map[code]` uvijek prazan.

## Acceptance Criteria
- [x] `fetchProductPage` fields uključuje `id`; `addToMap` puni `map[sku]`, `map[String(id)]`, i `map[url_key]` kad je drugačiji od SKU
- [x] Unit testovi za alias ključeve
- [x] Retail Promo: vidljivo upozorenje kada su proizvodi odabrani, mapa > 500 ključeva, a 0 podudaranja za odabrane redove s ne-praznim `code`
- [x] Krojač: STORY / TRACKER

## Test Plan
- [x] `pnpm exec vitest run server/lib/mobileland-api.test.ts`

## Files Changed
- `server/lib/mobileland-api.ts`
- `server/lib/mobileland-api.test.ts`
- `client/src/components/AgentChat.tsx`

## Notes
Ako ni `sku` ni `entity_id` ni `url_key` ne odgovaraju Excel koloni, jedino trajno rješenje je promjena izvora ili mapiranje (npr. kolona „Magento SKU“ u exportu).
