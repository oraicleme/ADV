# STORY-131: Footer — Industry Standard (Canvas ↔ Preview ↔ Output)

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client (Retail Promo Designer)

## What

Implement and lock the **footer** in the best industry manner: **one footer concept** that is **composed with** the canvas, preview, and final ad output. Footer must appear at the **bottom** of (1) the canvas, (2) the preview (reklame), and (3) the exported ad, with a single source of truth (one config) and no divergence between the three.

## Why

- Users expect: what they see on the canvas = what they see in Preview = what they get on export. Footer is part of that contract.
- Industry tools (Canva, Adobe Express) treat footer as a first-class, always-at-the-end element; we align the same way and document the pipeline so it stays consistent.

## Current state (baseline)

- **Config:** `FooterConfig` in `ad-config-schema`; default on (`DEFAULT_FOOTER_FOR_NEW_CREATIVE`); saved footers in AgentChat (same pattern as logos).
- **Canvas:** `AdCanvasEditor` renders a footer band at the **bottom** via `renderFooter()` (slim, company/contact, always last).
- **Preview:** `previewHtmlToShow` is built from `buildTemplateData` → `renderAdTemplate`, which injects footer before `</body>`. So preview HTML already contains the footer at the end.
- **Export:** Same `renderAdTemplate` / `htmlPerPage` pipeline; each page HTML includes footer. Single source: same `footerConfig` drives canvas band, preview HTML, and export HTML.

This story **formalizes** that pipeline and ensures no path drops or duplicates the footer; optionally aligns canvas footer styling with the HTML output for true WYSIWYG.

## Industry reference

| Aspect | Canva / Adobe Express |
|--------|------------------------|
| **Placement** | Footer always at the **end** of the creative (bottom of canvas, bottom of preview, bottom of export). |
| **Single source** | One footer configuration drives edit view, preview, and export. |
| **Consistency** | Same content and styling in all three; no “footer in export but not in preview” or vice versa. |

## Acceptance criteria

- [x] **P1** Footer is at the **bottom** of the canvas: footer band is the last visible element (below products/content), not in the middle of the layout. No reorder that puts footer above content.
- [x] **P2** Preview (reklame) shows the footer at the **end** of the ad: the HTML used for preview (`previewHtmlToShow` / `htmlPerPage[currentPageIndex]`) includes the footer band just before `</body>` — same as export for that page.
- [x] **P3** Exported output (HTML/PNG per page) includes the footer at the end; no export path omits footer when footer is enabled in config.
- [x] **P4** Single source of truth: one `footerConfig` (and `footerEnabled`) in AgentChat is passed to (a) canvas for the footer band, (b) `buildTemplateData` for preview and export HTML. No second or divergent footer state.
- [x] **P5** Code or docs: short comment or doc stating that footer is “canvas bottom → preview end → export end” with one config (industry standard).

## Test plan

- [x] **T1** Existing footer and export tests still pass (ad-templates footer, canvas-multipage-export, footer-config, footer-render).
- [x] **T2** Unit or integration: for a given `footerConfig` and one page of products, the HTML returned by `renderAdTemplate(buildTemplateData(...))` contains exactly one `data-footer` block and it appears before `</body>`.
- [x] **T3** When multi-page: `htmlPerPage[0]` and `htmlPerPage[1]` both contain `data-footer`; preview HTML for current page equals the same HTML that would be exported for that page (footer included).
- [x] **T4** Optional: assert that canvas footer bar is rendered last in AdCanvasEditor (e.g. in DOM order or via testid), so “footer at bottom of canvas” is locked. Satisfied by code: footer band rendered last in AdCanvasEditor (comment "Footer band — always last, outside drag order" and DOM order).

## Files Changed

- `client/src/components/AgentChat.tsx` — added STORY-131 comment: single source for footer (canvas → preview → export).
- `client/src/lib/ad-templates.ts` — added comment on injectFooter: same HTML for preview and export (canvas bottom → preview end → export end).
- `client/src/lib/ad-templates.test.ts` — added T2 test: exactly one `data-footer` before `</body>`.
- `client/src/lib/canvas-multipage-export.test.ts` — added T3 test: multi-page both pages have footer; preview HTML = export HTML per page; import `getPreviewHtmlToShow`.
- `client/src/components/AdCanvasEditor.tsx` — no change (footer already last; existing comment).
- `client/src/lib/preview-html.ts` — no change.

## Notes

- **No new feature bloat:** Footer config, canvas band, and template injection already exist. This story is **alignment + documentation + tests** so the “footer pipeline” is explicit and industry-standard.
- **Optional styling parity:** If canvas footer bar uses different padding/font than `buildFooterHtml`, consider sharing constants (e.g. FOOTER_PADDING, FOOTER_FONT_SIZE) so canvas truly matches preview/export; can be same or follow-up story.
