# Handoff: Implement STORY-136 — Switch to Meilisearch (hybrid with MiniSearch fallback)

**Copy the prompt below and send it to a new agent to implement the story.**

---

## Prompt for agent

Implement **STORY-136: Switch to Meilisearch (hybrid with MiniSearch fallback)** in this repo. Follow the story-driven workflow: read the story and tracker first, then implement and test.

### Story and context

- **Story:** `docs/stories/STORY-136-switch-to-meilisearch.md`
- **Research (design):** `docs/research/meilisearch-options.md` — use for index mapping, synonyms format, and server-only communication.
- **Tracker:** `docs/stories/TRACKER.md` — STORY-136 is In Progress.

### Acceptance criteria (implement all)

- **M1** — Server: when `MEILI_HOST` and `MEILI_API_KEY` are set, the app can index a catalog (`ProductItem[]`) into a Meilisearch index. Documents have `id`, `name`, `brand`, `code`, `category`. Set searchable attributes order `['name','brand','code','category']` and filterable attributes `category`, `brand`.
- **M2** — Server: when indexing, push synonyms to Meilisearch: space-compounds (e.g. "play station" ↔ "playstation") and synonym groups (e.g. joystick ↔ gamepad ↔ kontroler). Use the same vocabulary source as the client: logic from `client/src/lib/catalog-search-vocabulary.ts` (buildSearchVocabulary). You may port that logic to the server or add a shared package so the server can compute `SearchVocabulary` and convert it to Meilisearch synonyms API format (mutual and multi-word synonyms).
- **M3** — Server: add a search procedure (e.g. tRPC `catalog.searchProducts`) that accepts `query`, `maxResults`, and optional `filter` (category/brand); calls Meilisearch and returns matching product indices (and optionally scores). This is used when Meilisearch is configured.
- **M4** — Client: product search pipeline uses Meilisearch when the server says it is available. Add a way for the client to know the provider (e.g. tRPC query `catalog.getSearchProvider` returning `{ provider: 'meilisearch' | 'minisearch' }` based on env). When provider is `meilisearch`: (1) after catalog is set, call an indexing procedure (e.g. `catalog.indexProducts({ products })`) so the server has the catalog in Meilisearch; (2) when resolving `catalog_filter` actions in AgentChat, call `catalog.searchProducts({ query, maxResults })` instead of `buildSearchIndex` + `queryIndex`; (3) do not build the MiniSearch index for that catalog when using Meilisearch. When provider is `minisearch`, keep current behavior (buildSearchIndex + queryIndex).
- **M5** — When Meilisearch is not configured (env unset), behavior is unchanged: MiniSearch + vocabulary + existing `selectProducts` LLM rerank. All existing tests that don’t set Meilisearch env must still pass.

### Current flow (for reference)

- **AgentChat** (`client/src/components/AgentChat.tsx`): for each `catalog_filter` action it gets candidates via `queryIndex(buildSearchIndex(products), query, { maxResults })`, then calls `catalog.selectProducts` with those candidates; LLM returns selected indices. You need to branch: if search provider is Meilisearch, get candidates from `catalog.searchProducts` instead of MiniSearch.
- **ProductDataInput** and **use-search-index** also use `buildSearchIndex` / `queryIndex` for local search; decide whether they should use Meilisearch when available (story says “product search pipeline” — at minimum AgentChat’s catalog_filter resolution must use Meilisearch when configured; other call sites can stay MiniSearch for this story or switch consistently).
- **Vocabulary:** `client/src/lib/catalog-search-vocabulary.ts` exports `buildSearchVocabulary(products)` → `SearchVocabulary` (spaceCompounds, synonymGroups). Meilisearch expects a map like `{ "word1": ["word2"], "word2": ["word1"] }` for mutual; multi-word like `{ "play station": ["playstation"], "playstation": ["play station"] }`. Convert spaceCompounds and synonymGroups to that format when calling Meilisearch’s updateSynonyms.

### Technical notes

- **Env:** Add `MEILI_HOST` and `MEILI_API_KEY` to `server/_core/env.ts`. If either is missing, treat Meilisearch as unavailable (getSearchProvider returns `minisearch`).
- **Index name:** e.g. `products`. Use document id = array index (0, 1, 2, …) so returned hits map directly to positions in the client’s `products` array.
- **Indexing:** Client calls `catalog.indexProducts({ products })` when the catalog is available and provider is meilisearch (e.g. in AgentChat when products are set, or in a single place that owns “catalog load”). Server replaces the index (addOrReplaceDocuments) then updates synonyms. Meilisearch tasks are async (202); wait for task completion if needed so search is consistent.
- **selectProducts:** Unchanged. It still receives candidates (index, name, code, category, brand) and returns LLM-selected indices. With Meilisearch, candidates come from searchProducts instead of queryIndex.
- **Dependencies:** Add `meilisearch` (Node SDK) on the server. Do not expose Meilisearch URL or API key to the client; all calls go through your API.

### Test plan (satisfy all)

- **T1** — Server: unit or integration test — index N products, set synonyms (e.g. "play station" ↔ "playstation"), search "play station" and assert expected document ids are returned.
- **T2** — Server: search with filter (e.g. `category = "Gaming"`) returns only documents in that category.
- **T3** — E2E or integration: same catalog and representative queries ("play station", "joystick", "USB-C punjači") via Meilisearch path; smoke check that results are returned and consistent.
- **T4** — Regression: with Meilisearch env unset, existing tests for product-index, catalog_filter, and selectProducts still pass.

### When done

- Update `docs/stories/STORY-136-switch-to-meilisearch.md`: check off M1–M5 and T1–T4, fill “Files Changed”, set Status to ✅ Done.
- Update `docs/stories/TRACKER.md`: move STORY-136 from In Progress to Done.

---

*End of prompt.*
