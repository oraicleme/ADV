# STORY-111: Search Model — Industry Standard

**Status:** ✅ Done
**Created:** 2026-03-11
**Package:** oraicle-retail-promo (client: product-search, agent-actions, AgentChat, ProductFilter / ProductDataInput)

## What

Upgrade the product search model end-to-end so it behaves to **industry standard**: same expectations users have from Elasticsearch, Algolia, Shopify search, or modern e‑commerce filters. This covers (1) the manual “Search by name or code…” in the left panel and (2) the AI-driven product selection (catalog_filter) so that requests like “daj mi reklamu za auto punjače USB-C” return only relevant products (USB-C car chargers), not Lightning adapters or USB‑to‑LAN adapters.

## Why

Current search still feels “like we hired a clown”: the AI can say “I selected USB-C car chargers” while the canvas shows unrelated items (e.g. Lightning adapter, Micro/Mini USB to LAN). STORY-110 fixed compound tokens and catalog vocabulary in the prompt; STORY-103 added fuzzy + category. Despite that, **relevance and semantic product-type understanding** are not industry-standard. Users expect: correct product type (chargers vs adapters), correct connector/spec (USB-C vs Lightning), and predictable, fast manual search with clear ranking and feedback.

## Acceptance Criteria

- [x] **Relevance — product type**: For intent “USB-C car chargers” / “auto punjači USB-C”, results are only chargers (or charger-like) for cars; no LAN adapters, no Lightning-only adapters, no generic “USB” cables unless the catalog has no dedicated charger category.
- [x] **Relevance — connector/spec**: Queries that specify connector (USB-C, Type-C, Lightning, Micro-USB) do not return products that only have a different connector in the name (e.g. “USB-C punjači” does not return “Lightning na USB” or “Micro USB to LAN” as top results).
- [x] **Manual search UX**: “Search by name or code…” (ProductFilter / ProductDataInput) uses the same industry-standard logic: debounced input, relevance-sorted results, clear “X of Y” and empty state; no jank on 6k+ products.
- [x] **Agent path**: catalog_filter (nameContains + category + optional improvements) consistently produces the same quality as manual search when the LLM output is correct; any client-side ranking or post-filtering is aligned with the same relevance model.
- [x] **Catalog vocabulary**: LLM continues to use catalog vocabulary (sampleNames/categories) for nameContains/category (STORY-110); no regression. Compound tokens (USB-C → usbc) and single-term substring-first behavior (STORY-110) remain.
- [x] **Observable quality**: At least one automated test (or script) that runs a small catalog and asserts “USB-C car chargers” → only charger-type products; and one test that “Lightning” does not return USB-C-only products.

## Test Plan

- [x] Unit: product-search (or new search module): query “USB-C punjač” / “auto punjači” against a fixture with chargers, LAN adapters, Lightning adapters → only charger-like names in top N.
- [x] Unit: catalog_filter with nameContains + category still respects category and nameContains (existing tests) and new relevance fixture (chargers vs adapters).
- [ ] Manual: Load real catalog (e.g. 6k products). In left panel, search “punjač”, “USB-C”, “Type-C”, “držač” → results are relevant and sorted; no obvious wrong-type products on first page.
- [ ] Manual: Chat “daj mi reklamu za auto punjače USB-C” → canvas shows only USB-C car chargers (or clear message “no products match”); no Lightning or USB‑to‑LAN in the selection.

## Files Changed

- `client/src/lib/product-search.ts` — STORY-111 connector/spec and product-type relevance (relevanceMultiplier, CONNECTOR_GROUPS, charger vs adapter penalty).
- `client/src/lib/product-search.test.ts` — STORY-111 unit tests (chargers vs adapters fixture, “USB-C punjač”, “Lightning”).
- `client/src/lib/agent-actions.test.ts` — catalog_filter STORY-111 relevance tests (same fixture).
- `client/src/components/ProductDataInput.tsx` — searchFields aligned with agent (name, code, brand), empty state when search returns 0 results.

## Notes

- STORY-103 (fuzzy + category) and STORY-110 (compound tokens, catalog vocabulary, single-term substring) are foundation. This story is the **“best industry standard”** pass: relevance ranking, product-type/semantic clarity, and consistent behavior between manual search and agent.
- Avoid adding a second LLM call per search unless we explicitly decide otherwise; prefer better ranking, better prompt/catalog context, and optional client-side synonym/alias tables or scoring so that “USB-C” and “Type-C” (and charger vs adapter) are handled without extra latency.
- If we introduce scoring by “product type” or “category strength”, it should be deterministic and testable (e.g. category match boosts score; connector term in name with wrong category penalized).
