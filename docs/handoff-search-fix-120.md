# Handoff: Product Search Still Selects 0 Products (STORY-120)

**Date:** 2026-03-12  
**Status:** 🔴 BROKEN — Must Fix  
**Next story number:** 120  
**Screenshot:** User confirmed 0 of 6213 selected after two agent chat turns about "USB-C / micro-USB auto punjači"

---

## Root Cause (Diagnosed — Do NOT Skip This Section)

STORY-119 added an AI-driven path: `catalog_filter { query, hintCategories }` → server calls `catalog.selectProducts` with ≤200 candidate products → LLM returns matching indices.  
**The bug is in candidate selection BEFORE the LLM call.**

### The Broken Flow

```
Agent sends: { query: "USB-C auto punjači", hintCategories: ["Punjači za auto"] }
                                                                 ↑
                                   NOT a real category in this catalog!
                                   Real category is "Auto Moto" (8 products)
                                   
hintSet.has("auto moto") === false  →  candidates = []

Fallback: candidates = products.slice(0, 200)
          ↑ First 200 products alphabetically
            = Baterije za mob. tel. + Bez klasifikacije items
            = NO chargers at all

LLM sees 200 non-charger products, correctly returns: { indices: [] }

Result: 0 products selected ✅ (but user sees empty canvas)
```

### The Three Bugs

**Bug 1 — hintCategories exact match is too strict**  
File: `client/src/components/AgentChat.tsx` lines 326–333  
```ts
const hintSet = new Set(p.hintCategories.map((c) => c.trim().toLowerCase()));
// ...
if (hintSet.has(cat)) { // EXACT MATCH — fails if agent guesses wrong name
```
The agent tries to guess category names from the prompt examples (which say "Punjači za auto") but the actual catalog has "Auto Moto". Exact match fails → 0 candidates from hintCategories.

**Bug 2 — Fallback `products.slice(0, 200)` sends completely wrong candidates**  
File: `client/src/components/AgentChat.tsx` lines 337–341  
```ts
if (candidates.length === 0) {
  candidates = products.slice(0, MAX_CANDIDATES)  // ← WRONG: first 200 ≠ relevant 200
    .map((prod, i) => ({ index: i, product: prod }));
}
```
With 6213 products, the first 200 are from alphabetically-first categories. Chargers are in "Auto Moto" — which may be much later in the array.

**Bug 3 — Agent prompt examples use fake category names**  
File: `client/src/lib/agent-chat-engine.ts` line ~231  
The prompt example says `"hintCategories": ["Punjači za auto"]` — this is NOT in any real catalog. The agent copies these examples instead of reading the actual `catalogSummary.categories` list.

---

## The Fix (STORY-120)

### Fix 1: Fuzzy/Partial Category Matching + Keyword Fallback in `resolveCatalogFilterActions`

Replace the exact-match category filter in `AgentChat.tsx` with multi-strategy candidate selection:

```ts
const resolveCatalogFilterActions = useCallback(
  async (actions: AgentAction[]): Promise<AgentAction[]> => {
    return Promise.all(
      actions.map(async (action): Promise<AgentAction> => {
        if (action.type !== 'catalog_filter') return action;
        const p = action.payload as Partial<CatalogFilterPayload>;
        if (!p.query?.trim() || products.length === 0) return action;

        const MAX_CANDIDATES = 200;
        let candidates: Array<{ index: number; product: ProductItem }> = [];

        // STRATEGY 1: exact category match (original)
        if (p.hintCategories && p.hintCategories.length > 0) {
          const hintSet = new Set(p.hintCategories.map((c) => c.trim().toLowerCase()));
          for (let i = 0; i < products.length && candidates.length < MAX_CANDIDATES; i++) {
            const cat = (products[i].category ?? '').trim().toLowerCase();
            if (hintSet.has(cat)) {
              candidates.push({ index: i, product: products[i] });
            }
          }
        }

        // STRATEGY 2: partial/fuzzy category match if exact failed
        if (candidates.length === 0 && p.hintCategories && p.hintCategories.length > 0) {
          const hints = p.hintCategories.map((c) => c.trim().toLowerCase());
          for (let i = 0; i < products.length && candidates.length < MAX_CANDIDATES; i++) {
            const cat = (products[i].category ?? '').trim().toLowerCase();
            if (hints.some((h) => cat.includes(h) || h.includes(cat))) {
              candidates.push({ index: i, product: products[i] });
            }
          }
        }

        // STRATEGY 3: keyword scan on product names using query tokens
        if (candidates.length === 0) {
          const queryTokens = p.query
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length >= 3);
          for (let i = 0; i < products.length && candidates.length < MAX_CANDIDATES; i++) {
            const name = (products[i].name ?? '').toLowerCase();
            const code = (products[i].code ?? '').toLowerCase();
            const brand = (products[i].brand ?? '').toLowerCase();
            const combined = `${name} ${code} ${brand}`;
            if (queryTokens.some((t) => combined.includes(t))) {
              candidates.push({ index: i, product: products[i] });
            }
          }
        }

        // STRATEGY 4 (last resort): representative sample — 5 per category up to 200
        if (candidates.length === 0) {
          const seenCatCount = new Map<string, number>();
          for (let i = 0; i < products.length && candidates.length < MAX_CANDIDATES; i++) {
            const cat = products[i].category ?? '';
            const n = seenCatCount.get(cat) ?? 0;
            if (n < 5) {
              candidates.push({ index: i, product: products[i] });
              seenCatCount.set(cat, n + 1);
            }
          }
        }

        // ... rest of the function (selectProductsMutation call) unchanged ...
      }),
    );
  },
  [products, selectProductsMutation],
);
```

### Fix 2: Update Agent Prompt — Remove Fake Category Examples

File: `client/src/lib/agent-chat-engine.ts`  
The prompt examples currently use `"Punjači za auto"` which is not a real category. Update to:
- Explicitly tell the agent to copy category names **VERBATIM from `catalogSummary.categories[].name`**
- Remove hardcoded example category names — use placeholder `<EXACT name from list>` instead
- Tell the agent: "If you are not 100% certain of the exact category name from the list above, leave hintCategories as []"

Current problematic line (~231):
```
→ { "query": "USB-C punjači za auto", "hintCategories": ["Punjači za auto"], ... }
```
Replace with:
```
→ { "query": "USB-C punjači za auto", "hintCategories": [], ... }
  // ↑ hintCategories left empty when unsure — system falls back to keyword scan
```
OR instruct agent to use the actual category from the list:
```
→ { "query": "USB-C punjači za auto", "hintCategories": ["Auto Moto"], ... }
  // ↑ only if "Auto Moto" actually appears in catalogSummary.categories
```

### Fix 3: Log Strategy Used (for debugging)

Add a console log to show which strategy fired:
```ts
console.info('[AgentChat] candidate strategy:', 
  strategy, // 'exact-category' | 'partial-category' | 'keyword-scan' | 'representative-sample'
  candidates.length, 'candidates from', products.length, 'products'
);
```

---

## Files to Change

| File | Change |
|------|--------|
| `client/src/components/AgentChat.tsx` | Replace hintCategories exact-match block (lines 326–341) with 4-strategy candidate selection |
| `client/src/lib/agent-chat-engine.ts` | Fix prompt examples — remove "Punjači za auto" fake category, add instruction to use verbatim names from catalogSummary OR leave hintCategories empty |

---

## Tests to Write / Update

- `client/src/components/AgentChat.test.ts` (if exists) OR `client/src/lib/agent-actions.test.ts`:
  - Test: hintCategory "Punjači za auto" misses, strategy 2 finds "Auto Moto" (partial match)
  - Test: hintCategory misses AND partial misses, strategy 3 keyword scan on name "USB-C" finds products
  - Test: all strategies miss → strategy 4 representative sample returns ≤200 products

---

## How to Verify the Fix Works

1. Load the app at `http://localhost:3000/agjenti/retail-promo`
2. Load an Excel with 6000+ products (categories: Auto Moto, Bez klasifikacije, Futrole, etc.)
3. Type in agent chat: **"daj mi USB-C punjače za auto"**
4. Open browser console — you MUST see:
   ```
   [AgentChat] candidate strategy: keyword-scan N candidates from 6213 products
   [AgentChat] selectProducts resolved: X products  <reasoning>
   ```
5. The canvas must show **X > 0 products selected** (products block rendered with product photos)

If still 0 after keyword-scan fires: check `server/routers/catalog.ts` → `selectProducts` mutation — add logs to see what the LLM returns.

---

## Context / Prior Work

- **STORY-119** (`docs/stories/STORY-119-ai-product-selection.md`) — implemented the architecture. The architecture is correct; only the candidate selection strategy is wrong.
- **TRACKER.md** — create STORY-120 there, next number is 120.
- Past transcript: [AI Product Selection Fix](0e480910-50c4-4e17-84ef-c3d3f69a1dcd)
- The `catalog.selectProducts` server mutation is working correctly — the issue is 100% in the client-side candidate gathering before calling it.

---

## STORY-120 Template

Create `docs/stories/STORY-120-candidate-selection-fix.md`:

```markdown
# STORY-120: Candidate Selection Fix — Product Search Returns 0

**Status:** 🟡 In Progress
**Created:** 2026-03-12
**Package:** client

## What
Fix `resolveCatalogFilterActions` in AgentChat.tsx to use a 4-strategy cascade
for finding candidate products before sending them to the LLM for selection.

## Why
Agent sends hintCategories like "Punjači za auto" but catalog has "Auto Moto".
Exact match fails → fallback sends first 200 products (wrong category) → LLM
returns 0 indices → canvas shows nothing.

## Acceptance Criteria
- [ ] hintCategories partial/contains match tried when exact match returns 0
- [ ] keyword token scan tried when category match returns 0
- [ ] representative sample (5/category) used as last resort
- [ ] prompt examples updated to not use fake category names
- [ ] Console logs show which strategy fired + candidate count
- [ ] Chat "USB-C auto punjači" with a 6000+ product catalog returns >0 products

## Test Plan
- [ ] Unit: 4-strategy cascade correctly selects candidates
- [ ] Manual: load 6213-product catalog, type "USB-C punjači za auto" → >0 selected
```
