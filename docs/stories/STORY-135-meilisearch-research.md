# STORY-135: Research — Meilisearch umjesto MiniSearch + vlastitog vokabulara

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client + server (research)

## What

Istražiti [Meilisearch](https://github.com/meilisearch/meilisearch) kao zamjenu za trenutni search stack (MiniSearch u prozoru + catalog-search-vocabulary + LLM selectProducts). Dokumentirati što Meilisearch nudi, kako bi se uklopio u Oraicle, te opcije (self-hosted vs Cloud, SDK, migracija).

## Why

- Trenutno: **Stage 1** MiniSearch (in-memory, client-side), **Stage 2** LLM rerank (catalog.selectProducts). Vokabular (compounds, sinonimi) držimo u `catalog-search-vocabulary.ts` i ručno ga prilagodavamo.
- Meilisearch nudi: brzu full-text + **hybrid search** (semantic + full-text), **synonym support**, typo tolerance, filtering/faceting, search-as-you-type (<50ms), REST API + SDK-ovi. To bi moglo smanjiti potrebu za vlastitim tokenizerom i dijelom LLM reranka.
- Cilj researcha: odluka ili plan — možemo li koristiti Meilisearch umjesto “svega iznad” (ili hibridno), i što to zahtijeva.

## Trenutni stack (Oraicle)

| Komponenta | Uloga | Lokacija |
|------------|--------|----------|
| **MiniSearch** | BM25 in-memory indeks, recall | `client/src/lib/product-index.ts` |
| **catalog-search-vocabulary** | Space-compounds i synonym grupe iz kataloga | `client/src/lib/catalog-search-vocabulary.ts` |
| **buildSearchIndex / queryIndex** | Gradnja indeksa i upit nad `ProductItem[]` | `product-index.ts`, poziva AgentChat, ProductDataInput, agent-actions |
| **catalog.selectProducts** | LLM rerank: odabir među kandidatima | `server/routers/catalog.ts` |
| Podaci | Excel / API → `ProductItem[]` u memoriji | Nema perzistentnog indeksa |

## Što Meilisearch nudi (iz [repozitorija](https://github.com/meilisearch/meilisearch))

- **Hybrid search:** kombinacija semantic + full-text (može smanjiti ovisnost o čisto LLM reranku za neke upite).
- **Typo tolerance:** relevantni rezultati i s greškama u pisanju.
- **Synonym support:** konfiguracija sinonima (npr. joystick ↔ gamepad ↔ kontroler) — zamjena za dio našeg vokabulara.
- **Search-as-you-type:** rezultati u &lt;50 ms.
- **Filtering and faceted search:** filtriranje po atributima (npr. category, brand) — blisko našem catalog_filter.
- **Sorting:** po cijeni, datumu, itd.
- **RESTful API + SDK-ovi:** JavaScript/TypeScript SDK za integraciju.
- **Open source (MIT), Community Edition:** besplatan za korištenje; Enterprise za sharding, S3 snapshots.

## Ključna pitanja za research

1. **Gdje živi indeks?**  
   MiniSearch je **client-side**, in-memory, bez servera. Meilisearch je **server** (self-hosted ili [Meilisearch Cloud](https://www.meilisearch.com/)). Treba li Oraicle pokretati Meilisearch instance (Docker / SST / Cloud), ili ostati bez dodatnog servisa?

2. **Katalog i ažuriranje indeksa**  
   Danas: katalog se učitava (Excel/API) → `buildSearchIndex(products)` u browseru. S Meilisearchom: dokumenti se šalju na Meilisearch API (index/create/replace). Tko poziva indexiranje — server nakon uploada kataloga, ili client preko našeg API-ja?

3. **Synonymi i “compounds”**  
   Meilisearch ima [synonyms API](https://www.meilisearch.com/docs). Naš “play station” → “playstation” može biti synonym konfiguracija. Istražiti: mogu li se sinonimi/compounds postavljati dinamički iz kataloga (kao u STORY-134) ili samo statički?

4. **LLM rerank (selectProducts)**  
   Ako Meilisearch hybrid search daje dovoljno dobar ranking, možemo li smanjiti broj kandidata koji šaljemo LLM-u ili ga preskočiti za neke upite? Ili ostaje two-stage: Meilisearch = recall, LLM = semantic odabir?

5. **Offline / bez Meilisearch servera**  
   Ako korisnik radi samo s Excelom bez backend indeksa — ostaje li fallback na MiniSearch (ili slično) kada Meilisearch nije dostupan?

## Acceptance Criteria (research story)

- [x] **R1** Dokumentirana usporedba: MiniSearch + vokabular + LLM vs Meilisearch (CE) + opcionalno LLM. Što dobivamo, što gubimo (npr. zero-deps client vs potreba za serverom).
- [x] **R2** Opis opcija deploymenta: self-hosted (Docker/SST), Meilisearch Cloud; kako Oraicle server/client komunicira s Meilisearch (env, API key, CORS).
- [x] **R3** Mapiranje: naši `ProductItem` polja (name, brand, code, category) → Meilisearch index/settings; sinonimi i filteri (category, brand) kako postaviti.
- [x] **R4** Preporuka: (a) full zamjena, (b) hibrid (Meilisearch kad je dostupan, MiniSearch fallback), ili (c) ostati na MiniSearch + vokabular; plus sljedeći koraci (POC, spike, ili zatvaranje researcha).

## Test Plan (nakon odluke)

- Ako se odluči POC: E2E ili integracijski test s Meilisearch instance (index + search) za isti katalog i reprezentativne upite (play station, joystick, USB-C punjači).
- Regresija: postojeći product-index i catalog_filter testovi moraju proći (ili biti prilagođeni novom provideru).

## Files / Artefakti (za research)

- Ovaj doc: `docs/stories/STORY-135-meilisearch-research.md`.
- **Research zapis:** `docs/research/meilisearch-options.md` — usporedba (R1), deployment (R2), mapiranje ProductItem/synonymi/filtri (R3), preporuka i sljedeći koraci (R4).

## Notes

- Meilisearch je u Rustu, izvršava se kao zaseban proces; za Oraicle bi bio dodatni servis (ili Cloud).
- Community Edition (MIT) je dovoljan za full-text + typo + synonyms; hybrid/semantic može zahtijevati konfiguraciju ili embedding pipeline.
- Link: [Meilisearch GitHub](https://github.com/meilisearch/meilisearch), [Documentation](https://www.meilisearch.com/docs).
