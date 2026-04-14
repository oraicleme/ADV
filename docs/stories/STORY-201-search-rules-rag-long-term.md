# STORY-201: Search Rules — RAG Long-Term (Indexed Rules + Retrieval)

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client PoC + roadmap for future server index)

## What

**Delivered:** Fazirani dizajn i **PoC klijentskog “RAG-lite”** skretanja pravila (leksička sličnost upita i `queryPattern`), s **opt-in** uključivanjem; **punu** indeksiranu RAG (Meilisearch/embeddings) ostaviti kao **Fazu C** u `docs/search-rules-rag-roadmap.md`.

## Why

Kada pravila postanu brojna i prirodnojezična, samo točno podudaranje `queryPattern`-a je nedovoljno; PoC daje sličnost bez novog servera indeksa. Dugoročni moduli (zasebni indeks pravila) su procijenjeni i odvojeni od kataloga.

## Acceptance Criteria

- [x] Dizajn faziran: ovisi o stabilnom modelu iz STORY-196.
- [x] Procjena troška i održavanja indeksa pravila odvojeno od kataloga proizvoda (`docs/search-rules-rag-roadmap.md` Faza C).
- [x] Proof-of-concept ili odbijanje s obrazloženjem — **PoC = RAG-lite u klijentu**; puni vektorski RAG **odgođen** dok product ne zahtijeva.

## Test Plan

- [x] Unit testovi za scoring i pragove (`search-rules-rag-lite.test.ts`).
- [x] `apply-search-rules.test.ts` — mock postavke; točno ponašanje bez regresije kad je RAG-lite isključen/uključen.

## Files Changed

- `docs/search-rules-rag-roadmap.md` — **faze A–C**, moduli, trošak, tok podataka.
- `client/src/lib/search-rules-rag-lite.ts` — leksički score i aktiviranje pravila.
- `client/src/lib/search-rules-rag-lite-settings.ts` — `localStorage` + `SEARCH_RULES_RAG_LITE_CHANGED_EVENT`.
- `client/src/lib/apply-search-rules.ts` — spajanje točnog + semantičkog skupa.
- `client/src/components/SearchSettingsSection.tsx` — checkbox “Similar query matching (STORY-201)”.
- `client/src/components/ProductDataInput.tsx` — slušanje eventa za refilter.
- `client/src/lib/search-rules-rag-lite.test.ts`, `search-rules-rag-lite-settings.test.ts`.

## Notes

- **STORY-196** ostaje izvor istine za model pravila; **ne** početi Fazu C bez PM-a.
- Detaljna mapa modula: **`docs/search-rules-rag-roadmap.md`**.
