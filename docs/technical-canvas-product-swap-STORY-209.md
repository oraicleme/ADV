# Technical specification: Canvas “Swap product” (STORY-209)

**Purpose:** This document describes **how the current implementation works** end-to-end so product, senior engineers, or external AI agents can review UX gaps and propose improvements (e.g. easier product picking from search results).

**Scope:** Retail Promo flow — `AgentChat` → `AdCanvasEditor` → `ProductImageSlotMenuPopover` / `ProductSwapPopover` → catalog mutation in `AgentChat`.

**Related story:** `docs/stories/STORY-209-canvas-swap-product-from-catalog.md`

---

## 1. Product intent (what we built)

- Users can **replace the catalog row behind a single canvas product tile** with **another row** from the **loaded in-browser catalog** (`products` in `AgentChat`).
- Picking targets uses the **same manual search pipeline** as **Add Products** and the bottom **Products** tab: **MiniSearch** (client) + **search rules** + **min-score** (`searchSource: 'manual'`), via `filterCatalogIndicesBySearchQuery` in `client/src/lib/product-selection-panel-filters.ts`.
- The **search string is shared** with the rest of the canvas editor: `catalogSearchQuery` / internal `productPanelSearchQuery` in `AdCanvasEditor`, optionally controlled from `AgentChat` (`catalogSearchQuery`, `onCatalogSearchQueryChange`).
- **STORY-208** behavior applies: if **“Only list search matches”** is on (default), an **empty** search yields **no rows** in the swap list until the user types (or turns the checkbox off in the Products tab).

---

## 2. User-visible flow (current UX)

### 2.1 Preconditions

Swap is only available when **`canSwap`** is true in `AdCanvasEditor` (`renderProducts`). All must hold:

| Condition | Meaning |
|-----------|---------|
| `onSwapCanvasProduct` is a function | Parent (Retail Promo) passed the callback. |
| `templateProductCatalogIndices` is an array | **Same length** as canvas `products` prop (the template slice). |
| `swapCatalog.length > 0` | `selectionCatalogProducts ?? products` is non-empty. |

In production Retail Promo, `AgentChat` passes:

- `selectionCatalogProducts={products}` (full session catalog),
- `products={templateProducts}` (only **selected** products for the ad),
- `templateProductCatalogIndices={templateProductOriginalIndices}` (parallel mapping; see §4).

### 2.2 Click path

1. User is in **Edit** mode on the canvas; **product images** are shown in the grid (respecting page / max products / columns).
2. User clicks a **product image** (or empty image placeholder if interactive).
3. **Branch A — both photo assignment and swap** (`canSwap && onAssignProductPhoto`):
   - Opens **`ProductImageSlotMenuPopover`** (`client/src/components/ProductImageSlotMenuPopover.tsx`).
   - Menu shows up to two items: **Change photo**, **Swap product…** (each gated by `showChangePhoto` / `showSwapProduct`).
4. **Branch B — swap only** (`canSwap && !onAssignProductPhoto`):
   - Skips the menu; toggles **`openSwapIdx`** and opens **`ProductSwapPopover`** directly.
5. User chooses **Swap product…** (from menu) → menu closes → **`ProductSwapPopover`** opens with `z-index: 10001` (above the menu’s `10000`).
6. **`ProductSwapPopover`**:
   - Renders a **search** input bound to **shared** `productPanelSearchQuery` (changing it updates the same query used elsewhere in the editor).
   - Builds a **fresh MiniSearch index** over `catalog` on every catalog reference change (`useMemo` + `buildSearchIndex(catalog)`).
   - Lists **buttons** for each matching catalog index (`visibleIndices`), excluding the **current slot’s backing catalog index** (`excludeCatalogIndex`).
7. User clicks a row → **`onPick(catalogIndex)`** → parent calls **`onSwapCanvasProduct(canvasIndex, sourceCatalogIndex)`** → popover closes.

### 2.3 Why the menu might show only “Swap product…”

`ProductImageSlotMenuPopover` shows **Change photo** only when `showChangePhoto={Boolean(onAssignProductPhoto)}` is true.

If the UI only shows **Swap product…** (as in some screenshots), typical causes are:

- `onAssignProductPhoto` is **not** passed to `AdCanvasEditor` for that session/agent, or
- A build/configuration where Retail Promo photo assignment is disabled.

The **Swap** row is shown when `showSwapProduct={canSwap}` is true.

---

## 3. Index semantics (critical for correctness)

Two parallel arrays drive routing:

### 3.1 Canvas / template index (`canvasIndex`, `globalIndex`)

- In `AdCanvasEditor`, `products` is **`templateProducts`** from `AgentChat`: only rows **selected for the ad**, in selection order.
- Each card uses **`globalIndex`** `0 … templateProducts.length - 1` (with multi-page, indices are still global within the template list).

### 3.2 Catalog index (`sourceCatalogIndex`, `origIdx`)

- **`products`** in `AgentChat` is the **full catalog** (all loaded rows).
- **`templateProductOriginalIndices[j]`** = catalog row index for template slot `j`.

So:

- **`onSwapCanvasProduct(canvasIdx, sourceCatalogIndex)`**  
  - `canvasIdx` = index into **`templateProducts`** / canvas grid.  
  - `sourceCatalogIndex` = index into **`AgentChat`’s `products`** (full catalog).

**Swap mutation** (`AgentChat.tsx`):

```ts
const origIdx = templateProductOriginalIndices[canvasIdx];
// ...
next[origIdx] = { ...prev[sourceCatalogIndex] };
```

So the **backing row** at `origIdx` is replaced by a **shallow clone** of the chosen catalog row.

### 3.3 Excluding the current row from the pick list

`ProductSwapPopover` receives:

```ts
excludeCatalogIndex={templateProductCatalogIndices?.[openSwapIdx] ?? null}
```

i.e. the catalog index of the product **currently in that slot**, so the user does not pick “the same row” as a no-op (parent also guards `sourceCatalogIndex === origIdx`).

---

## 4. Search and list construction

**Module:** `client/src/lib/product-selection-panel-filters.ts`

**Function:** `filterCatalogIndicesBySearchQuery(catalog, searchQuery, options?)`

- **`normalizeSearchQueryForPipeline`** on the query string.
- **Empty normalized query:** returns **`[0, 1, …, n-1]`** (all indices).  
  **`ProductSwapPopover`** then **overrides** empty list when `listOnlySearchMatches && !searchQuery.trim()` (STORY-208 parity for swap UI).
- **If `catalogSearchIndex` (MiniSearch) is provided:**
  - `queryProductIndicesWithManualFallback` + `getCatalogMinScoreForQuery` (`searchSource: 'manual'`).
  - `applySearchRulesToIndices` (localStorage search rules).
  - Resulting allowed set is applied in **catalog row order** (not necessarily MiniSearch relevance order — same as Products panel MiniSearch path).
- **If no index:** substring match on name, code, category, brand, then `applySearchRulesToIndices`.

**`ProductSwapPopover`** (`client/src/components/ProductSwapPopover.tsx`):

- `searchIndex = useMemo(() => buildSearchIndex(catalog), [catalog])` — **rebuilt when `catalog` array identity/length changes**, not shared with `ProductDataInput`’s index (potential duplication of work on large catalogs).

---

## 5. State machine in `AdCanvasEditor`

Relevant React state (simplified):

| State | Role |
|-------|------|
| `imageSlotMenu: { idx, rect } \| null` | Slot menu anchor; which tile opened it. |
| `openPickerIdx` | Which tile shows **`PhotoPickerPopover`**. |
| `openSwapIdx` | Which tile shows **`ProductSwapPopover`**. |
| `pickerRect` | **`DOMRect`** for positioning popovers (shared). |

**Click handler** (`handleImageAreaClick`):

- If swap **and** photo: clear other popovers, set `imageSlotMenu`, set `pickerRect`.
- If swap **only**: toggle `openSwapIdx`, set `pickerRect`.
- If photo **only**: toggle `openPickerIdx`, set `pickerRect`.

**Portals:** `ProductImageSlotMenuPopover` and `ProductSwapPopover` use **`createPortal(..., document.body)`** with **fixed** positioning from `anchorRect` / `pickerRect`.

**Outside click:** both popovers listen to **`pointerdown`** on `document` and close if the event target is outside the popover root (`popoverRef`).

---

## 6. Side effects on swap (`AgentChat`)

On successful swap (`client/src/components/AgentChat.tsx`):

1. **`setProducts`:** `next[origIdx] = { ...src }` (shallow copy of `ProductItem`).
2. **`setWebImageSelections`:** deletes `webImageSelections[origIdx]` so a **web image override** does not stick to the wrong SKU after replacement.

**Not explicitly cleared on swap (possible follow-ups):**

- Per-row **brand logo overrides** (`brandLogoDataUris`) — may still apply by index if that array aligns with product index in ways not reset here.
- **`productImages` / `productImageDataUrisFromUploads`** — global uploader pipeline; swap does not splice those arrays.
- **Mobileland** image map is keyed by product **code**; after swap, codes change → resolution updates via existing effects.

---

## 7. Agent prompt surface

`client/src/lib/agent-chat-engine.ts` — **PRODUCT SELECTION PANEL** section includes a bullet that **Swap product** uses the **same workspace search** as Add Products / Products tab (STORY-209). This is for **LLM** explanations to users, not runtime logic.

---

## 8. Automated tests

- `client/src/lib/product-selection-panel-filters.test.ts` — STORY-209 tests that **`filterCatalogIndicesBySearchQuery`** produces the **same rows** as **`filterCatalogBySearchQuery`** for the MiniSearch path and empty-query indices.
- Component-level tests for swap popovers are **minimal**; most coverage is **filter** parity.

**`data-testid` hooks:**

- `product-image-slot-menu-popover`, `product-image-slot-menu-swap`, `product-image-slot-menu-photo`
- `product-swap-popover`, `product-swap-search-input`, `product-swap-list`, `product-swap-row-${ci}`, `product-swap-empty-query`, `product-swap-no-matches`

---

## 9. Known UX / engineering limitations (for improvement proposals)

Use this list when asking for a **better “choose product from search”** experience:

1. **Two-step flow** when both photo + swap exist: menu → swap popover. Alternatives: single combined surface, or **inline** search in a larger panel / side sheet.
2. **Shared search mutates global query** — typing in swap changes Add Products / Products tab search (may be desired or confusing).
3. **MiniSearch index rebuilt inside `ProductSwapPopover`** — large catalogs: cost on open; could **share** `ProductSearchIndex` ref from parent like `ProductDataInput` (STORY-122 pattern).
4. **List UI** is a **scroll of text buttons** (code, name, price) — no thumbnails, no keyboard navigation beyond Escape, no virtualized list for very long result sets.
5. **STORY-208 empty state** — if “only search matches” is on and user has not typed, swap list is empty with explanatory copy; some users may want **swap-specific default query** (e.g. seed from product name/code).
6. **Excludes only exact catalog index** — duplicate names/SKUs across rows are still all listed; no deduplication.
7. **Multi-page canvas** — swap uses global template index; behavior is consistent, but UX might need clearer “which page” context in the popover title.

---

## 10. File map (quick reference)

| File | Responsibility |
|------|----------------|
| `client/src/components/AdCanvasEditor.tsx` | `canSwap`, click routing, `imageSlotMenu` / `openSwapIdx`, renders both popovers. |
| `client/src/components/ProductImageSlotMenuPopover.tsx` | Menu: Change photo vs Swap product… |
| `client/src/components/ProductSwapPopover.tsx` | Search field + result list + pick. |
| `client/src/components/AgentChat.tsx` | `templateProductOriginalIndices`, `onSwapCanvasProduct`, `templateProductCatalogIndices`, `selectionCatalogProducts`, `catalogSearchQuery`. |
| `client/src/lib/product-selection-panel-filters.ts` | `filterCatalogIndicesBySearchQuery`, `filterCatalogBySearchQuery`. |
| `client/src/lib/product-index.ts` | `buildSearchIndex`, `queryProductIndicesWithManualFallback`. |
| `client/src/lib/agent-chat-engine.ts` | Prompt text mentioning swap (support). |

---

## 11. Version

Document generated for repo state including **STORY-209** implementation. When behavior changes, update this file or replace with a new story-linked spec.
