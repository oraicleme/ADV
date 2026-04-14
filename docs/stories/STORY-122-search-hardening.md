# STORY-122: Search Hardening — Fix All Issues from Senior Code Review

**Status:** ✅ Done
**Created:** 2026-03-12
**Package:** client
**Depends on:** STORY-121 (MiniSearch pipeline — must be done first ✅)

---

## What

Fix every concrete issue identified in the Manus AI senior code review of the two-stage
search system (BM25 + LLM rerank). Issues are grouped by severity. Every fix has a
precise code location, the exact problem, and the exact change required.

---

## Why

The current system works for the happy path but has one high-severity race condition that
causes wrong products to be selected when the user uploads a new catalog while the agent
is mid-conversation. Additionally, several medium-severity issues cause silent failures or
unexpected category mismatches. Fixing these makes the search correct under all conditions,
not just the normal path.

---

## Acceptance Criteria

### Phase 1 — Critical (block release)

- [x] **A-1** Race condition: when a new catalog is uploaded while the LLM is resolving,
      the returned indices are discarded rather than applied to the wrong catalog
- [x] **AA-1** `resolvedIndices` values are bounds-checked against `products.length`;
      out-of-range indices are silently dropped

### Phase 2 — Important (fix before launch)

- [x] **T-1** Hyphenated compound codes index both the split form AND the joined form,
      so `"USB-C"` → tokens `["usb", "c", "usbc"]` instead of just `["usb", "c"]`
- [x] **AA-2** Category similarity threshold raised from 0.5 to 0.65
- [x] **S-1** `calculateSimilarity` "query contains target" branch requires target ≥ 3
      chars (was 2)
- [x] **A-2** When BM25 returns 0 candidates, a console warning is already logged;
      additionally the `catalog_filter` action is annotated with a `_debugReason` field
      so the agent panel can surface it to the user as "No products matched: '...'"

### Phase 3 — Quality (nice to have)

- [x] **P-2** Search index is lifted into a shared React hook `useSearchIndex(products)`
      so `AgentChat` and `ProductDataInput` share one instance instead of building two
- [x] **A-3** `maxResults` in `resolveCatalogFilterActions` is configurable, not
      hardcoded to 100 — scales with catalog size: `min(150, max(50, ceil(products.length * 0.03)))`
      with special case: catalogs ≤ 150 products send ALL as candidates (perfect recall)
- [x] **Q-1** `queryIndex` default `minScore` raised from 0 to 1.5 for manual search
      path; agent path keeps 0 (wants maximum recall)
- [x] **T-2** Dots in model numbers are treated as separators so `"v2.1"` → `["v2","1"]`
      instead of `"v21"`
- [x] **AA-3** When `applyCategoryFilter` eliminates all results, it logs the category
      name that failed so debugging is easier
- [x] **I-1** Comment added to `buildSearchIndex` documenting the invariant: the
      returned index is only valid for the exact array instance it was built from

---

## Roadmap — Exact Implementation Order

Work top to bottom. Each item is self-contained.

---

### Fix 1 — AA-1: Bounds check on resolvedIndices `agent-actions.ts` line 273

**Problem:** The filter checks `i >= 0` but not `i < allProducts.length`. If the LLM
hallucinates an out-of-range index, it silently enters the selection Set. Any downstream
code that does `products[i]` gets `undefined`.

**Current code:**
```ts
let resolved = p.resolvedIndices.filter(
  (i): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0,
);
```

**Fix — add upper bound:**
```ts
let resolved = p.resolvedIndices.filter(
  (i): i is number =>
    typeof i === 'number' &&
    Number.isInteger(i) &&
    i >= 0 &&
    i < (setters.allProducts?.length ?? Infinity),
);
```

Note: the `resolvedIndices` path currently does not require `setters.allProducts` — keep
that behavior but use the length when available.

**Test:** Pass `resolvedIndices: [0, 9999, 1]` with a 3-product catalog → selected set
is `{0, 1}` only.

---

### Fix 2 — A-1: Race condition in `resolveCatalogFilterActions` `AgentChat.tsx` line 321

**Problem:** `resolveCatalogFilterActions` is an async function. It snapshots
`searchIndexRef.current` and reads `products` at call time, but `products` (the React
state) is captured via the `useCallback` closure. If the user uploads a new catalog while
the LLM is processing, `products` in the parent component updates, but the closure still
holds the old reference. The LLM returns indices into the old catalog; those indices are
applied to the new catalog state via `setSelectedProductIndices`.

**Fix:** Capture a snapshot of `products` at the top of the callback and compare it
before applying the result. Use a version counter (simple incrementing integer stored in a
ref) as a fast equality check.

```ts
// At component level (next to searchIndexRef):
const catalogVersionRef = useRef(0);

// In the useEffect that rebuilds the index:
useEffect(() => {
  catalogVersionRef.current += 1;
  if (products.length === 0) {
    searchIndexRef.current = null;
  } else {
    searchIndexRef.current = buildSearchIndex(products);
  }
}, [products]);

// In resolveCatalogFilterActions:
const resolveCatalogFilterActions = useCallback(
  async (actions: AgentAction[]): Promise<AgentAction[]> => {
    const versionAtStart = catalogVersionRef.current;     // snapshot
    const productsAtStart = products;                      // snapshot

    return Promise.all(
      actions.map(async (action): Promise<AgentAction> => {
        if (action.type !== 'catalog_filter') return action;
        const p = action.payload as Partial<CatalogFilterPayload>;
        if (!p.query?.trim() || productsAtStart.length === 0) return action;

        const idx = searchIndexRef.current;
        if (!idx) return action;

        const hits = queryIndex(idx, p.query.trim(), { maxResults: 100 });
        if (hits.length === 0) {
          console.warn('[AgentChat] MiniSearch returned 0 candidates for:', p.query);
          return action;
        }

        try {
          const result = await selectProductsMutation.mutateAsync({
            query: p.query.trim(),
            candidates: hits.map(({ index }) => ({
              index,
              name: productsAtStart[index].name ?? '',    // use snapshot
              code: productsAtStart[index].code,
              category: productsAtStart[index].category,
              brand: productsAtStart[index].brand,
            })),
            maxSelect: typeof p.maxSelect === 'number' ? p.maxSelect : 0,
          });

          // Guard: if catalog changed while LLM was processing, discard result
          if (catalogVersionRef.current !== versionAtStart) {
            console.warn('[AgentChat] Catalog changed during LLM call — discarding stale result for:', p.query);
            return action;
          }

          const resolvedPayload: CatalogFilterPayload = {
            resolvedIndices: result.indices,
            maxSelect: p.maxSelect ?? 0,
            deselectOthers: p.deselectOthers ?? true,
          };
          return { type: 'catalog_filter', payload: resolvedPayload };
        } catch (err) {
          console.warn('[AgentChat] selectProducts failed, falling back to legacy filter:', err);
          return action;
        }
      }),
    );
  },
  [products, selectProductsMutation],
);
```

**Test:** Simulate async delay in `selectProductsMutation`; upload new catalog mid-flight;
assert selection is not applied (or is applied to correct catalog).

---

### Fix 3 — T-1: Add joined token for compound codes `product-index.ts` line 69

**Problem:** `"USB-C"` tokenizes to `["usb", "c"]`. The token `"c"` is a single character
that will match thousands of products (any product with a "c" in any field). This inflates
false-positive scores. A query for `"USB-C"` returns products that merely contain "c"
somewhere.

**Fix:** Extend `miniTokenize` to also emit the joined (hyphen-collapsed) form when
hyphen-separated tokens exist, as an additional token alongside the split forms.

```ts
function miniTokenize(text: string): string[] {
  const base = stripDiacritics(text.toLowerCase())
    .replace(/[.]/g, ' ')              // T-2 fix included: dots also split
    .replace(/[-–_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // Emit joined compound forms: "USB-C" → also index "usbc" alongside "usb","c"
  // Only for tokens that came from a hyphenated original — detect by re-checking
  // the source string for hyphens before stripping.
  const withCompounds: string[] = [...base];
  const hyphenated = stripDiacritics(text.toLowerCase())
    .replace(/[^a-z0-9\-–_/]/g, '')   // keep only the chars and joiners
    .split(/\s+/)
    .filter((t) => /[-–_/]/.test(t));  // only segments that contain a joiner

  for (const compound of hyphenated) {
    const joined = compound.replace(/[-–_/]/g, '').replace(/[^a-z0-9]/g, '');
    if (joined.length > 1 && !withCompounds.includes(joined)) {
      withCompounds.push(joined);
    }
  }

  return withCompounds;
}
```

Example results:
- `"USB-C"` → `["usb", "c", "usbc"]`
- `"LV-B15B"` → `["lv", "b15b", "lvb15b"]`
- `"HOCO Z49"` → `["hoco", "z49"]` (no hyphens, unchanged)
- `"Punjači za auto"` → `["punjaci", "za", "auto"]` (unchanged)

**Test:** Query `"USB-C"` should not promote products that only contain "c"; query `"usbc"`
should match products with `"USB-C"` in name.

---

### Fix 4 — S-1: `calculateSimilarity` containment minimum `product-index.ts` line 46

**Problem:** `if (nq.includes(nt) && nt.length >= 2)` returns 0.85 for any target that is
2+ characters and is a substring of the query. Category names like `"TV"`, `"PC"`, or
function words like `"za"` will match at 0.85 when the query happens to contain them.

**Fix:** Raise minimum to 3 characters:
```ts
if (nq.includes(nt) && nt.length >= 3) return 0.85;
```

**Test:** `calculateSimilarity("Punjači za mobilne", "za")` should return < 0.5 (currently
returns 0.85).

---

### Fix 5 — AA-2: Category fuzzy threshold `agent-actions.ts` line 323

**Problem:** `calculateSimilarity(catQ, c) >= 0.5` — a 50% token overlap is enough to
pass. `"Punjači za auto"` (tokens: punjaci, za, auto) matches `"Punjači za mobilne"` (4
tokens) because 2/4 = 0.5.

**Fix:** Raise to 0.65:
```ts
return c.includes(catQ) || catQ.includes(c) || calculateSimilarity(catQ, c) >= 0.65;
```

**Test:** `"Punjači za auto"` must NOT match `"Punjači za mobilne telefone"`. Must still
match `"Auto punjači"` (2/2 tokens overlap = 1.0).

---

### Fix 6 — A-2: Surface 0-candidate failure to UI `AgentChat.tsx` line 334

**Problem:** When BM25 returns 0 results, the warning is in the console only. The user
sees nothing. The agent just silently fails to select products.

**Fix:** Annotate the returned action with a debug field so `AgentChatPanel` (or wherever
agent messages are rendered) can show a visible hint.

```ts
if (hits.length === 0) {
  console.warn('[AgentChat] MiniSearch returned 0 candidates for:', p.query);
  // Return action with debug annotation — downstream UI can surface this
  return {
    ...action,
    payload: {
      ...(action.payload as object),
      _debugReason: `No products matched query: "${p.query}"`,
    },
  };
}
```

Then in the chat message rendering: if a `catalog_filter` action has `_debugReason`, show
it as a small italic note under the agent message: _"No products matched: 'USB-C punjači
za kola'"_.

---

### Fix 7 — P-2: Shared index hook (Phase 3)

**Problem:** `AgentChat.tsx` and `ProductDataInput.tsx` each hold an independent
`searchIndexRef` and call `buildSearchIndex` independently when `products` changes. The
index is built twice for the same data. This doubles the memory and CPU cost on every
catalog change.

**Fix:** Extract into a shared hook:

```ts
// client/src/lib/use-search-index.ts
import { useRef, useEffect } from 'react';
import { buildSearchIndex, type ProductSearchIndex } from './product-index';
import type { ProductItem } from './ad-templates';

export function useSearchIndex(products: ProductItem[]): React.RefObject<ProductSearchIndex | null> {
  const indexRef = useRef<ProductSearchIndex | null>(null);
  useEffect(() => {
    indexRef.current = products.length > 0 ? buildSearchIndex(products) : null;
  }, [products]);
  return indexRef;
}
```

Then in `AgentChat.tsx`, pass `indexRef` down to `ProductDataInput` as a prop instead of
letting `ProductDataInput` build its own. Or lift `products` + the index into a React
context shared by both.

---

### Fix 8 — A-3: Configurable candidate count (Phase 3)

**Problem:** `maxResults: 100` is hardcoded in `resolveCatalogFilterActions`. For a
10,000-product catalog, 100 candidates is 1% — fine. For a 500-product catalog, 100
candidates is 20% — the LLM is reading 20% of the catalog, which is slow and noisy.

**Fix:** Scale dynamically:
```ts
const candidateCount = Math.min(150, Math.max(50, Math.ceil(products.length * 0.03)));
const hits = queryIndex(idx, p.query.trim(), { maxResults: candidateCount });
```

This gives 50–150 candidates depending on catalog size. The LLM context stays manageable.

---

### Fix 9 — Q-1: minScore for manual search path (Phase 3)

**Problem:** `queryIndex` default `minScore` is 0 — all BM25-positive matches are
returned. A single-character query like `"c"` on a 6000-product catalog returns all
products that contain the letter "c" anywhere.

**Fix:** In `ProductDataInput.tsx`, pass a minimum score:
```ts
const results = queryIndex(searchIndexRef.current, q, {
  maxResults: products.length,
  minScore: 1.5,
});
```

The agent path keeps `minScore: 0` because it needs maximum recall for the LLM to work
from.

---

### Fix 10 — T-2: Dots as separators (Phase 3, bundled with Fix 3)

**Problem:** `"v2.1"` becomes token `"v21"`. Query `"2.1"` becomes `"21"`. They match,
but only by accident. Model numbers with dots (`"BT-5.0"`, `"QC3.0"`) lose their version
structure.

**Fix:** In `miniTokenize`, replace `.` with a space before removing non-alphanumeric
chars. Already shown in Fix 3 code above — just add `.` to the replacement set.

---

## Files Changed

| File | Fixes |
|---|---|
| `client/src/lib/product-index.ts` | T-1, T-2, S-1, I-1 — tokenizer compound tokens (regex bug fixed per Manus), dots as separators, containment minimum 3 chars, invariant comment |
| `client/src/components/AgentChat.tsx` | A-1, A-2, A-3 — race condition via version counter + productsRef; _debugReason annotation for 0-candidate and empty-LLM-result; dynamic candidate count with small-catalog special case |
| `client/src/lib/agent-actions.ts` | AA-1, AA-2, AA-3 — bounds check with Infinity fallback (documented); threshold 0.65; log failing category name |
| `client/src/lib/use-search-index.ts` | P-2 (new file) — shared hook with co-located versionRef per Manus suggestion |
| `client/src/components/ProductDataInput.tsx` | P-2, Q-1 — accepts sharedSearchIndex prop; minScore 1.5 for manual search path |
| `client/src/components/AgentChatPanel.tsx` | A-2 — renders _debugReason from catalog_filter actions |
| `client/src/lib/product-index.test.ts` | +13 tests for S-1, T-1, T-2 |
| `client/src/lib/agent-actions.test.ts` | +8 tests for AA-1, AA-2 |

---

## Test Plan

- [x] `product-index.test.ts` — add tests for new tokenizer behavior (T-1, T-2)
- [x] `product-index.test.ts` — add tests for `calculateSimilarity` with short targets (S-1)
- [x] `agent-actions.test.ts` — add bounds-check test for AA-1
- [x] `agent-actions.test.ts` — add category threshold tests for AA-2
- [x] `AgentChat` integration — race condition guard implemented via version counter + productsRef (A-1)
- [x] All 649 tests continue to pass (up from 631 — 18 new tests added)

---

## Notes for Next Agent

**Start with Fixes 1 and 2 (AA-1 and A-1).** These are the only correctness bugs. The
rest improve precision and robustness but do not cause wrong behaviour.

**Fix 3 (T-1) changes the tokenizer** — rebuild behaviour will change for all compound
codes. Run the full test suite after this fix. The existing tests in `product-index.test.ts`
may need adjusting since `"USB-C"` now produces 3 tokens instead of 2, which may slightly
change BM25 scores.

**Fix 5 (AA-2) tightens category matching.** Run `agent-actions.test.ts` after — some
tests that relied on the 0.5 threshold may now require the 0.65 threshold and may fail.
Check each failure individually; they may reveal real over-matching that was previously
undetected.

**Do not implement Phase 3 items (P-2, A-3, Q-1, T-2, AA-3, I-1) in the same PR as
Phase 1 and 2.** They are refactors and optimisations, not bug fixes. Keep diffs small.
