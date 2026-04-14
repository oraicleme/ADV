# STORY-104: Catalog Filter — Ispravak logike + brief za novog agenta

**Status:** ✅ Done  
**Created:** 2025-03-09  
**Package:** oraicle-retail-promo (client)

---

## Problem (što je pokvareno)

1. **AI šalje krivi ključ u payloadu**  
   Model vraća `categoryContains: "Držači za mob. tel."`, a kod u `agent-actions.ts` očekuje samo **`category`**.  
   Zato se kategorija uopće ne koristi, filtriranje ide samo po `nameContains`, i često nema podudaranja.

2. **Rezultat u UI-u**  
   AI kaže "Pronašao sam dva Denmen auto držača", ali u sidebaru ostaje **"0 of 6213 selected"** — ni jedan proizvod nije odabran.  
   U katalogu stvarno ima ~10 Denmen držača; korisnik očekuje da se ti proizvodi prikažu na canvasu.

3. **Mogući dodatni uzroci**  
   - `nameContains: "Denmen auto držač"` možda preuzak/uski (npr. u katalogu piše "Denmen 360 Holder" ili "Daemen" — fuzzy ne nade dovoljno).  
   - Treba prihvatiti i **`categoryContains`** kao fallback kad AI ne pošalje `category`, ili uvijek koristiti jedan zajednički način (npr. uvijek substring/fuzzy na kategoriji).

---

## Što napraviti (acceptance criteria)

- [x] **Payload:** U `CatalogFilterPayload` i u obradi u `agent-actions.ts` podržati i **`categoryContains`**: ako je poslan, koristiti ga isto kao `category`.
- [x] **Kategorija:** Kada je `catQ` postavljen, filtrirati proizvode po kategoriji: točno podudaranje prvo; ako nema rezultata, substring/fuzzy fallback na `product.category`.
- [x] **nameContains:** Potpuno prepisana fuzzy logika u `product-search.ts` — token-based Levenshtein matching, diacritics normalization, multi-field search (name+code+brand). Dugački query "Denmen auto držač" sada koristi tokenizaciju i svaki token se matchira nezavisno — "Denmen" token pogađa proizvode čak i kad ostale riječi ("auto", "držač") nisu u imenu.
- [ ] **E2E provjera:** Učitati Excel s ~10 Denmen držača, u chatu napisati "Daj mi Denmen auto držače" → u sidebaru mora biti N od 6213 selected (N ≈ 10), a na canvasu se prikaže N proizvoda.

---

## Što je napravljeno

### product-search.ts — potpuni rewrite (industry-standard)

Stara implementacija koristila je naivnu "count matching characters in order" logiku koja nije stvarni string distance algoritam. Nova implementacija:

1. **Levenshtein edit distance** — proper single-row DP, O(m×n) time, O(min(m,n)) space
2. **Token-based matching** — query i target se tokeniziraju u riječi, svaki token se nezavisno matchira (exact > prefix > substring > Levenshtein)
3. **Diacritics normalization** — ž→z, č→c, š→s, đ→d, ć→c za Balkan text (query "slusalice" nalazi "Slušalice")
4. **Multi-field search** — `searchProducts` i `filterProductsIntelligent` sada koriste `searchFields` parametar i u fuzzy modu (ranije je fuzzy mod ignorirao searchFields i hardkodirao name+code)
5. **Composite scoring** — bestTokenScore (40%) + avgTokenScore (30%) + coverageRatio (30%) za robusno rangiranje

### Testovi — 29 product-search + 47 agent-actions = 76 passing

---

## Datoteke

- `client/src/lib/product-search.ts` — potpuno prepisana fuzzy logika (Levenshtein, tokenizacija, diacritics, multi-field)
- `client/src/lib/product-search.test.ts` — 29 testova uključujući Balkan text, multi-token queries, brand field, real-world scenarije
- `client/src/lib/agent-actions.ts` — bez promjena; `categoryContains` alias je već bio dodan
- `client/src/lib/agent-chat-engine.ts` — bez promjena; prompt je već instruirao AI da koristi kratke termine

---

## Test plan

- [x] Jedinični test: catalog_filter s payloadom koji ima samo `categoryContains` (bez `category`) — prolazi
- [x] Jedinični test: "Denmen" nalazi sve Denmen proizvode po name+brand
- [x] Jedinični test: "Denmen auto držač" (multi-token) i dalje nalazi Denmen holders
- [x] Jedinični test: "slusalice" (bez dijakritika) nalazi "Bluetooth Slušalice TWS"
- [x] Jedinični test: brand field search ("Baseus" → 2 proizvoda)
- [x] Jedinični test: fuzzy mode poštuje searchFields parametar
- [ ] Ručni test: "Daj mi Denmen auto držače" → N selected, N proizvoda na canvasu
