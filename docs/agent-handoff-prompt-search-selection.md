# Handoff prompt za novog agenta: problem sa pretragom i selekcijom proizvoda

Kopiraj ceo tekst ispod i zalepi u novi chat kao prompt za agenta.

---

## Kontekst

Korisnik radi na retail-promo aplikaciji (Oraicle): učitava Excel sa 6213 proizvoda, u levom panelu ima "Search by name or code..." i filtere po kategorijama (Category, Auto Moto, Džepni punjači, Mobilni telefoni, itd.). Glavni naslov na canvasu je "Brzi USB-C punjači za aut" (brzi USB-C punjači za auto).

**Problem:** I dalje isti problem — u interfejsu piše **"0 of 6213 selected for ad"**. Znači ni jedan proizvod nije izabran za reklamu, iako je naslov o USB-C punjačima za auto. Korisnik očekuje da će ili:
- pretraga u levom panelu ("Search by name or code...") vratiti relevantne proizvode kada upiše "auto punjači" / "punjaci" / "USB-C punjač", ili
- AI agent u chatu (kada korisnik zatraži npr. "daj mi reklamu za auto punjače USB-C") poslati `catalog_filter` akciju koja izabere odgovarajuće proizvode, tako da canvas prikaže USB-C punjače za auto, a ne 0 izabranih.

## Šta je već urađeno (ne ponavljaj, samo proveri da nije regresija)

1. **Diakritici (punjaci = punjači)**  
   U `client/src/lib/product-search.ts`:  
   - `normalize()` i `normalizeForMatch()` stripuju diakritike (č→c, ž→z, š→s, đ→d).  
   - Za single-term pretragu koristi se isti normalize i dvosmerni substring (query uključuje field ili field uključuje query).  
   U `client/src/lib/agent-actions.ts`:  
   - Za `catalog_filter`, single-term `nameContains` i poređenje **category** koriste `normalize()` iz product-search, tako da "Punjaci za auto" i "Punjači za auto" budu isto.

2. **Relevantnost (STORY-111)**  
   U `product-search.ts`:  
   - Connector mismatch (npr. upit USB-C, proizvod samo Lightning) → isključi.  
   - Namera "punjač" + proizvod tipa adapter/kabl (bez punjača u kategoriji) → isključi.

3. **Agent prompt**  
   U `client/src/lib/agent-chat-engine.ts`:  
   - Sistem prompt kaže da kada je `catalogSummary` u state-u i `selectedCount=0`, agent MORA da pošalje `catalog_filter` na prvi turn.  
   - category mora biti TAČAN string iz `catalogSummary.categories[].name`.  
   - nameContains treba da bude iz `sampleNames` (vokabular kataloga).

## Šta treba da uradiš (zadatak za agenta)

1. **Proveri tok podataka**
   - Odakle dolaze `products` u `AgentChat` i kako se popunjavaju `selectedProductIndices` nakon akcija.  
   - Gde se primenjuje `catalog_filter`: u `applyAgentActions` u `agent-actions.ts` (koristi `filterProductsIntelligent` i category filter).  
   - Da li se odgovor LLM-a (JSON sa `actions`) uopšte parsira i da li se `catalog_filter` akcija šalje u `applyAgentActions` sa `allProducts` i `setSelectedProductIndices`.  
   Proveri: u kom komponentu se poziva `applyAgentActions` i da li mu se prosleđuju `allProducts` i `setSelectedProductIndices`.

2. **Proveri formiranje catalogSummary**
   - U `AgentChat.tsx`, `catalogSummary` se gradi iz `products`: kategorije su sve različite vrednosti `p.category`.  
   - Proveri da li u realnom katalogu (6213 proizvoda) postoje kategorije tipa "Punjači za auto" ili "Džepni punjači" ili drugačiji naziv.  
   - Ako korisnik traži "USB-C punjači za auto", agent mora da izabere **tačan** naziv kategorije iz `catalogSummary.categories` (npr. "Punjači za auto" ili ono što stvarno postoji u podacima).  
   - Proveri da li se `catalogSummary` (uključujući `categories` i `sampleNames`) ispravno ubacuje u state koji se šalje LLM-u (npr. kroz `serializeCanvasState` u `ad-canvas-ai.ts`).

3. **Proveri da li LLM uopšte šalje catalog_filter**
   - Dodaj privremeni console.log u mestu gde se parsiraju akcije iz odgovora agenta: da li u nizu `actions` postoji `type: "catalog_filter"` i kakav je `payload` (nameContains, category, maxSelect).  
   - Ako agent ne šalje `catalog_filter` kada je selectedCount=0 i korisnik traži punjače, problem je u promptu ili u tome šta LLM vidi (npr. nedostaje catalogSummary u state-u).

4. **Proveri manual pretragu u levom panelu**
   - Polje "Search by name or code..." u `ProductFilter` / `ProductDataInput`: da li se za upit "auto punjaci" ili "USB-C punjač" poziva `filterProductsIntelligent(products, query, { searchFields: ['name','code','brand'], fuzzyMatch: true })`.  
   - Da li se `visibleIndices` (rezultat te pretrage) koristi ispravno za prikaz u listi proizvoda i da li se "X of Y selected" računa od `selectedProductIndices`, a ne od pretrage.  
   (Selekcija za reklamu je odvojena od pretrage: pretraga samo filtrira šta se vidi u listi; "Select all" / pojedinačno štikliranje ili `catalog_filter` određuju koji su "selected for ad".)

5. **Konkretno za "0 of 6213 selected"**
   - Ako korisnik nije ručno izabrao proizvode i očekuje da ih agent izabere: agent mora vratiti `catalog_filter` sa ispravnim `category` (tačan naziv iz kataloga za punjače za auto) i po želji `nameContains` (npr. "USB-C" ili "Type-C" ako to ima u sampleNames).  
   - Ako agent vrati `catalog_filter` a i dalje je 0 selected: proveri da li `applyAgentActions` uopšte dobija `allProducts` i da li rezultat `filterProductsIntelligent` + category filter daje neprazan niz indeksa.  
   - Dodaj jedan unit test u `agent-actions.test.ts`: sa nizom proizvoda koji imaju category "Punjači za auto" i name "USB-C Punjač 20W", pozovi `applyAgentActions` sa jednom akcijom `catalog_filter` sa `nameContains: "USB-C"`, `category: "Punjači za auto"` i proveri da je `setSelectedProductIndices` pozvan sa nepraznim Set-om.

6. **Dokumentacija**
   - Ako utvrdiš uzrok (npr. "LLM ne šalje catalog_filter" ili "category se ne poklapa jer u Excelu piše drugačije"), kratko zabeleži u `docs/` ili u komentar u kodu kako da se izbegne ponovo.

## Ključne datoteke

- `client/src/lib/product-search.ts` — tokenizacija, normalize, filterProductsIntelligent, searchProducts, relevance (STORY-111).  
- `client/src/lib/agent-actions.ts` — applyAgentActions, catalog_filter logika (nameContains + category), normalize za diakritike.  
- `client/src/lib/agent-chat-engine.ts` — sistem prompt za agenta, pravila za catalog_filter i catalogSummary.  
- `client/src/components/AgentChat.tsx` — catalogSummary useMemo, prosleđivanje state-a agentu, gde se poziva applyAgentActions (ili ekvivalent).  
- `client/src/components/ProductDataInput.tsx` — pretraga (visibleIndices), ProductFilter.  
- `client/src/lib/ad-canvas-ai.ts` — CatalogSummary tip, serializeCanvasState (ubacuje catalogSummary u meta).

## Kako potvrditi da je rešeno

- Učitaj katalog sa punjačima (npr. 6213 proizvoda koji uključuju kategoriju tipa "Punjači za auto" ili "Džepni punjači").  
- U chatu napiši: "Daj mi reklamu za brze USB-C punjače za auto."  
- Očekivano: canvas pokazuje naslov o USB-C punjačima i **bar nekoliko proizvoda izabranih za reklamu** (npr. "6 of 6213 selected" ili slično), a ne "0 of 6213 selected".  
- U levom panelu u "Search by name or code..." upiši "auto punjaci" (bez č) i "auto punjači" (sa č): oba treba da prikažu iste relevantne proizvode (punjači).

Kraj handoff prompta.
