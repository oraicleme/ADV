# Dopuna izvještaja: status implementacije (Oraicle Retail Promo — pretraga)

**Datum:** 2026-03-23  
**Svrha:** Originalni tekst *„Izvještaj o poboljšanju sustava pretrage…”* ostaje dobar kao **problemski / ciljni** dokument. Ovaj dodatak navodi **što je u međuvremenu isporučeno u kodu**, što je **djelomično**, a što je **namjerno odgođeno**, kako bi se zaključak i poglavlja 4–6 mogli ažurirati bez proturječja s repozitorijem.

**Izvori istine u repou:** `docs/search-improvements-roadmap.md` · `docs/search-architecture-technical-hr.md` · `docs/deferred-features-registry.md` · `docs/search-rules-rag-roadmap.md` · `docs/stories/TRACKER.md`.

---

## 1. Poglavlje 3 — „Slabosti” vs. današnje stanje

| Točka iz izvještaja | Status | Napomena |
|---------------------|--------|----------|
| **Nedostatak perzistentnih korisničkih pravila** | **Riješeno (MVP)** | **STORY-196:** pravila u `localStorage`, post-processing nakon MiniSearch / nakon Meilisearch kandidata (`apply-search-rules.ts`, `search-rules-storage.ts`). Nije nužno „baza” — model je definiran u priči. |
| **Diskonekcija ručna vs. AI pretraga** | **Djelomično** | **STORY-197:** zajednička normalizacija upita (`normalize-search-query.ts`), matrica u arhitekturi. **Opcija** iz izvještaja — isti Meilisearch za ručnu pretragu u UI — **nije** implementirana (namjerni tradeoff: latencija, offline); vidi `docs/deferred-features-registry.md` §2. |
| **Ograničen kontekst LLM-a (recall Stage-1)** | **Djelomično** | **STORY-198:** opcionalno LLM proširenje upita prije Stage-1 (env + `VITE_*`). **STORY-199:** pametno usmjeravanje / prag pouzdanosti (`shouldSkipSelectProductsLLM`). Ako Meilisearch i dalje ne vrati SKU, LLM i dalje ne „stvara” proizvode — to je i dalje fundamentalno ograničenje. |
| **Hladni start vokabulara / namjera** | **Djelomično** | Vokabular iz kataloga i pravila pomažu; složena namjera bez tragova u katalogu i dalje može patiti od recall-a — to je kontinuirani rad, ne jedna priča. |

---

## 2. Poglavlje 4 — Prijedlozi vs. implementacija

### 4.1 Rule engine

| Prijedlog | Status |
|-----------|--------|
| Post-processing sloj (queryPattern, exclude/downrank) | **Shipped** — STORY-196. |
| Dinamički Meilisearch filteri po pravilima | **Nije** — i dalje post-processing nad kandidatima; indeks proširen za „pravilo po upitu” nije rad. |
| RAG nad pravilima | **Djelomično** — **STORY-201:** klijentski **RAG-lite** (leksička sličnost), opt-in. **Puni** indeks pravila na serveru (**Faza C**) — **odgođeno**; `docs/search-rules-rag-roadmap.md`. |

### 4.2 Hibrid, proširenje upita, smart routing

| Prijedlog | Status |
|-----------|--------|
| Hibrid BM25 + embedding (kad je ključ/konfiguracija) | Postojeći stack; podešavanje **STORY-199**. |
| LLM proširenje upita prije Meilisearcha | **STORY-198** (opcionalno, kontrolirano envom). |
| Smart routing / skip LLM rerank | **STORY-199** (`meilisearch-smart-routing.ts`, pragovi). |

### 4.3 Konzistencija ručna vs. AI

| Prijedlog | Status |
|-----------|--------|
| Unificirani klijentski indeks (Meilisearch umjesto MiniSearch za ručno) | **Nije** — eksplicitno odgođeno u STORY-197 / `deferred-features-registry.md`. |
| Dijeljeni vokabular i pravila | Pravila i normalizacija da; potpuno isti ranking i dalje nije cilj ako server-backed ručno nije uvedeno. |

### 4.4 Povratna sprega

| Prijedlog | Status |
|-----------|--------|
| Implicitna (npr. odčekiravanje AI odabira) | **STORY-200** — telemetrija, privacy-first hashovi. |
| Eksplicitna (relevantno / nije) | **STORY-200** — palčevi + događaji; nacrt pravila prema STORY-196 bez auto-primjene. |

---

## 3. Što izvještaj **nije** pokrivao a danas postoji (operativno)

- **`pnpm run smoke`** — `vitest run && vite build` (STORY-203).  
- **`docs/deferred-features-registry.md`** — jedan popis odgođenog (Faza C RAG pravila, server-backed ručno, …).  
- **`docs/qa-manual-smoke-retail-promo.md`** — ručni smoke za Retail Promo.

To ne mijenja algoritam pretrage, ali mijenja **operativnu** sliku „zrelosti” proizvoda.

---

## 4. Predloženi novi zaključak (za ugradnju u izvještaj)

> Većina preporuka iz ovog izvještaja adresirana je kroz seriju implementacijskih priča (**STORY-196–201**): perzistentna pravila i post-processing, normalizacija i usklađivanje tokova gdje je predviđeno, opcionalno LLM proširenje upita i pametno usmjeravanje hibrida, te povratna sprega korisnika. Potpuno isti Meilisearch za ručnu pretragu u pregledniku i **puni** RAG/indeks pravila na serveru ostaju **planirani** koraci kada proizvod zahtijeva višejezičnost, više uređaja ili compliance — vidi `docs/deferred-features-registry.md` i `docs/search-rules-rag-roadmap.md` (Faza C).

---

## 5. Reference [1] u izvještaju

Umjesto generičkog „pasted_content.txt”, kao interna referenca [1] treba koristiti:

- `docs/search-architecture-technical-hr.md` — trenutno stanje (ručno vs. AI, pravila, feedback).

Vanjske Meilisearch reference [2]–[5] mogu ostati kao smjernice; ne definiraju obvezujući Oraicle stack.
