# Catalog Filter — "0 of N selected" Debug Checklist

When the ad shows a headline about products (e.g. "Brzi USB-C punjači za aut") but **0 of N selected for ad**, use this checklist to find the cause.

## 1. Data flow (applyAgentActions)

- **Where:** `AgentChat.tsx` → `applyAgentActions(actions, setters)` after `sendChatMessage`.
- **Required setters for catalog_filter:** `allProducts` (full `products` array) and `setSelectedProductIndices`.
- **Check:** In `AgentChat.tsx` around the `applyAgentActions` call, confirm `allProducts: products` and `setSelectedProductIndices` are passed. If either is missing, `catalog_filter` is a no-op (see `agent-actions.ts` case `catalog_filter`: `if (!setters.allProducts || !setters.setSelectedProductIndices) break`).

## 2. catalogSummary sent to LLM

- **Where:** `AgentChat.tsx` → `catalogSummary` useMemo (from `products`), then `canvasState.catalogSummary` → `serializeCanvasState` → `meta.catalogSummary` in the JSON sent in the user message.
- **Categories:** Built from all distinct `p.category` (or "Bez klasifikacije" if null). The LLM must use **exact** names from `catalogSummary.categories[].name` for the `category` field.
- **Check:** If the Excel uses a different category name (e.g. "Punjači" vs "Punjači za auto"), the LLM might send a string that doesn’t exist. Client-side matching uses `normalize()` (diacritics stripped), so "Punjaci za auto" from LLM matches "Punjači za auto" in data.
- **sampleNames:** Up to 60 sample product names are sent so the LLM can use catalog vocabulary in `nameContains` (e.g. "USB-C" vs "Type-C").

## 3. Does the LLM send catalog_filter?

- **Logging (dev):** In `agent-chat-engine.ts`, when `import.meta.env?.DEV`, parsed actions are logged: look for `[AgentChat] catalog_filter action(s):` with the payload array.
- **If no catalog_filter:** Prompt or context may be wrong (e.g. no catalogSummary in state, or model not following "when selectedCount=0 you MUST issue catalog_filter"). Check system prompt and that `canvasState` includes `catalogSummary` when products are loaded.
- **If catalog_filter is present but 0 selected:** Go to step 4.

## 4. catalog_filter payload and client-side match

- **Payload:** `nameContains`, `category`, `maxSelect`, `deselectOthers`. Category should be an exact string from `catalogSummary.categories` (normalization makes diacritics equivalent).
- **Client logic:** `agent-actions.ts` → `filterProductsIntelligent` (or single-term substring) for `nameContains`, then filter by category (exact then fuzzy).
- **STORY-112 fallbacks (when result would be 0):** (1) Multi-word `nameContains` → try first token only (e.g. "USB-C" from "USB-C punjači za auto"); (2) if still 0 and we have name-based hits → use name-only (category may not exist in catalog); (3) if still 0 → try category-only. So "0 selected" should be rarer when the catalog has relevant products under a different category name or wording.
- **Check:** Run a unit test: same products, same payload. See `agent-actions.test.ts` — "catalog_filter with category Punjači za auto + nameContains USB-C" and "catalog_filter fallback: multi-word nameContains + nonexistent category still selects by name". If the test passes but production fails, compare real catalog category names and sample names to what the LLM is sending.

## 5. Manual search (left panel)

- **Where:** `ProductDataInput.tsx` → `visibleIndices` useMemo uses `filterProductsIntelligent(products, q, { searchFields: ['name','code','brand'], fuzzyMatch: true })`. Same search stack as catalog_filter name matching.
- **Selection vs visibility:** "X of Y selected" is from `selectedProductIndices`. Manual search only changes which rows are visible; selection is separate (checkbox / "Select all" / catalog_filter). So 0 selected can happen even if search shows many rows, if the user never selected and the agent didn’t run or apply catalog_filter.

## Quick verification

1. Open devtools console; send "daj mi reklamu za brze USB-C punjače za auto".
2. Check for `[AgentChat] catalog_filter action(s):` and the payload (e.g. `nameContains: "USB-C"`, `category: "Punjači za auto"` or similar).
3. If present and still 0 selected: inspect `products` in that view (length, first item’s `category`). Confirm category string in payload exists in the catalog (after normalizing diacritics).
4. Run: `pnpm test -- client/src/lib/agent-actions.test.ts` and ensure the STORY-112 test for "Punjači za auto" + "USB-C" passes.
