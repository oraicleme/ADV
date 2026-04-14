# STORY-142: Technical Documentation — Search, Excel Parser, and Vectors

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** docs (technical documentation)

---

## What

Add a short technical document that explains:

1. **How search works** — Meilisearch hybrid (BM25 + semantic), two-stage pipeline (search → LLM rerank), and smart routing.
2. **How the Excel parser works** — column detection, variants (name/code/price/category…), parsing flow, and output shape (`ProductItem[]`).
3. **How parsed text becomes vectors** — from `ProductItem` to Meilisearch document, OpenAI embedder config (`documentTemplate`), and when embeddings are created (index time and query time).

The doc is for developers and future agents: no new code or tests, only accurate technical description.

---

## Why

The flow “Excel → products → search” spans client (excel-parser, catalog-index-manager, AgentChat), server (catalog router, meilisearch-service), and external APIs (OpenAI). There is no single place that describes the full pipeline. A small tech doc reduces onboarding time and prevents wrong assumptions when changing search or parser behaviour.

---

## Acceptance Criteria

- [x] New doc exists at `docs/technical/search-excel-vectors.md` (or equivalent path).
- [x] **Search:** Describes Meilisearch as primary provider; hybrid search (BM25 + OpenAI embeddings when `OPENAI_API_KEY` set); `searchProducts` → `searchCatalog`; two-stage pipeline (Meilisearch candidates → `catalog.selectProducts` LLM rerank); optional BM25 fallback when embedder missing (STORY-140).
- [x] **Excel parser:** Describes `parseExcelBuffer` / `parseExcelFile`; column matching via name variants (name, naziv, code, šifra, price, category, …); normalisation (code, price, discount); output `ParseResult` with `ProductItem[]`; optional Web Worker; no brand column in parser (brand can come from API/other source).
- [x] **Vectors:** Describes `ProductItem` → `MeiliProductDoc` (id, name, brand, code, category); incremental indexing (catalog-index-manager, hash, diff); Meilisearch embedder config `documentTemplate: '{{doc.name}} {{doc.brand}} {{doc.code}} {{doc.category}}'`; OpenAI `text-embedding-3-small` at index time (per document) and at query time; where config lives (`server/lib/meilisearch-service.ts`).

---

## Test Plan

- [x] Read-through: an agent or developer can follow the doc and find the described code paths in the repo (excel-parser.ts, catalog-index-manager.ts, meilisearch-service.ts, catalog.ts, AgentChat indexing + resolveCatalogFilterActions).

---

## Files Changed

- `docs/technical/search-excel-vectors.md` — new (technical documentation)
- `docs/stories/STORY-142-search-excel-vectors-tech-doc.md` — new (story)
- `docs/stories/TRACKER.md` — 142 added, next number 143

---

## Notes

- Keep the doc short (one page per section or less). Link to existing story files (STORY-121, STORY-136, STORY-137, STORY-138, STORY-139, STORY-140) for deeper context.
- Excel parser does not extract `brand`; it is optional on `ProductItem` and may be set by API (e.g. Mobileland) or left empty (then `''` in Meilisearch).
