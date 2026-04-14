# Search Review Findings — STORY-116 / STORY-117

**Date:** 2026-03-12  
**Context:** Review requested via `docs/handoff-agent-search-review.md` — why does product search still not deliver good results?

---

## 1. The Full Stack, Traced

There are **two independent search/filter paths** that share the same data but produce different outputs:

| Path | Where | What it controls |
|------|--------|-----------------|
| **Sidebar search** | `ProductDataInput` → `filterProductsIntelligent` | `visibleIndices` — what shows in the table |
| **Agent catalog_filter** | `agent-actions.ts` → `applyAgentActions` | `selectedProductIndices` — what goes into the ad canvas |

These two paths are **decoupled** — typing in the sidebar doesn't change what's selected for the ad, and the agent's `catalog_filter` action doesn't change what the sidebar shows. This is architecturally correct but visually confusing for users who don't understand the distinction.

---

## 2. Why Results Have Been Poor — Root Causes

### 2a. sampleNames in sidebar AI search is badly sampled

`handleAiSearch` in `ProductDataInput.tsx` (line 210):
```ts
const sampleNames = products.slice(0, 40).map((p) => p.name ?? '').filter(Boolean);
```

For a 6213-product catalog, `slice(0, 40)` returns the first 40 products in **import order** — typically all from the same brand or the start of the alphabet. This means the LLM prompt for `interpretProductSearch` sees 40 names from, say, "Baseus" while the user might be looking for "Hoco" or "Denmen" products. The LLM cannot translate "USB-C auto punjači" into the catalog's actual wording because the samples don't represent the vocabulary.

The **agent chat** (`AgentChat.tsx`, line 632–641) does this correctly: 5 names per category, up to 60 total. The sidebar AI search must use the same strategy.

### 2b. Categories contain "Bez klasifikacije" as a top-level bucket

According to the catalog context, many products (~3000+) have no category. They all fall into `"Bez klasifikacije"`. This category appears at or near the top of the category list (highest count). When the LLM sees this as the first option, it may pick it as the "safest" answer for ambiguous queries. Also, when an agent uses `catalog_filter` with `category: "Bez klasifikacije"`, it selects 3000+ unrelated products instead of narrowing anything.

### 2c. STORY-116 "wrong category = 0 results" is silent

The `applyCategoryFilter` function (agent-actions.ts, line 297–310):
1. Tries exact match (normalized)
2. Falls back to fuzzy (`calculateSimilarity >= 0.5`) 
3. If both fail → returns `[]` (0 products selected)

When the agent sends a slightly misnamed category (e.g. `"Punjači"` when the catalog has `"Punjači za auto"` and `"Punjači za kuću"`), no products are selected. The agent's response says "I found X items" but the canvas shows 0. There is no error path or feedback loop to the user.

### 2d. "Enter in search box" does nothing

The sidebar search input is a controlled `<input onChange={...}>` with 200ms debounce. Pressing Enter does not trigger the AI search. The user must:
1. Type the query
2. Notice the small ✨ sparkle icon 
3. Click it

This is a discoverability problem — many users will never find the AI search feature.

### 2e. Token scoring minimum similarity threshold at 0.4

`searchProducts` uses `minSimilarity = 0.4`. The score formula is:
```
score = avgTokenScore × 0.6 + coverageRatio × 0.4
```

For a 3-token query (e.g. "auto punjaci usbc"), a product matching only 1 of 3 tokens scores ~0.33 (below threshold — correct). But a product matching 2 of 3 tokens scores ~0.64 (passes — correct). This is fine for clean queries. The problem is when the catalog uses different connector terminology than the user ("Type-C" vs "USB-C") — both normalize without hyphens to "typec" and "usbc" which do NOT fuzzy-match each other via Levenshtein (5 chars, distance 4 = too far). Only the agent prompt explicitly handles this via "use catalog vocabulary from sampleNames."

### 2f. sampleNames order in the agent chat is also limited

The chat's 5-per-category strategy (up to 60) iterates products in **load order**. If a category has 500 products, only the first 5 are sampled. If those 5 happen to be the same product variant (e.g. "Hoco X36 Lightning 1m", "Hoco X36 Lightning 2m", "Hoco X36 Micro 1m"…), the LLM doesn't see diversity. However, this is an acceptable tradeoff — at least it's cross-category.

---

## 3. STORY-116 Evaluation

| Aspect | Assessment |
|--------|-----------|
| Universal algorithm (no per-product-type branches) | ✅ Correct — eliminates maintenance problem |
| Single path: nameToIndices → applyCategoryFilter | ✅ Clear, traceable |
| Wrong category → 0 results, no fallback | ⚠️ Correct by design, but **silent failure** is a UX problem |
| Fuzzy category fallback (calculateSimilarity ≥ 0.5) | ✅ Good safety net for small typos |
| Tests updated | ✅ |

**What's good:** The logic is clean and predictable. One algorithm is correct.  
**What's missing:** When `catalog_filter` returns 0 results, the UI shows an empty canvas with no explanation. There is no feedback to the user or agent that the category didn't match. Adding a toast/notification when `catalog_filter` produces 0 selections would help.

---

## 4. STORY-117 Evaluation

| Aspect | Assessment |
|--------|-----------|
| LLM interprets natural language → nameContains + category | ✅ Correct approach |
| Category validated against catalog list | ✅ Only exact names pass (`validCategory`) |
| Fallback on LLM error | ✅ Keeps current query |
| sampleNames strategy | ❌ `slice(0, 40)` — too narrow, unrepresentative |
| Discoverability of ✨ button | ⚠️ Small icon, no label, not triggered by Enter |
| AI search replaces query text | ⚠️ If `nameContains = ""`, search box goes blank — unexpected |
| `max_tokens: 150` for JSON response | ✅ Sufficient for the response format |
| 30 samples sent to backend (`sampleNames.slice(0, 30)`) | ✅ Cheap prompt, but source quality is the issue |

---

## 5. Industry Best Practice — What We're Missing

### Principle 1: One box, instant smart results (VIOLATED)

Industry standard (Amazon, Shopify, Algolia): a single text input returns results immediately. The user doesn't choose a "search mode." Our implementation has two modes: fuzzy search (always on, automatic) and AI search (opt-in, click ✨). Most users will use only the first mode and get mediocre results.

**Proposed fix:** When the user presses Enter and the query is natural-language (> 3 words or contains stopwords), automatically trigger AI search instead of requiring the ✨ click.

### Principle 2: Faceted filtering AFTER results, not BEFORE (PARTIALLY VIOLATED)

Industry standard: search returns results, THEN show category/brand facets to narrow. Our sidebar shows all category chips simultaneously regardless of search state. When query is active, chips should show **counts within the filtered result set** — currently they always show total catalog counts.

**Proposed fix:** When `searchQuery` is non-empty, recompute chip counts from `visibleIndices` only (not from all products).

### Principle 3: Empty state with actionable guidance (VIOLATED)

Our empty state: `"No products match 'X'. Try a different search or clear filters."`  
Industry standard: "Did you mean Y?", "Try searching in All Categories", "Search with AI ✨" CTA.

**Proposed fix:** When search returns 0 results, show a "Try AI Search" button inline in the empty state, and call `onAiSearch` when clicked.

### Principle 4: Typo tolerance should handle connector synonyms (VIOLATED)

"USB-C" and "Type-C" are not typos — they are synonyms in the mobile accessories domain. Our Levenshtein approach correctly handles "usbc" vs "usbv" (typo), but NOT "usbc" vs "typec" (synonym). This requires either a synonym dictionary or the LLM step to translate.

The agent chat prompt already handles this via sampleNames vocabulary guidance. The sidebar AI search can too, but only if sampleNames are representative.

### Principle 5: Selection ≠ Visibility distinction is invisible to users (UX VIOLATION)

There's no visual cue that typing in the search box filters what you SEE but does not change what's SELECTED for the ad. Users type a search, see filtered results, think "good, found them" — but the canvas still shows the old selection. They must click "Select all visible" as a second step.

**Proposed fix:** Add a "Select all matching" button that appears automatically when search produces results and nothing in that result set is selected yet.

---

## 6. Prioritized Recommendations

### 🟢 Quick (< 4 hours, low risk)

1. **Fix sampleNames sampling** in `ProductDataInput.handleAiSearch` — use 5-per-category strategy up to 60 samples, matching `AgentChat.catalogSummary` logic. This immediately improves AI search accuracy for large catalogs.

2. **Enter key = AI search** — add `onKeyDown` on the search input: if `e.key === 'Enter'` and query is non-empty, call `onAiSearch(query)`. Remove the requirement to explicitly click ✨.

3. **Empty state with AI search CTA** — when search returns 0 results, show a "Search with AI ✨" button that triggers `onAiSearch`. Reduces dead ends.

### 🟡 Medium (1-2 days)

4. **Live chip counts from filtered set** — when `searchQuery` is active, recompute category chip counts from `visibleIndices` only so the user sees "Punjači za auto (3)" instead of "(145)".

5. **"Select matching" shortcut** — when search is active and 0 of the visible products are selected, show "Select these N products" button (merges filter + select in one step).

6. **catalog_filter zero-result feedback** — when `applyAgentActions` applies a `catalog_filter` and result is 0, trigger a user-visible notification ("No products found for this category/term — try rephrasing").

### 🔵 Long-term (backlog)

7. **Synonym dictionary** for connector types: USB-C ↔ Type-C, Micro-USB ↔ Micro, Lightning ↔ MFi. A small 20-entry map in `product-search.ts` would eliminate the "usbc vs typec" miss entirely.

8. **Semantic search / embeddings** — replace token-Levenshtein with vector similarity for the "understand intent" layer. This is expensive but would solve the vocabulary mismatch problem permanently.

9. **Catalog database with server-side FTS** — currently all 6213 products are loaded into the browser and searched client-side. At 10k+ products, client-side search becomes slow and sampleNames strategy breaks down further. Server-side FTS (postgres `tsvector` or Elasticsearch) is the long-term fix.

---

## 7. Files Reference

| File | Issue |
|------|-------|
| `client/src/components/ProductDataInput.tsx:210` | `slice(0,40)` sampleNames bug |
| `client/src/components/ProductDataInput.tsx:161–168` | no Enter → AI search |
| `client/src/components/ProductDataInput.tsx:765–772` | empty state lacks AI CTA |
| `client/src/lib/agent-actions.ts:297–310` | silent 0-result on category mismatch |
| `server/routers/catalog.ts:43` | sampleNames capped at 30 (backend), but source quality at client is the problem |
| `client/src/components/AgentChat.tsx:619–650` | catalogSummary — good strategy, reference for fix |
