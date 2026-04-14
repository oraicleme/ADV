# Tehnička arhitektura pretrage proizvoda (Oraicle Retail Promo)

**Verzija:** 2026-03-23  
**Izvor:** `client/src/lib/product-index.ts`, `product-selection-panel-filters.ts`, `catalog-search-vocabulary.ts`, `product-search-min-score.ts`, `select-products-query-expansion.ts`, `AgentChat.tsx` (`resolveCatalogFilterActions`), `server/lib/meilisearch-service.ts`, `server/routers/catalog.ts` (`searchProducts`, `selectProducts`).

---

## 1. Sažetak

Pretraga u aplikaciji **nije jedan algoritam**, nego **dva glavna toka**:

| Tok | Kada | Gdje se izvršava | Tehnologija |
|-----|------|------------------|-------------|
| **Ručna pretraga** | Korisnik upisuje upit u **Add Products** (lijevo) ili donji tab **Products** | Preglednik, nad **trenutno učitanim** proizvodima | **MiniSearch** (klijent) + opcionalno vokabular iz kataloga; pragovi **min-score** iz postavki |
| **AI odabir** | Agent šalje akciju `catalog_filter` s poljem `query` | Klijent zove server (tRPC), zatim LLM | **Meilisearch** (server, BM25 + opcionalno hybrid s embeddingima) → **LLM rerank** (`selectProducts`) |

**RAG** u smislu „retrieval augmented generation“ za **samu pretragu indeksa** (dokumenti + embedding pravila korisnika) **nije implementiran** kao zaseban sloj. Postoji **hybrid Meilisearch** (BM25 + vektorska sličnost) kada je server tako konfiguriran, i **LLM** koji na kraju bira proizvode iz kandidata — to nije klasični RAG nad korisničkim pravilima, nego fiksni pipeline.

---

## 2. Podaci o katalogu

- Proizvodi žive u **sesiji preglednika** nakon učitavanja (Excel, zalijepi, opcionalno Catalog API sync).
- Isti niz redaka hrani: lijevi panel, donji Products tab, canvas.
- **Meilisearch** na serveru održava indeks koji je **usklađen s katalogom** (indeksiranje pri promjenama — vidi `catalog` router i `meilisearch-service`).
- Dokumenti u Meilisearchu uključuju polja tipa: `name`, `brand`, `code`, `category` (prema `MeiliProductDoc` / postavke indeksa).

---

## 3. Ručna pretraga (Add Products + Products tab)

### 3.1 Zajednički upit

Jedan **zajednički string** pretrage (`catalogSearchQuery` u `AgentChat`) veže Add Products i Products tab (STORY-181).

### 3.2 MiniSearch i pragovi

- Gradi se **MiniSearch** indeks nad učitanim proizvodima (`buildSearchIndex` / `product-index`).
- Rezultati se filtriraju prema **min-score** ovisno o duljini upita:
  - **Dugi upiti** → stroži prag (postavka „long“).
  - **Kratki tokeni** (npr. do 6 znakova nakon normalizacije) → niži prag radi recall-a (postavka „short“).
- Vrijednosti dolaze iz **Workspace → Settings → Search**, spremaju se u **localStorage** (`search-settings-storage.ts` — STORY-173).
- Za **AI-interpretirane** upite u istom kodnom putu min-score može biti **0** (recall-first) — vidi `getCatalogMinScoreForQuery(..., 'ai')` u `product-search-min-score.ts`.

### 3.3 Vokabular iz kataloga (STORY-134)

- Modul `catalog-search-vocabulary.ts` gradi iz **stvarnih redaka**:
  - **space compounds** (npr. „play station“ → `playstation`) ako se spojeni oblik pojavljuje u katalogu;
  - **synonym grupe** po kategorijama (tokeni iz naziva/marka).
- Koristi se pri tokenizaciji / proširenju upita u klijentskom indeksu — **prilagođava se podacima**, ne korisničkim rečenicama tipa „zaboravi ovaj SKU“.

### 3.4 Fallback

Ako indeks nije dostupan, koristi se **podstring** na `name`, `code`, `category`, `brand` (`filterCatalogBySearchQuery` u `product-selection-panel-filters.ts`).

### 3.5 Filtri UI-a

- „Samo nekorišteni“ / „nije na ovom oglasu“ — **filtar liste**, ne semantička pretraga.

---

## 4. AI put: `catalog_filter` → Meilisearch → LLM

### 4.1 Ulaz

- Model vraća JSON akciju `catalog_filter` s **`query`** (prirodni jezik) i opcionalno **`hintCategories`** (točni nazivi kategorija iz sažetka kataloga za legacy put).

### 4.2 Faza 1 — Meilisearch (server)

- Klijent zove **`catalog.searchProducts`** (tRPC).
- Upit se može **proširiti** u više podupita (`buildExpandedSearchQueries` u `select-products-query-expansion.ts` — STORY-162) radi boljeg recall-a.
- **STORY-198 (opcionalno):** ako su uključeni `STAGE1_QUERY_EXPANSION` (server) i `VITE_STAGE1_QUERY_EXPANSION` (klijent), prije toga se poziva **`catalog.expandSearchQueryStage1`** — LLM vraća 0–2 parafraze koje se **spajaju ispred** leksičkih podupita (ne zamjenjuju ih). Zahtijeva LLM ključ; dodatni trošak po pretrazi.
- Više lista pogodaka spaja se i reže na **ograničen broj kandidata** (red veličine desetaka do stotina, ovisno o veličini kataloga).
- Primjenjuje se **noise floor** (npr. postotak top score-a) i **relaksacija** ako je premalo kandidata — vidi `AgentChat.resolveCatalogFilterActions`.

### 4.3 Hybrid i „smart routing“

- **Hybrid (BM25 + embedding)** uključuje se kada je **`isHybridConfigured()`** istinito: Meilisearch je postavljen (`MEILI_HOST`, `MEILI_API_KEY`) **i** postoji **`OPENAI_API_KEY`** na serveru — embedder je OpenAI `text-embedding-3-small` (vidi `server/lib/meilisearch-service.ts`). **Napomena:** `MEILI_EMBEDDING_MODEL` u `env.ts` ostaje iz starije STORY-137 konfiguracije i **ne sudjeluje** u gate-u za hybrid nakon STORY-138.
- **Omjer BM25 / vektor** u upitu: `MEILI_SEMANTIC_RATIO` (0–1, zadano **0,5**). 0 = samo BM25, 1 = samo semantički; poslužitelj šalje `hybrid: { semanticRatio }` u Meilisearch.
- **Prag za preskok LLM-a:** `MEILI_CONFIDENCE_THRESHOLD` (0–1, zadano **0,85**). Klijent ga dobiva preko **`catalog.getSearchProvider`** (`confidenceThreshold`) i uspoređuje s **`_rankingScore`** svakog Stage-1 pogotka. Ako su **svi** preostali kandidati ≥ pragu i ima ih **≥ 3** (`MIN_CANDIDATES_FOR_SMART_SKIP` u `meilisearch-smart-routing.ts`), poziva se **`shouldSkipSelectProductsLLM`** i **`selectProducts` se ne izvršava** (STORY-137, STORY-199). Postavite prag na **1** da se LLM uvijek koristi (praktički nikad skip).
- **Bez hybrid-a** (`OPENAI_API_KEY` prazan): samo BM25; `hybridEnabled` je `false` i smart routing **ne** preskače LLM.

**Noise floor (klijent, nije env)** — nakon unije podupita, rezultati se režu na **50%** najboljeg `score`-a; ako ostane **< 5** kandidata a sirovih pogodaka ima ≥ 5, prag se popušta na **30%** (`AgentChat.resolveCatalogFilterActions`). To je neovisno o `MEILI_CONFIDENCE_THRESHOLD`.

### 4.4 Faza 2 — `selectProducts` (LLM)

- Server šalje **kandidatima** (indeks, naziv, kod, kategorija, marka) u **LLM** (io.net / konfigurirani provider).
- LLM vraća **indekse** koji idu na oglas — to je **semantički rerank**, ne indeksiranje korisničkih dokumenata.

### 4.5 Greške / prazni rezultati

- Nema kandidata → payload može dobiti `_debugReason`; korisnik vidi poruku u chatu.
- LLM ne vrati ništa → posebni slučajevi (fallback na top Meilisearch ako je LLM nedostupan, itd.) — vidi `AgentChat` i `catalog.ts`.

---

## 5. Što u projektu **nije** „RAG pretraga“ kako ga korisnik često zamisli

- **Guardian RAG** (`.cursor/rules/guardian-agent.mdc`) služi **Cursor agentima u razvoju**, ne krajnjem korisniku u aplikaciji.
- **Workspace brief** (`agent-brief-storage.ts`) — **dodaje tekst u system prompt** za kreativni chat; može utjecati na **ponašanje modela** (uključujući kako formulira `catalog_filter`), ali **ne mijenja** formule bodovanja MiniSearcha niti Meilisearch upite automatski.
- **STORY-196:** post-processing pravila (`search-rules-storage`, `apply-search-rules`) — exclude/downrank po točnom normaliziranom upitu + SKU/naziv.
- **STORY-201:** opt-in **RAG-lite** nad istim pravilima — leksička sličnost upita i `queryPattern` (bez novog server indeksa); spajanje s točnim skupon u `apply-search-rules.ts`. Fazirani plan za puni indeks pravila: **`docs/search-rules-rag-roadmap.md`**.

### STORY-197 — Matrica: ručna vs AI (što je zajedničko, što ne)

| Aspekt | Ručna pretraga (Add Products / Products tab) | AI `catalog_filter` |
|--------|-----------------------------------------------|----------------------|
| **Ulazni string** | `normalizeSearchQueryForPipeline` (`client/src/lib/normalize-search-query.ts`) prije MiniSearcha, min-score heuristike i STORY-196 pravila | Isti prije `buildExpandedSearchQueries`, Meilisearch poziva i `selectProducts` |
| **Tokenizacija / scoring** | MiniSearch BM25 + tokenizer u `product-index.ts`, vokabular u `catalog-search-vocabulary.ts` | Meilisearch (server) + opcionalno hybrid embedding; zatim LLM rerank |
| **Pragovi** | Korisnički min-score (Workspace → Search) | Noise floor / relaksacija kandidata; zatim LLM ili smart skip |
| **Post-processing pravila** | `applySearchRulesToIndices` | `applySearchRulesToStage1Hits` |

**Server-backed ručna pretraga** (isti Meilisearch endpoint kao agent): **nije implementirana** u STORY-197. Ručna lista ostaje u pregledniku radi latencije, rada bez servera i bez dodatnog tRPC opterećenja. Ako se ikad uvodi: uvjeti bi uključivali Meilisearch dostupan, indeks sinkron s katalogom, jasan fallback na MiniSearch (npr. kada server nije konfiguriran ili korisnik želi offline).

---

## 6. Kako klijent **danas** može utjecati na ponašanje

| Mehanizam | Utjecaj |
|-----------|---------|
| Kvaliteta polja u izvoru (naziv, marka, kategorija, šifra) | Izravno na BM25, embeddinge i LLM kontekst |
| **Workspace → Search** (min-score) | Ručna pretraga u pregledniku |
| Uži ili prazan upit pri importu (STORY-193) | Koji se redovi učitavaju u sesiju |
| **Agent brief** | Preferencije u promptu → indirektno na `catalog_filter`, ne na zaseban search engine |
| Konfiguracija servera (Meilisearch, OpenAI ključ, pragovi) | Hybrid pretraga, confidence skip |

### STORY-200 — Povratna informacija (telemetrija, privacy-first)

- **Implicitno:** u Add Products, ako korisnik **odčekira** red koji je bio u zadnjem agent `catalog_filter` rezultatu (`resolvedIndices`), u sesijski zapis ide događaj `search_feedback_implicit` s **`queryHash`** i **`productKeyHash`** (djb2, 8 hex) — bez sirovog teksta upita ili SKU-a.
- **Eksplicitno:** kada postoji zadnji agent upit (`lastAgentCatalogFilterQuery`), u tablici proizvoda prikazuju se **palčevi** (relevantno / nije) za označene redove; događaj `search_feedback_explicit` uključuje `relevant: true|false`.
- **Predloženo pravilo (STORY-196):** `buildSuggestedExcludeRuleDraft` u `search-feedback.ts` mapira negativan signal na `{ queryPattern, productKey, action: 'exclude' }` — za ručni unos u Search rules, ne automatski.

---

## 7. Mogući smjer: „pametna pravila“ (nije u produkciji)

Da bi se postiglo ono što opisujete („za ovaj upit zaboravi ovaj proizvod“, „ovaj je suvišan“), tipično bi trebalo jedno ili više od:

1. **Post-processing sloj** nakon Meilisearcha / MiniSearcha: lista `(queryPattern, excludeProductId)` ili `(queryPattern, downrankSku)` u bazi ili localStorage — primijeni prije ili poslije LLM-a.
2. **Meilisearch filteri** — mogući su po poljima koja već postoje (`filterableAttributes`); za „ovaj SKU za ovaj upit“ trebaju **dinamički filteri** ili zasebno polje u dokumentu (nije trenutno dizajnirano za korisnička pravila).
3. **RAG nad pravilima**: indeksirati korisnička pravila kao male dokumente i dohvatiti ih pri upitu — **zahtijeva novi produkt** (ingest, retrieval, spajanje s kandidatima).

To bi bilo zasebna **user story** s jasnim modelom podataka i UX-om (tko smije zapisati pravila, traju li po sesiji ili po tenantu).

---

## 8. Referenca datoteka

| Područje | Datoteka |
|----------|----------|
| MiniSearch, upiti | `client/src/lib/product-index.ts` |
| Normalizacija upita (STORY-197) | `client/src/lib/normalize-search-query.ts` |
| Ručni filter panela | `client/src/lib/product-selection-panel-filters.ts` |
| Vokabular | `client/src/lib/catalog-search-vocabulary.ts` |
| Min-score | `client/src/lib/product-search-min-score.ts`, `search-settings-storage.ts` |
| Proširenje upita (agent) | `client/src/lib/select-products-query-expansion.ts` |
| Orkestracija agenta | `client/src/components/AgentChat.tsx` |
| Smart LLM skip (hybrid) | `client/src/lib/meilisearch-smart-routing.ts` |
| Meilisearch | `server/lib/meilisearch-service.ts` |
| API | `server/routers/catalog.ts` |
| Prompt (visoki opis) | `client/src/lib/agent-chat-engine.ts` (`AGENT_SEARCH_ARCHITECTURE_PROMPT`) |
| Povratna informacija pretrage | `client/src/lib/search-feedback.ts`, `retail-promo-log.ts` |

---

*Dokument je informativan; ponašanje u produkciji ovisi o točnoj verziji koda i env varijablama.*
