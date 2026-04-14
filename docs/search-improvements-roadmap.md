# Roadmap: Poboljšanja sustava pretrage (Oraicle Retail Promo)

**Verzija:** 2026-03-23  
**Povezani dokumenti:** [Tehnička arhitektura (trenutno stanje)](./search-architecture-technical-hr.md) · Izvještaj o poboljšanjima (korisnički ulaz).

Ovaj roadmap razbija predložena poboljšanja u **faze s ovisnostima**, s mapiranjem na **`docs/stories/STORY-*.md`**.

---

## Ciljevi (iz izvještaja)

| Cilj | Glavna priča |
|------|----------------|
| Perzistentna korisnička pravila (isključivanje / deprioritizacija) | [STORY-196](stories/STORY-196-search-rule-engine-post-processing.md) |
| Konzistencija ručne vs AI pretrage | [STORY-197](stories/STORY-197-search-manual-ai-consistency.md) |
| Bolji recall (proširenje upita prije Meilisearcha) | [STORY-198](stories/STORY-198-search-llm-query-expansion-stage1.md) |
| Podešavanje hibrida i smart routinga | [STORY-199](stories/STORY-199-search-hybrid-routing-tuning.md) ✅ |
| Povratna sprega (implicitna / eksplicitna) | [STORY-200](stories/STORY-200-search-feedback-loop.md) ✅ |
| RAG nad pravilima (PoC + fazirani plan) | [STORY-201](stories/STORY-201-search-rules-rag-long-term.md) ✅ · [moduli / faze](./search-rules-rag-roadmap.md) |

---

## Faze implementacije

### Faza 1 — Pravila i kontrola rezultata (najviši poslovni utjecaj)

- **STORY-196** — Sloj **post-processing** pravila: nakon MiniSearch / nakon Meilisearch kandidata, prije (ili uz) LLM rerank. MVP: `localStorage` ili postojeći storage uz jasan model `(queryPattern | queryHash, action: exclude | downrank, productKey)`.
- **Ovisnost:** nema; može paralelno s dokumentacijom env varijabli u STORY-199.

### Faza 2 — Konzistencija UX-a

- **STORY-197** — Smanjiti divergenciju ručnog (MiniSearch + min-score) i agent (Meilisearch) toka: zajednička normalizacija, dijeljeni vokabular gdje već postoji, opcija **server-backed** ručne liste kad je Meilisearch dostupan (dizajn odluke u priči).

### Faza 3 — Recall i kvaliteta kandidata

- **STORY-198** — Opcionalno **LLM query expansion** prije Stage-1 (uz kontrolu troška i cache), za slučajeve kad Meilisearch ne pokupi relevantne SKU-ove.
- **STORY-199** — Pregled i podešavanje **hybrid** konfiguracije, `MEILI_CONFIDENCE_THRESHOLD`, dokumentacija i po potrebi UI hints u Workspace Settings.

### Faza 4 — Učenje iz ponašanja

- **STORY-200** — Telemetrija / eksplicitni signal „relevantno / nije“; opcija generiranja **nacrta pravila** za STORY-196 (bez automatskog primjenjivanja dok korisnik ne potvrdi).

### Faza 5 — Napredno (STORY-201)

- **STORY-201** ✅ — **PoC u klijentu (RAG-lite):** leksička sličnost upita i `queryPattern`, opt-in u Search settings; vidi `client/src/lib/search-rules-rag-lite.ts` i **`docs/search-rules-rag-roadmap.md`** (Faza B). **Budućnost (Faza C):** zasebni indeks pravila (Meilisearch/embeddings) — odvojeno od kataloga; ovisi o STORY-196 modelu i skalabilnosti.

---

## Preporučeni redoslijed

```
196 (pravila) ─┬─► 200 (feedback → pravila)
               │
197 (konzistencija) ──► 198 (expansion) ──► 199 (routing)
                                               │
201 (RAG pravila — PoC + roadmap) ──────────────┘
```

---

## Reference (vanjski)

- Interna arhitektura: `docs/search-architecture-technical-hr.md`
- Meilisearch: hibridna pretraga, RAG pipeline (javna dokumentacija — koristiti kao smjernicu, ne kao obvezujuću specifikaciju Oraiclea)

---

## Tracker

Povezane stavke u **`docs/stories/TRACKER.md`:** **STORY-196…201** završeni; sljedeći id za nove priče vidi zaglavlje trackera. Detalji modula: **`docs/search-rules-rag-roadmap.md`**. Status izvještaja (HR): **`docs/izvjestaj-poboljsanja-pretrage-status-dopuna.md`**.
