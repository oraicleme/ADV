# STORY-157: Dokumentacija — verifikacija Excel ↔ Magento SKU (1:1)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (docs + scripts)

## What
Zatvoriti petlju iz STORY-156: jedan **konkretan** primjer (Teracell TC-06) s nazivom, Magento `sku` / `entity_id` / `url_key`, i objašnjenjem zašto primjer Excel šifre `102237` ne radi na REST-u.

## Why
Tim treba jedan čitljiv izvor istine (bez ručnog kopanja kroz chat) i ponovljiv način provjere za bilo koji artikal.

## Acceptance Criteria
- [x] `docs/mobileland-excel-sku-mapping-verification.md` sadrži tablicu i link na pretragu
- [x] `scripts/verify-mobileland-product.ts` ispisuje `entity_id`, `sku`, `url_key` za zadani SKU
- [x] TRACKER ažuriran

## Test Plan
- [x] `pnpm exec tsx scripts/verify-mobileland-product.ts 1052510` (uz `.env.local`)

## Files Changed
- `docs/mobileland-excel-sku-mapping-verification.md` — nova
- `scripts/verify-mobileland-product.ts` — nova
- `docs/stories/TRACKER.md` — sljedeći broj priče

## Notes
Ne čuva se stvarni Excel iz korisnika; koristi se javno potvrđen primjer (SKU `1052510`).
