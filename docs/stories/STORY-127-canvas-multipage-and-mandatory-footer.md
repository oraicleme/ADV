# STORY-127: Canvas Multi-Page + Mandatory Footer — Industry Standard

**Status:** ✅ Done  
**Created:** 2026-03-13  
**Package:** client (Retail Promo Designer)

## What

1. **Multi-page canvas**: When the number of selected products exceeds what fits on one ad “page” (e.g. 8 for Story/Square), the system uses multiple pages (e.g. 13 products → page 1: 6, page 2: 7), like Canva/industry tools — no silent capping at 8.
2. **Mandatory footer**: Footer is a required block on the canvas. It is always present (default on), slim in height, and included in every export so creatives meet common brand/legal expectations.

## Why

- **Multi-page**: Users expect all search results (e.g. 13 futrola) to be represented; currently only 8 are shown and the rest disappear. Industry standard is multiple slides/pages with balanced distribution (e.g. 6+7).
- **Footer**: Ads without footer lack brand/contact consistency and often don’t meet platform or legal expectations. Making it mandatory (but not bulky) aligns with how major creative tools treat footer as a first-class, always-on element.

## Acceptance Criteria

### Track A — Multi-page canvas

- [x] **A1** Schema supports multiple “pages” (or slides): each page has a slice of product IDs (or indices) and shared layout/format/style.
- [x] **A2** When `productCount > maxProductsPerPage` (e.g. 8 for Story/Square, 4 for Landscape), a deterministic rule creates N pages and distributes products (e.g. 13 → 6 + 7; 10 → 5 + 5).
- [x] **A3** Canvas UI shows current page and allows switching between pages (e.g. 1/2, 2/2); export produces one asset per page (e.g. PNG/HTML for page 1 and page 2).
- [x] **A4** Agent/LLM prompt updated: no longer instructs “cap at 8”; instead suggests or uses multi-page when product count exceeds single-page capacity.

### Track B — Mandatory footer

- [x] **B1** Footer is **on by default** for new creatives (e.g. `footerEnabled: true` or equivalent in default state).
- [x] **B2** Footer is always rendered on the canvas when present in state (no “hide footer” that removes it from the artboard entirely — user can clear content but the footer band remains as an optional/minimal placeholder).
- [x] **B3** Footer band is **slim**: single line or compact two-line (e.g. company + contact); padding and font size kept small (e.g. padding 8–12px vertical, font 11–12px) so it doesn’t dominate the ad.
- [x] **B4** Every exported output (HTML/PNG) includes the footer band when the creative has footer config (which is default); no export path that drops footer.

## Test Plan

- [x] **T1** Unit: given productCount 13 and format Story, distribution logic returns 2 pages with 6 and 7 products.
- [x] **T2** Unit: given productCount 8, single page with all 8.
- [x] **T3** Unit: default canvas/agent state has footer enabled (or footer default on for new sessions).
- [x] **T4** Unit: `renderAdTemplate` / export includes footer in output when footer config is set (default).
- [x] **T5** Integration: create ad with 13 products → switch pages on canvas → export both pages; both show correct product counts and footer. (client/src/lib/canvas-multipage-export.test.ts)
- [x] **T6** Manual: footer bar is visible on canvas and in export, slim (not overly tall). (Covered by T5 + `footer-render.test.ts` / `ad-templates.test.ts` / canvas export tests; slim styling in `ad-templates` / `AdCanvasEditor`.)

## Roadmap (in same story)

| Phase | Scope | Outcome |
|-------|--------|--------|
| **1** | Schema + distribution | Add `pages: Array<{ productIndices: number[] }>` (or equivalent); deterministic split e.g. `splitProductsByPage(count, format) → [6, 7]`. |
| **2** | Canvas UI | Page indicator (1/2, 2/2) and page switcher; render current page’s product slice; footer still at bottom of each view. |
| **3** | Export | Export loop over pages; one HTML/PNG per page; each includes footer. |
| **4** | Agent prompt | Update CANVAS UTILIZATION / Auto-Curation: multi-page when productCount > 8 (Story/Square) or > 4 (Landscape); remove “maxProducts=8” as single-page cap. |
| **5** | Footer default + mandatory | Default state: footer enabled; ensure canvas always reserves footer band; export always includes footer when config present; keep styling slim (padding/font). |
| **6** | Tests + polish | T1–T6; any UX tweaks (e.g. “Footer” in element order always last, cannot be removed from schema). |

## Files Changed

- **Phase 1 done:** `client/src/lib/canvas-pages.ts` — `maxProductsPerPage(format)`, `splitProductsByPage(count, format)`, `getPages()`, `CanvasPage`; `client/src/lib/canvas-pages.test.ts` (T1, T2).
- **Phase 5 done:** `client/src/lib/ad-config-schema.ts` — `DEFAULT_FOOTER_FOR_NEW_CREATIVE`; `client/src/components/AgentChat.tsx` — default `footerEnabled: true`, footer config from default; `client/src/lib/ad-templates.ts` — footer band always when enabled (slim 8–12px, 11px), placeholder when empty; `client/src/components/AdCanvasEditor.tsx` — footer band always when enabled, slim styling, placeholder "Company & contact"; `client/src/lib/ad-templates.test.ts` (T4), `client/src/lib/footer-config.test.ts` (T3).
- **Phase 2 done:** `client/src/components/AdCanvasEditor.tsx` — `format` prop, `getPages(products.length, format)`, `currentPageIndex` state, page indicator (1/2), prev/next switcher, render current page slice; "Show" toolbar hidden when multi-page; photo callbacks use global index. `client/src/components/AgentChat.tsx` — pass `format={selectedFormat}` to editor.
- **Phase 3 done:** `client/src/components/AgentChat.tsx` — `buildTemplateData(productsSlice)`, `exportPages`, `htmlPerPage` (one full-doc HTML per page when multi-page); pass `htmlPerPage` to editor. `client/src/components/AdCanvasEditor.tsx` — `htmlPerPage` prop to ExportPanel with `exportFormat`. `client/src/components/ExportPanel.tsx` — optional `htmlPerPage` + `exportFormat`; when set, PNG/JPEG/HTML export downloads one file per page (exportAdAsImage + downloadBlob per page); UI hint "N pages — each export downloads N files".
- **T5 done:** `client/src/lib/canvas-multipage-export.test.ts` — integration: getPages(13, Story) → 2 pages; htmlPerPage with footer and correct product slice per page; single-page (8 products) no multi-page.
- **Phase 4 done:** `client/src/lib/agent-chat-engine.ts` — CANVAS UTILIZATION table: Story/Square/Landscape now state "max N per page; more → multiple pages automatically"; removed maxProducts=8/4 cap; added "Do NOT set maxProducts to cap". Auto-Curation #1: multi-page explanation, use maxProducts=0 so all products show across pages. Example reasoning: "2 pages (6+6)". LAYOUT SELECTION: "Multiple products (single or multi-page)". Product suggestion example updated.

## Notes

- **Footer “not too thick”**: Current padding `12px 16px` and `text-xs` / 12px font are acceptable; can reduce to 8px 12px vertical if we want even slimmer. Keep single-row or two-row layout.
- **Backward compatibility**: Existing creatives with one “page” of products can be treated as `pages: [{ productIndices: [0..n] }]` or equivalent so old state still works.
- **Industry reference**: Canva, Adobe Express, etc. use multi-page/slide creatives and a persistent footer or branding strip; we align with that expectation.
