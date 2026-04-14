# Search, Excel Parser, and Vectors — Technical Overview

Short technical reference for the pipeline: **Excel/API → products → Meilisearch index (with optional OpenAI embeddings) → search → LLM rerank**. For deeper context see the linked story files.

---

## 1. How search works

- **Provider:** Meilisearch is the primary (and only) search backend when `MEILI_HOST` and `MEILI_API_KEY` are set. See `server/routers/catalog.ts` → `getSearchProvider`, `server/lib/meilisearch-service.ts`.

- **Hybrid search:** When `OPENAI_API_KEY` is also set, Meilisearch uses **hybrid search**: BM25 (lexical) + semantic vectors (OpenAI `text-embedding-3-small`). Ratio is controlled by `meiliSemanticRatio`. If the OpenAI embedder is not yet registered, search falls back to BM25 only (STORY-140).

- **API:** Client calls `catalog.searchProducts({ query, maxResults, filter })`. Server calls `searchCatalog()` in `meilisearch-service.ts`, which runs `index.search()` with optional `hybrid: { embedder: 'openai', semanticRatio }`. Results are product **indices** (positions in the client’s `products` array) plus `_rankingScore` and optionally `_semanticScore`.

- **Two-stage pipeline (AgentChat):**  
  1. **Stage 1 — Meilisearch:** `searchProducts` returns a ranked list of candidate indices (e.g. top 50–150, scaled by catalog size).  
  2. **Stage 2 — LLM rerank:** `catalog.selectProducts` receives those candidates and the user message; the LLM selects the final product indices.  
  So: **recall** is done by Meilisearch (BM25 + vectors); **selection** is done by the LLM. See STORY-121, STORY-137, and `client/src/components/AgentChat.tsx` → `resolveCatalogFilterActions`.

- **Smart routing (STORY-137):** If the top Meilisearch hits all have score above a confidence threshold, the app can skip the LLM call and use those indices directly (cost and latency optimisation).

**Key files:** `server/lib/meilisearch-service.ts` (`searchCatalog`, `INDEX_SETTINGS`, `buildEmbedderConfig`), `server/routers/catalog.ts` (`searchProducts`, `getSearchProvider`), `client/src/components/AgentChat.tsx` (indexing effect, `resolveCatalogFilterActions`).

---

## 2. How the Excel parser works

- **Entry points:**  
  - `parseExcelFile(file: File)` — used by the UI; prefers a Web Worker (`excel-parser.worker.ts`), falls back to main-thread parsing.  
  - `parseExcelBuffer(buffer: ArrayBuffer)` — core logic; can be used from Worker or directly.

- **Column detection:** The first row is treated as headers. Columns are matched by **name variants** (case-insensitive, trim):
  - **Name:** `name`, `naziv`, `ime`, `opis`, `description`, `product`, `proizvod`, …
  - **Code:** `code`, `šifra`, `sifra`, `kod`, `sku`, `ean`, `barcode`, …
  - **Price:** `price`, `cijena`, `cena`, `eur`, `usd`, `retail`, …
  - **Wholesale:** `vp`, `veleprodaja`, `wholesale`, …
  - **Category:** `category`, `kategorija`, `cat`, `grupa`, `group`, …
  - **Discount:** `popust`, `rabat`, `discount`, …

  At least **name or code** must be detected; otherwise parsing returns an error. There is **no dedicated brand column** in the parser; `brand` on `ProductItem` can be set by other sources (e.g. API) or left empty.

- **Normalisation:**  
  - **Code:** numbers and string codes are normalised to a clean string; Unicode spaces stripped.  
  - **Price:** `normalisePrice()` + currency detection from headers or cell values.  
  - **Discount:** values like `"20%"`, `20`, `0.20` → integer percentage 0–100.

- **Output:** `ParseResult`: `{ products: ProductItem[], errors: string[], stats: ParseStats }`. Products are deduplicated. Each row becomes a `ProductItem` (name, code, price, retailPrice, wholesalePrice, currency, category, optional discountPercent). Empty name+code rows are skipped and counted in stats.

**Key file:** `client/src/lib/excel-parser.ts` (variants, `parseExcelBuffer`, `parseExcelFile`, Worker wiring). Related: `client/src/lib/parse-utils.ts` (normalisePrice, validateProduct, deduplicateProducts).

---

## 3. How parsed text becomes vectors

- **Data flow:**  
  `ProductItem[]` (from Excel or API) → **catalog index manager** (incremental diff) → only **new or changed** products are sent to the server → server builds **Meilisearch documents** and calls `indexCatalog(docs)`.

- **Document shape:** Each document is a `MeiliProductDoc`: `{ id, name, brand, code, category }`.  
  - `id` = position in the full catalog array (stable index for search results and deletes).  
  - Server maps `ProductItem` → doc with `brand: p.brand ?? ''`, `code: p.code ?? ''`, `category: p.category ?? ''`.  
  See `server/routers/catalog.ts` → `indexProducts` and `server/lib/meilisearch-service.ts` → `MeiliProductDoc`.

- **Embedder config:** In `meilisearch-service.ts`, the OpenAI embedder is configured with a **document template** that defines the text sent to OpenAI for each document:
  ```ts
  documentTemplate: '{{doc.name}} {{doc.brand}} {{doc.code}} {{doc.category}}'
  ```
  So the string that gets embedded is the concatenation of name, brand, code, and category (with spaces). Same model is used at **query time** for the user’s search query.

- **When embeddings are created:**  
  - **Index time:** When the client calls `indexProducts`, Meilisearch receives the docs and, if the OpenAI embedder is configured, calls the OpenAI API for each new/updated document (via Meilisearch’s native embedder integration).  
  - **Query time:** Each search query is also embedded by Meilisearch using the same embedder; hybrid search combines BM25 and vector similarity.  
  Model: **text-embedding-3-small** (multilingual, supports BCS/EN and semantic bridging without synonym tables). See STORY-138, STORY-140.

- **Incremental indexing (STORY-139):** The client does not send the full catalog every time. `catalog-index-manager.ts` maintains a per-product hash (`name|brand|code|category`) and state in localStorage. On each catalog load it computes a diff: **toUpsert** (new or changed) and **toDeleteIds** (removed). Only `toUpsert` is sent to `indexProducts`; `deleteProducts(toDeleteIds)` removes obsolete docs. So OpenAI is only called for changed products, not the entire catalog on every load.

**Key files:** `server/lib/meilisearch-service.ts` (`buildEmbedderConfig`, `indexCatalog`, `INDEX_SETTINGS`), `server/routers/catalog.ts` (`indexProducts`, `deleteProducts`), `client/src/lib/catalog-index-manager.ts` (`hashProduct`, `computeCatalogDiff`, `loadIndexState`, `saveIndexState`), `client/src/components/AgentChat.tsx` (effect that runs diff and calls `indexProducts` / `deleteProducts`).

---

## Quick reference

| Topic            | Where to look |
|-----------------|----------------|
| Search API      | `server/routers/catalog.ts` → `searchProducts` |
| Hybrid + embedder | `server/lib/meilisearch-service.ts` → `searchCatalog`, `buildEmbedderConfig` |
| Two-stage + routing | `client/src/components/AgentChat.tsx` → `resolveCatalogFilterActions` |
| Excel → ProductItem | `client/src/lib/excel-parser.ts` → `parseExcelBuffer`, column variants |
| ProductItem → vectors | `catalog-index-manager.ts` (diff) → `indexProducts` → Meilisearch + `documentTemplate` → OpenAI |

Stories: STORY-121 (two-stage), STORY-136 (Meilisearch), STORY-137 (hybrid + routing), STORY-138 (OpenAI embedder), STORY-139 (incremental index), STORY-140 (embedder config + BM25 fallback).
