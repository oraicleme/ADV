# Product Selection: “Search + on this ad” — technical root cause & fix spec

**Audience:** Senior engineers, AI coding agents  
**Status:** **Resolved in STORY-206** — Products tab **List** control: *All matching search* | *Not on this ad* | *Only on this ad* (intersection with search). Default remains *Not on this ad* (STORY-159).  
**Last reviewed:** 2026-03-24

---

## 1. Symptom (what the user sees)

- Stats show e.g. **6213** in catalog, **42** on this ad, **6171** available, **1321** shown, **0** checked.
- Search box contains a query (e.g. *Teracell kućne punjače*).
- Checkbox **“Show only products not on this ad”** is **ON**.
- The user wants to **isolate and work with only the products that are already on the ad** (the 42), optionally **intersected with the current search** — e.g. “which of my 42 on-ad products match this query?”
- With the current UI, that set is **not** available in the scrollable list while the “not on this ad” filter is enabled: the list intentionally contains **catalog − on-ad** (plus search), so **on-ad rows are always excluded** when the toggle is on.

This is **not** a MiniSearch bug; it is **filter semantics** + **default toggle state**.

---

## 2. Root cause (single sentence)

`filterProductsForSelectionPanel` applies **search first**, then **if `showOnlyUnused`** removes every product whose `name` is in `namesOnCanvas`. There is **no** code path for “keep only products in `namesOnCanvas`” (intersection with search). The checkbox label describes **exclusion** of on-ad rows, not **restriction** to on-ad rows.

---

## 3. How the pipeline works (actual implementation)

### 3.1 Entry point

- **File:** `client/src/components/AdCanvasEditor.tsx`
- When the bottom tab is **Products**, the editor renders `ProductSelectionPanel` with:
  - `allProducts={selectionCatalogProducts ?? products}` — full catalog slice used for picking.
  - `namesOnCanvas={products.map((p) => p.name)}` — names of products **currently placed on the canvas** (the “42 on this ad”).
  - `showOnlyUnused={productPanelShowOnlyUnused}` — default **`useState(true)`** (line ~363): **“not on this ad” mode is ON by default**.

### 3.2 Pure filter (testable)

- **File:** `client/src/lib/product-selection-panel-filters.ts`

```text
filterProductsForSelectionPanel(catalog, searchQuery, showOnlyUnused, namesOnCanvas, selectedNames, options)
  1. result ← filterCatalogBySearchQuery(catalog, searchQuery, options)
     • MiniSearch + min-score + search rules (same path as Add Products when index is present).
  2. if showOnlyUnused:
       if namesOnCanvas defined:
         result ← result.filter(p => !namesOnCanvasSet.has(p.name))   // EXCLUDES on-ad rows
       else:
         result ← result.filter(p => !selectedNames.has(p.name))     // legacy “unchecked in panel”
  3. return result
```

So for **canvas mode** (`namesOnCanvas` provided):

- **`showOnlyUnused === true`** → list = **search hits ∩ (catalog \ on-ad)** → user **never** sees the 42 on-ad products here.
- **`showOnlyUnused === false`** → list = **all search hits** (includes both on-ad and not-on-ad); user can scroll among ~1321 rows and manually find on-ad rows — **no** dedicated “only my 42” narrow view.

There is **no** third mode: **search hits ∩ on-ad**.

### 3.3 Stats line (what numbers mean)

- **File:** `client/src/components/ProductSelectionPanel.tsx` (header, `canvasMode`)

| Label        | Source |
|-------------|--------|
| **in catalog** | `allProducts.length` |
| **on this ad** | `namesOnCanvas.length` (names from canvas `products`) |
| **available**  | `remainingCatalogForNewAd(...)` = catalog rows **not** on canvas (for “next ad” / remaining SKUs) |
| **shown**      | `filteredProducts.length` = after search + optional “not on this ad” filter |
| **checked**    | `selectedNames` — **batch checkboxes** in the panel (Select all / category), **not** “on canvas” |

Important: **“checked” ≠ “on this ad”.** On-ad membership is **`namesOnCanvas`**; checkboxes drive batch operations on whatever rows are **shown**.

### 3.4 Product identity

- On-ad set is keyed by **`ProductItem.name`** (string), not SKU/code, via `namesOnCanvas={products.map(p => p.name)}`.
- If two catalog rows share the same **name**, semantics can be ambiguous (edge case for fixes).

---

## 4. Why past stories did not “fix” this

Several stories improved **search sync**, **persistence across tabs**, **MiniSearch alignment**, and **stats copy** — but they did **not** add a **“restrict list to on-ad only”** (or **intersection**) mode:

- **STORY-159** — Explicit goal: default **on** for “unused” = **not on canvas**, for merchandisers building the **next** ad with **remaining** SKUs. That directly favors **excluding** on-ad rows from the default view.
- **STORY-164** — Lifted search + toggle state so it survives tab switches; did not change filter math.
- **STORY-181** — MiniSearch parity for “shown” count; same filter pipeline.
- **STORY-165** — Stats labels/tooltips; clarified “shown” vs “checked”.

So the recurring complaint (“I can’t select **only** the products from search that are **on this ad**”) is a **missing feature / mode**, not a regression in search scoring.

---

## 5. Recommended directions (for implementation)

Pick one (or combine):

1. **Tri-state or second toggle**  
   - e.g. `visibility: 'all' | 'not_on_ad' | 'only_on_ad'`  
   - `only_on_ad`: `filtered = searchHits.filter(p => onCanvas.has(p.name))`  
   - Mutually exclusive with the current boolean, or replace the boolean with this enum.

2. **UX copy**  
   - Rename/clarify so “not on this ad” is clearly **“Hide products already on this ad (for picking more)”** and add **“Show only products on this ad”** when search is non-empty or always.

3. **Default**  
   - Consider default `showOnlyUnused` to **`false`** when the user’s task is editing **current** ad contents (product decision); or persist user preference in `localStorage`.

4. **Quick actions**  
   - Button: **“Narrow to on-ad matches for this search”** → sets mode to intersection and optionally checks those rows for batch ops.

5. **Tests**  
   - Extend `product-selection-panel-filters.test.ts` with:  
     - search + `only_on_ad` (once implemented)  
     - regression: current behavior for `showOnlyUnused` + `namesOnCanvas` unchanged unless product changes defaults.

---

## 6. Files to touch (minimal list)

| Area | File |
|------|------|
| Filter logic | `client/src/lib/product-selection-panel-filters.ts` |
| UI + state | `client/src/components/ProductSelectionPanel.tsx` |
| Lifted state / defaults | `client/src/components/AdCanvasEditor.tsx` (`productPanelShowOnlyUnused` or new enum) |
| Agent copy (if any) | `client/src/lib/agent-chat-engine.ts` (mentions “available” / filter semantics) |

---

## 7. Acceptance criteria (suggested)

- [ ] User can obtain a list that is **exactly** `(rows matching search) ∩ (rows on this ad)` without manually scanning full search results with “not on ad” off.
- [ ] Stats update consistently: e.g. **shown** = size of that intersection in “on-ad only” mode.
- [ ] STORY-159 workflow (“pick remaining SKUs for next ad”) remains reachable in one or two clicks (or explicit mode).
- [ ] Unit tests cover the new mode + existing `showOnlyUnused` behavior.

---

## 8. Related docs

- `docs/search-architecture-technical-hr.md` — search pipeline (orthogonal to this filter).
- `docs/stories/STORY-159-unused-products-default-and-canvas-semantics.md` — original “unused = not on canvas” rationale.
