# Handoff: Agent za provjeru pretrage proizvoda i industry best practice

**Zadatak za novog agenta:** Istraži zašto pretraga proizvoda do sada nije davala dobre rezultate, pregledaj novu story (STORY-116, STORY-117) i usporedi s best industry manner. Korisnik kaže da "ovo za sada nicemu ne vodi" — treba konkretna analiza i prijedlozi.

---

## 1. Što provjeriti — zašto rezultati nisu bili dobri

- **Povijest:** Fuzzy pretraga (name/code/brand), zatim uklonjena product-specific logika (STORY-116), zatim dodan "Pretraži s AI" (STORY-117). Ipak, korisnik i dalje nije zadovoljan.
- **Mogući uzroci koje agent treba provjeriti:**
  - Je li **katalog** problem? (npr. 3000+ "Bez klasifikacije", kategorije ne odgovaraju načinu na koji korisnik traži?)
  - Je li **nameContains + jedna kategorija** premalo za realne upite? (npr. "futrole za iPhone 17" = category "Futrole" + nameContains "iPhone 17"?)
  - Je li **interpretProductSearch** prompt preuzak ili LLM vraća krive kategorije/termine?
  - Je li **UI** problem? (korisnik ne vidi gumb ✨, ne koristi AI, očekuje da običan search "samo radi"?)
  - Je li **token/fuzzy** matching previše labav ili previše strog za 6000+ proizvoda?
- **Akcija:** Pročitaj `client/src/lib/product-search.ts`, `client/src/lib/agent-actions.ts` (catalog_filter), `server/routers/catalog.ts` (interpretProductSearch), `client/src/components/ProductDataInput.tsx` i `ProductFilter.tsx`. Prođi flow od upisa u search do prikaza liste. Zabilježi točne točke neuspjeha (npr. "LLM vraća praznu kategoriju", "fuzzy ne nalazi 'punjači' u category polju").

---

## 2. Pregled novih storyja (STORY-116, STORY-117)

- **STORY-116 (Universal Search):** Jedan algoritam, bez fallbacka i bez product-type logike. Kada kategorija nije u katalogu → 0 rezultata.
  - Provjeri: Je li to poželjno ili korisnik očekuje "barem nešto slično"? Ima li smisla jedan blagi fallback (npr. fuzzy na category name) kad exact = 0?
- **STORY-117 (AI Product Search):** Gumb ✨ poziva `interpretProductSearch`, postavlja nameContains + category.
  - Provjeri: Je li prompt u `server/routers/catalog.ts` dovoljno jasan (EXACT category name, 1–2 riječi za nameContains)? Je li 30 sample names dovoljno za veliki katalog? Što ako su kategorije na hrvatskom/srpskom a korisnik piše na engleskom ili obrnuto?
- **Akcija:** Pročitaj obje story datoteke i navedene fileove. Napiši kratku evaluaciju: što je dobro, što nedostaje, što može lako puknuti u produkciji.

---

## 3. Best industry manner — što usporediti

- **E-commerce search (Amazon, Google Shopping, webshopovi):**
  - Obično: **jedan search box** koji odmah pretražuje (full-text ili semantic), bez obaveznog odabira "kategorije" prije toga.
  - Faceted search: nakon upita prikažu se **faceti** (kategorija, brend, cijena) za sužavanje; korisnik ne mora unaprijed znati točnu kategoriju.
  - Typo tolerance, synonymi, "did you mean?", autocomplete.
- **Algolia / Elasticsearch pristup:**
  - Jedan upit → ranking po relevance (TF-IDF, BM25, ili embedding). Kategorija je jedan od atributa za filtering **nakon** što search vrati rezultate.
  - Često: search vraća rezultate, pa se faceti (uključujući kategoriju) izračunaju iz tih rezultata.
- **Što to znači za naš slučaj:**
  - Da li bi trebali ići prema "jedan search box → odmah rezultati (fuzzy/semantic)" i **opciono** facete (kategorija, brend) za sužavanje, umjesto "AI pretvori upit u nameContains + category pa filtriraj"?
  - Je li "Pretraži s AI" kao poseban gumb industry standard ili bi Enter u search polju trebao raditi kao "smart search" (jedan poziv, bez obaveznog klika na ✨)?
- **Akcija:** Ukratko navedi 3–5 konkretnih principa iz best practice koja trenutna implementacija krši ili ne ispunjava. Za svaki princip predloži jednu konkretnu promjenu (npr. "Enter u search = poziv interpretProductSearch ako je upit duži od X znakova").

---

## 4. Konkretni output koji agent treba dostaviti

1. **Kratak izvještaj (1–2 stranice):**
   - Zašto pretraga do sada nije davala dobre rezultate (uzroci, s referencama na kod).
   - Ocjena STORY-116 i STORY-117: što je dobro, što nedostaje.
   - Uskladivanje s industry best practice: što nedostaje, što bi trebalo promijeniti.

2. **Lista konkretnih prijedloga (prioritizirano):**
   - Brzi fixevi (npr. poboljšanje prompta, veći sampleNames, Enter = AI search).
   - Srednji (npr. faceted search nakon prvog upita, bolji empty state).
   - Dugoročno (npr. semantic search / embeddings ako je to u sklopu projekta).

3. **Ako agent preporuči promjene u kodu:** napravi ih u skladu s story-driven workflow (story file, testovi, TRACKER). Ako samo analiza — napiši dokument u `docs/` (npr. `docs/search-review-findings.md`) i u njemu navedi preporuke.

---

## 5. Ključne datoteke za čitanje

| Što | Put |
|-----|-----|
| Fuzzy/token search | `client/src/lib/product-search.ts` |
| catalog_filter (odabir proizvoda) | `client/src/lib/agent-actions.ts` |
| AI interpret search (backend) | `server/routers/catalog.ts` → interpretProductSearch |
| Sidebar search + ✨ gumb | `client/src/components/ProductFilter.tsx`, `ProductDataInput.tsx` |
| Kako agent chat šalje catalog_filter | `client/src/lib/agent-chat-engine.ts` (prompt), `AgentChat.tsx` (serializeCanvasState, catalogSummary) |
| Story 116 | `docs/stories/STORY-116-universal-search-logic.md` |
| Story 117 | `docs/stories/STORY-117-ai-product-search.md` |

---

## 6. Kataloški kontekst (za reprodukciju)

- Učitava se Excel s ~6213 proizvoda; velik broj u kategoriji "Bez klasifikacije".
- Kategorije uključuju npr. "Futrole za mob. tel.", "Punjači za auto", "Baterije za mob. tel.", "Držači za mob. tel.", itd.
- Korisnik tipično traži: "auto punjači usb-c", "sve futrole za iPhone 17", "držači za kola" — prirodni jezik, ne točan naziv kategorije.

Agent treba koristiti ovaj handoff kao ulazni brief i vratiti izvještaj + prijedloge (i po mogućnosti kod promjene) kao output.
