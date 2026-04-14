# Meilisearch research — opcije za Oraicle (STORY-135)

**Datum:** 2026-03-14  
**Kontekst:** Zamjena ili dopuna trenutnog search stacka (MiniSearch + catalog-search-vocabulary + LLM selectProducts).

---

## R1 — Usporedba: MiniSearch + vokabular + LLM vs Meilisearch (CE) + opcionalno LLM

### Trenutni stack (Oraicle)

| Komponenta | Što radi | Prednosti | Nedostaci |
|------------|----------|-----------|-----------|
| **MiniSearch** | BM25 in-memory indeks u browseru, Stage 1 recall | Nula dodatnih servisa, brzina &lt;5 ms, radi offline | Indeks se gradi pri svakom učitavanju kataloga; ograničen na jedan tab/session |
| **catalog-search-vocabulary** | Space-compounds (play station→playstation), synonym grupe iz kataloga | Prilagodba katalogu (STORY-134), bez eksternog API-ja | Ručno održavanje tokenizera i expandera |
| **catalog.selectProducts** | LLM rerank nad kandidatima (Stage 2) | Semantičko razumijevanje, model/variant scope, prirodni jezik | Latenca, trošak LLM-a, ovisnost o io.net/LLM |

### Meilisearch (Community Edition)

| Aspekt | Što nudi | Prednosti | Nedostaci / napomene |
|--------|----------|-----------|----------------------|
| **Full-text** | BM25-like, prefix, typo tolerance | Brzina &lt;50 ms, search-as-you-type, jezična podrška | Zahtijeva server (self-host ili Cloud) |
| **Synonymi** | Settings API: mutual/one-way, multi-word (npr. "San Francisco" ↔ "SF") | Zamjena za dio našeg vokabulara; normalizacija (lowercase, de-unicoded) | Postavljaju se API-jem (nema “čitanja” kataloga — mi šaljemo mapu sinonima) |
| **Filtering / faceting** | filter, facetDistribution | category, brand — blisko catalog_filter | — |
| **Hybrid search** (CE + embedder) | Full-text + semantic, semantic ratio 0–1 | Može smanjiti ovisnost o čisto LLM reranku | Za semantic treba embedder (OpenAI, Hugging Face, itd.) — dodatna konfiguracija i eventualno trošak |
| **REST + SDK** | meilisearch-js (Node + browser) | Jednostavna integracija | U browseru: CORS, potreban public/search key (nikad master key) |

### Što dobivamo s Meilisearchom

- Jedan konzistentan search engine: typo tolerance, synonymi, filtri, (opcionalno) hybrid.
- Mogućnost smanjenja ovisnosti o vlastitom tokenizeru i dijelu LLM reranka ako hybrid + synonymi pokriju dovoljno slučajeva.
- Search-as-you-type s niskom latencom.
- Perzistentni indeks (ako ga držimo na serveru) — nema ponovne gradnje u svakom tabu.

### Što gubimo / što postaje složenije

- **Zero-deps u browseru:** više nema “sve u clientu”; potreban je Meilisearch server ili proxy preko našeg backenda.
- **Offline / samo Excel:** bez Meilisearch instance nema pretrage osim ako zadržimo MiniSearch kao fallback.
- **Operativni teret:** deployment, env (URL, API key), CORS ili proxy na backendu.

---

## R2 — Opcije deploymenta i komunikacija (Oraicle ↔ Meilisearch)

### Self-hosted

- **Docker:** `getmeili/meilisearch:v1.13`, port 7700, volumen za podatke. Master key preko `MEILI_MASTER_KEY`.
- **SST / naš backend:** Meilisearch kao container ili servis u istom okruženju; Oraicle server komunicira s Meilisearchom (indexiranje, postavke, search proxy). Client ne mora znati za Meilisearch URL — sve ide preko našeg API-ja.
- **Produkcija:** [Running Meilisearch in production](https://www.meilisearch.com/docs/guides/running_production.md) (npr. DigitalOcean), HTTPS, zaštita master keya.

### Meilisearch Cloud

- Managed hosting; brzi start, skaliranje i backup na njihovoj strani.
- Oraicle konfigurira: `MEILI_HOST`, `MEILI_API_KEY` (ili Cloud API key). Komunikacija isto: ili server-side only, ili client s public search key + CORS.

### Kako Oraicle server/client komunicira s Meilisearchom

1. **Sve preko našeg servera (preporučeno za sigurnost)**  
   - Client → naš API (tRPC) → naš server → Meilisearch (s master key ili dedicated key).  
   - Nema izlaganja Meilisearch URL-a ili keya u browseru. CORS nije problem.  
   - Indexiranje: server nakon uploada kataloga (ili na zahtjev) šalje dokumente + ažurira synonyme.

2. **Client direktno na Meilisearch (search-only)**  
   - Meilisearch mora dozvoliti CORS za našu domenu.  
   - U browseru koristiti **samo public/search API key** (nikad master key).  
   - Indexiranje i postavke synonyma moraju ići preko servera (s master key).  
   - Preflight (custom header) može dodati latenciju; POST na `/search` smanjuje probleme.

**Env:** `MEILI_HOST`, `MEILI_API_KEY` (ili odvojene varijable za search key za frontend ako ide direktno). Keys nikad u repo; samo u env / secrets.

---

## R3 — Mapiranje ProductItem → Meilisearch index i postavke

### Polja ProductItem (relevantna za search)

- `name`, `code`, `category`, `brand` (već indeksirana u MiniSearch s boostovima).  
- Opcionalno: `classifications`, `description` za buduće proširenje.

### Meilisearch index

- **Primary key:** npr. `id` — možemo koristiti array index kao `id` (0, 1, 2, …) ako je katalog “ephemeral” po sessionu, ili stabilan ID ako imamo ga iz podataka.
- **Searchable attributes (redoslijed = ranking):**  
  `['name', 'brand', 'code', 'category']` — analogno MiniSearch boostovima (name najvažniji).
- **Filterable attributes:** `category`, `brand` (za catalog_filter i facete).
- **Displayed attributes:** sve što client treba (name, code, category, brand, price, itd.).

### Sinonimi i “compounds”

- **Space-compounds (npr. “play station” → “playstation”):**  
  Meilisearch podržava **multi-word synonyms** (npr. `"play station": ["playstation"]`, `"playstation": ["play station"]`).  
  Mapu možemo generirati iz našeg `catalog-search-vocabulary` (spaceCompounds) i slati na `PUT .../indexes/:index_uid/settings/synonyms`.  
  Asinkrono (202); ažuriranje se primjenjuje nakon završetka taska.

- **Synonym grupe (npr. joystick ↔ gamepad ↔ kontroler):**  
  Isti Settings API: mutual association između termina.  
  Grupe iz kataloga (STORY-134) možemo pretvoriti u Meilisearch format i poslati pri indexiranju ili nakon buildSearchVocabulary ekvivalenta.

- **Dinamički iz kataloga:**  
  Meilisearch ne “čita” katalog — mi ga konfiguriramo API-jem. Flow: učitamo katalog → gradimo vokabular (spaceCompounds + synonymGroups) kao danas → šaljemo dokumente na Meilisearch + `updateSynonyms(...)`. To je “katalogom vođen” u smislu da sadržaj synonyma dolazi iz našeg modula, a Meilisearch ih samo primjenjuje.

### Filtri (category, brand)

- Na search pozivu: `filter: 'category = "Gaming" AND brand = "Sony"'` (sintaksa Meilisearch filter expression).  
- Za faceted UI: `facets: ['category', 'brand']` i koristiti `facetDistribution` u odgovoru.

---

## R4 — Preporuka i sljedeći koraci

### Opcije

- **(a) Full zamjena:**  
  Sve pretrage idu na Meilisearch (indexiranje na serveru nakon uploada/API-ja). MiniSearch i catalog-search-vocabulary se uklone s clienta.  
  **Plus:** jedan engine, konzistentno ponašanje, manje custom koda.  
  **Minus:** obavezan Meilisearch (server ili Cloud), nema pretrage bez njega (npr. samo Excel bez backend indeksa).

- **(b) Hibrid (Meilisearch kad je dostupan, MiniSearch fallback):**  
  Ako je `MEILI_HOST` postavljen i indeks dostupan, koristimo Meilisearch za Stage 1 (i opcionalno hybrid); inače fallback na MiniSearch + vokabular kao danas. LLM selectProducts može ostati za Stage 2 u oba slučaja.  
  **Plus:** radi i bez Meilisearcha (offline / samo Excel), glatka migracija.  
  **Minus:** dva puta (buildSearchIndex vs Meilisearch client), treba odlučiti “tko je source of truth” za synonyme (vokabular vs Meilisearch settings).

- **(c) Ostati na MiniSearch + vokabular:**  
  Nema novih servisa; nastavak s STORY-134 i eventualno fine-tuning tokenizera/synonyma.  
  **Plus:** zero infra, poznato.  
  **Minus:** bez “pravog” hybrid/semantic u engineu, sve semantike preko LLM-a.

### Preporuka

- **Kratkoročno:** **(b) Hibrid** — uvesti Meilisearch kao opciju (env), zadržati MiniSearch + vokabular kao fallback. Omogućuje POC bez “all-in” i bez gubitka offline scenarija.
- **Srednjoročno:** ako POC pokaže da Meilisearch (s našim synonymima) + eventualno hybrid dovoljno dobro rangira, smanjiti broj kandidata koji idu na LLM ili preskočiti LLM za jednostavne upite; ostaviti LLM za složene (model/variant, prirodni jezik).
- **Dugoročno:** ovisno o adoptionu i operativnim mogućnostima — (a) full zamjena ako svi korisnici imaju backend + Meilisearch, ili zadržati (b) ako ostaje potreba za “samo Excel” bez servera.

### Sljedeći koraci

1. **POC / spike:**  
   - Pokrenuti Meilisearch (Docker ili Cloud).  
   - Na serveru: endpoint ili cron koji prima `ProductItem[]`, indeksira dokumente, postavlja searchable/filterable attributes i synonyme (iz buildSearchVocabulary / catalog-search-vocabulary logike).  
   - Search: proxy `catalog.searchProducts` (ili sl.) koji poziva Meilisearch i vraća indekse/rezultate.  
   - E2E ili integracijski test: isti katalog, reprezentativni upiti (npr. “play station”, “joystick”, “USB-C punjači”) — usporediti recall/ranking s MiniSearch + LLM.

2. **Regresija:**  
   - Postojeći product-index i catalog_filter testovi moraju proći ili biti prilagođeni (provider abstraction: MiniSearch vs Meilisearch).

3. **Dokumentacija:**  
   - Ovaj dokument + STORY-135 ažurirani. Nakon POC-a: kratki “Meilisearch setup” u README ili docs.

---

## Izvori

- [Meilisearch Docs](https://www.meilisearch.com/docs) (llms.txt index)
- [Synonyms](https://www.meilisearch.com/docs/learn/relevancy/synonyms.md)
- [Using Meilisearch with Docker](https://www.meilisearch.com/docs/guides/docker.md), [Running in production](https://www.meilisearch.com/docs/guides/running_production.md)
- [Hybrid search](https://www.meilisearch.com/solutions/hybrid-search), [Introducing hybrid search](https://www.meilisearch.com/blog/introducing-hybrid-search)
- [Securing your project](https://www.meilisearch.com/docs/learn/security/basic_security.md)
- [meilisearch-js](https://github.com/meilisearch/meilisearch-js) — JavaScript/TypeScript SDK
