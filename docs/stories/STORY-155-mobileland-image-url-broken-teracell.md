# STORY-155: Mobileland slike se ne prikazuju (pogrešan URL — dupli `media/catalog/product`)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (server + client)

## What
Ispraviti gradnju URL-a za slike s mobileland.me kada Magento u `image` / `thumbnail` custom atributima vrati site-relative putanju koja već uključuje `media/catalog/product`, što je nakon STORY-154 moglo dati nevaljane dvostruke URL-ove (404 u pregledniku). Dodati opcijski `referrerpolicy="no-referrer"` za http(s) slike u canvas/HTML preview radi CDN/hotlink ponašanja.

## Zašto
Korisnik vidi proizvode na [mobileland.me pretrazi](https://mobileland.me/catalogsearch/result/?q=teracell+auto+punjac) s ispravnim slikama, dok u Oraicle designeru isti SKU može imati prazan ili “pukao” `<img>` zbog pogrešno sastavljenog `src`.

## Acceptance Criteria
- [x] `buildImageUrl` normalizira apsolutne i site-relative putanje bez duplog prefiksa
- [x] Unit testovi pokrivaju: puni `https://`, `//`, `/media/catalog/product/...`, relativno `k/u/x.jpg`
- [x] Canvas/preview `<img>` za http(s) product image koristi `referrerPolicy="no-referrer"` gdje je primjenjivo

## Test Plan
- [x] `pnpm exec vitest run server/lib/mobileland-api.test.ts`
- [x] `pnpm exec vitest run client/src/lib/ad-layouts/shared.test.ts` (ako dira renderImage)

## Files Changed
- `server/lib/mobileland-api.ts` — `buildImageUrl`
- `server/lib/mobileland-api.test.ts` — novi slučajevi
- `client/src/lib/ad-layouts/shared.ts` — `referrerpolicy` u generiranom HTML-u
- `client/src/components/AdCanvasEditor.tsx` — `referrerPolicy` na product img

## Notes
Ako problem ostane za određeni SKU, usporediti `sku` u Excelu s Magento `sku` i Network tab za stvarni `src`.
