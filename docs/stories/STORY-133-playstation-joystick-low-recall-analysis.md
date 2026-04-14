# STORY-133: Duboka analiza — zašto "Play Station oprema i joystick" vraća samo 4 rezultata

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client + server (pretraga i selectProducts)

## What

Korisnik upiše prompt tipa **"treba mi reklama sa play station opremu i joystick system"**; sistem nađe samo **4 proizvoda** iako u katalogu (npr. Mobileland 34k+ proizvoda) ima daleko više relevantnih (PlayStation oprema, kontroleri, džojstici). Treba **duboka analiza uzroka** i implementacija poboljšanja recalla za ovakve upite.

## Why

- Loš recall za gaming/peripheral termine (PlayStation, joystick, gamepad, kontroler) daje loše iskustvo: korisnik očekuje punu ponudu, a vidi 4 proizvoda.
- Isti problem može nastati i za druge domene (npr. "Apple oprema", "Samsung punjači") ako tokenizacija ili vokabular ne pokrivaju varijante pisanja i sinonime.

## Kontekst iz loga (terminal)

- `[selectProducts] Succeeded on attempt 2/3, returning 4 indices.`
- Znači: LLM je uspješno vratio 4 indeksa. Ograničenje nije u LLM-u nego u **broju kandidata** koji su mu poslani.
- Pipeline: **Stage 1** MiniSearch (`queryIndex`) vraća N kandidata → **Stage 2** `catalog.selectProducts` prima te kandidate i LLM bira među njima. Ako Stage 1 vrati samo 4 kandidata, LLM može vratiti najviše 4.

## Utvrđeni uzrok (nakon implementacije)

- **Uzrok je Stage 1 (MiniSearch) recall:** kad korisnik upiše "play station" (s razmakom), tokenizer je vraćao samo `play` i `station`. Proizvodi u katalogu imaju "PlayStation" (jedna riječ) → token `playstation`. Bez spoja "play" + "station" → "playstation" upit nije dobro matchao. Isto: "joystick" nije pokrivao proizvode s "gamepad" ili "kontroler".
- **Rješenje:** (1) space-joined compounds u tokenizeru: `play` + `station` → `playstation`, `dual`+`shock` → `dualshock`, `dual`+`sense` → `dualsense`. (2) Query expansion: upit koji sadrži jedan od [joystick, gamepad, kontroler, dzojstik, gejmpad] proširuje se s ostalim terminima tako da MiniSearch vidi sve varijante.

## Hipoteze uzroka (za analizu)

1. **MiniSearch recall (najvjerojatnije)**  
   - Upit: "treba mi reklama sa play station opremu i joystick system" → u `queryIndex` se šalje cijeli string ili ekstrahirani ključevi.  
   - Tokenizacija: "play station" → tokeni `play`, `station`; "joystick" → `joystick`. U katalogu proizvodi mogu imati: "PlayStation" (jedna riječ → token `playstation`), "DualShock", "gamepad", "kontroler", "džojstik".  
   - Ako nema normalizacije "play" + "station" → "playstation" ili sinonim "joystick" = "gamepad" = "kontroler", MiniSearch vraća malo hitova.  
   - **Provjera:** u `product-index.ts` tokenizer (miniTokenize) ne dodaje sinonime; compound T-1 pokriva npr. "USB-C" → "usbc", ali ne "play station" → "playstation".

2. **Broj kandidata (candidateCount)**  
   - U AgentChat: `candidateCount = min(150, max(50, ceil(N * 0.03)))` za N > 150. Za 34k proizvoda to je 150.  
   - Dakle cap nije 4; problem je što **queryIndex za taj upit vraća samo 4 hita** (nisu poslani svi proizvodi, nego samo oni koji matchaju query).

3. **Što šaljemo u queryIndex**  
   - Šalje se `p.query` iz catalog_filter akcije — vjerojatno cijeli user message ili ekstrahirani dio. Ako agent pošalje previše "šuma" ("treba mi reklama sa ...") umjesto samo "play station oprema joystick", tokeni mogu razrijediti score.

4. **Katalog: polja u indeksu**  
   - MiniSearch indeksira (vjerojatno) name, code, category, brand. Ako PlayStation proizvodi nemaju "PlayStation" u name/brand/category nego npr. "Sony" ili drugi naziv, recall padne.

5. **LLM bira podskup**  
   - Moguće da LLM primi npr. 50 kandidata i vrati samo 4 jer interpretira "najrelevantnije". To se vidi iz raw response (`.tmp/ionet-selectProducts/response-*.json`). Ako u response ima npr. 4 indeksa a u payloadu candidates.length > 4, onda je uzrok u LLM odabiru; ako je candidates.length === 4, uzrok je Stage 1.

## Acceptance Criteria

- [x] **P1** Dokumentirana analiza: sekcija "Utvrđeni uzrok" u ovoj priči (Stage 1 recall).
- [x] **P2** Poboljšan recall za gaming/peripheral upite: queryIndex za "play station joystick" / "playstation oprema" vraća više od 4 kada katalog ima više od 4 takva proizvoda.
- [x] **P3** Tokenizacija: (a) space-joined compounds "play station"→"playstation", dual shock/sense; (b) query expansion za joystick/gamepad/kontroler/dzojstik/gejmpad.
- [x] **P4** Regresija: product-index, product-search-pipeline.e2e, agent-actions testovi prolaze.

## Test Plan

- [x] **T1** product-index.test.ts: gaming katalog (10 proizvoda), upit "play station joystick" / "playstation oprema" → više od 4 rezultata.
- [x] **T2** "play station" (s razmakom) matcha proizvode s "PlayStation" u nazivu; "joystick" matcha proizvode s "gamepad"/"kontroler".
- [x] **T3** Regresija: product-index (35), product-search-pipeline.e2e (24), agent-actions (70) prolaze.
- [ ] **T4** (Opcionalno) Ručno na pravom katalogu.

## Files Changed

- `client/src/lib/product-index.ts` — SPACE_COMPOUNDS (play+station→playstation, dual+shock/sense); expandSearchQuery() s GAMING_SYNONYMS; queryIndex koristi expandedQuery.
- `client/src/lib/product-index.test.ts` — STORY-133 describe: gamingCatalog, 4 testa (play station match, play station joystick/playstation oprema, joystick→gamepad/kontroler, gamepad).
- `docs/stories/STORY-133-*.md` — Utvrđeni uzrok, kriteriji i test plan označeni.

## Notes

- Prvi korak: **utvrditi uzrok** — u `.tmp/ionet-selectProducts/response-*.json` pogledati koliko kandidata je poslano (candidates.length u requestu nije spremljen u response; moguće je dodati log u AgentChat: "candidates sent: N"). Ili dodati privremeni log u catalog.ts (input.candidates.length). Ako je candidates.length === 4, uzrok je 100% Stage 1 (MiniSearch).
- Vokabular za gaming: "PlayStation", "play station", "PS5", "DualSense", "DualShock", "gamepad", "kontroler", "joystick", "džojstik", "gejmpad" — treba pokriti bar dio ovih u indeksu ili u query expansionu.
- STORY-110 (compound tokens), STORY-121 (MiniSearch), STORY-124 (minScore 0 da LLM ne bude "starved") su povezane; ne mijenjati ponašanje bez regresijskih testova.
