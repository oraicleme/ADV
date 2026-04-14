# Roadmap: RAG nad pravilima pretrage (STORY-201)

**Verzija:** 2026-03-23  
**Povezano:** [STORY-201](../stories/STORY-201-search-rules-rag-long-term.md) · [STORY-196](../stories/STORY-196-search-rule-engine-post-processing.md) · [Arhitektura pretrage](./search-architecture-technical-hr.md) · [Deferred registry (Faza C status)](../deferred-features-registry.md).

## Cilj

Omogućiti **dohvat relevantnih pravila** uz prirodni upit (ne samo točno podudaranje `queryPattern`-a), te ih **spojiti** s postojećim kandidatima (MiniSearch / Meilisearch Stage-1) prije ili uz post-processing.

---

## Faze i moduli

### Faza A — Gotovo (STORY-196–197)

| Modul | Uloga |
|-------|--------|
| `client/src/lib/search-rules-storage.ts` | Trajno pravilo u `localStorage`: `queryPattern`, `productKey`, `action`. |
| `client/src/lib/apply-search-rules.ts` | **Točno** podudaranje upita s `queryPattern`; exclude/downrank nad indeksima / Stage-1 hitovima. |
| `client/src/lib/normalize-search-query.ts` | Zajednička normalizacija upita. |
| `client/src/components/SearchSettingsSection.tsx` | UI za unos pravila. |

### Faza B — PoC u klijentu (STORY-201, “RAG-lite”)

Bez novog servera i bez zasebnog vektorskog indeksa — **leksička sličnost** između trenutnog upita i `queryPattern` svakog pravila.

| Modul | Uloga |
|-------|--------|
| `client/src/lib/search-rules-rag-lite.ts` | `scoreRuleQueryMatch`, `activeRuleKeysFromSemanticMatch` (Jaccard nad tokenima + bonus za substring). |
| `client/src/lib/search-rules-rag-lite-settings.ts` | Zastavica u `localStorage` (`oraicle-search-rules-rag-lite-v1`); uključuje Fazu B. |
| `client/src/lib/apply-search-rules.ts` | Spajanje **točnog** skupa s **semantičkim** kad je RAG-lite uključen. |
| `client/src/components/SearchSettingsSection.tsx` | Checkbox “Similar query matching (STORY-201)”. |

**Trošak:** O(n) po broju pravila (≤ 50); nema mrežnih poziva.

### Faza C — Proizvodnja (budućnost, izvan trenutnog PoC-a)

| Modul | Uloga |
|-------|--------|
| **Zasebni indeks pravila** | Meilisearch indeks `search_rules` **ili** embedder nad tekstom pravila; sinkron s katalogom ili eventom. |
| `server/lib/search-rules-index.ts` (hipotetski) | Ingest REST / batch nakon promjene pravila (ako pravila postanu server-side). |
| `server/routers/catalog.ts` | `retrieveRulesForQuery` — hybrid BM25 + vektor nad dokumentima pravila. |
| **Spajanje** | Kontekst za `selectProducts` ili dodatni filter u Stage-1 — dizajn ovisno o tenantu. |

**Procjena održavanja:** Indeks pravila **odvojen** od kataloga proizvoda smanjuje rizik od pomiješanih ranking pravila; zahtijeva operacije (reindeks, verzije).

### Odbijanje punog vektorskog RAG-a (alternativa)

Ako je broj pravila mali i ostaje u pregledniku, **Faza B** može biti dovoljna; Faza C se odgađa dok product ne zahtijeva višejezične ili parafrazirane politike koje token overlap ne pokriva.

---

## Tok podataka (Faza B)

```
readSearchRules()
       ↓
readSearchRulesRagLiteEnabled() ── false ──► activeRuleKeysExact (STORY-196)
       │
       true
       ↓
activeRuleKeysExact ∪ activeRuleKeysFromSemanticMatch (min score)
       ↓
applySearchRulesToIndices / applySearchRulesToStage1Hits
```

---

## Testovi

- `search-rules-rag-lite.test.ts` — scoring i pragovi.
- `apply-search-rules.test.ts` — mock postavke; točno ponašanje bez regresije.

---

## Referenca datoteka

| Područje | Datoteka |
|----------|----------|
| PoC RAG-lite | `client/src/lib/search-rules-rag-lite.ts` |
| Postavka | `client/src/lib/search-rules-rag-lite-settings.ts` |
| Primjena | `client/src/lib/apply-search-rules.ts` |
