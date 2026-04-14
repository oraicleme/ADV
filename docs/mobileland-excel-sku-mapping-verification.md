# Mobileland — verifikacija 1:1 mapiranja (Excel šifra ↔ Magento)

**STORY-157** — dokumentacija i ponovljiva provjera.

## Zašto

Automatske slike u Oraicleu koriste server mapu `sku | entity_id | url_key → image URL`. Ako Excel kolona **nije** jedna od tih vrijednosti (npr. interni ERP broj koji Magento REST ne poznaje kao `sku`), lookup neće pronaći sliku.

## Konkretan red — Teracell TC-06 (Type-C)

Provjereno živim **Magento REST** odgovorom (`GET /rest/V1/products/1052510`, OAuth 1.0 kao u `server/lib/mobileland-api.ts`).

| Izvor | Vrijednost |
|--------|------------|
| **Naziv (kao na [pretrazi](https://mobileland.me/catalogsearch/result/?q=teracell+auto+punjac))** | Auto punjač Teracell Evolution TC-06 - type c (brzo punjenje 2 USB-3.1A) |
| **Magento `entity_id`** | `9667` |
| **Magento `sku`** | `1052510` |
| **`url_key`** | `1052510` (isti kao SKU za ovaj artikal) |
| **Primjer “pogrešne” šifre iz Excela (screenshot Retail Promo)** | `102237` — **nije** Magento SKU |
| **REST provjera pogrešne šifre** | `GET .../products/102237` → **404** (proizvod ne postoji pod tim SKU-jem) |
| **Očekivani ključ u Oraicle mapi slika** | `1052510` i `9667` (nakon STORY-156 aliasa) — oba pokazuju na istu sliku |

**Zaključak za 1:1 mapping:** u Excelu u koloni šifre koristi **`1052510`** (SKU) ili **`9667`** (entity ID), **ne** `102237`.

## Kako ponoviti za bilo koji artikal

1. U Magento adminu otvori proizvod → polje **SKU** (i po potrebi **ID** u URL-u ili gridu).
2. U Excelu stavi istu vrijednost u kolonu koju parser mapira na `code` / šifru.
3. Ili pokreni skriptu:

```bash
pnpm exec tsx scripts/verify-mobileland-product.ts 1052510
```

Skripta ispisuje `entity_id`, `sku`, `url_key` i potvrđuje da REST poznaje taj identitet.

## Povezani kod

- Mapa slika: `server/lib/mobileland-api.ts` (`fetchFullImageMap`, aliasi STORY-156).
- Klijent lookup: `client/src/components/AgentChat.tsx` (`mobilelandImageMap[product.code]`).
- Banner kada šifre ne odgovaraju: `mobilelandCodeMismatchBanner` u `AgentChat.tsx`.
