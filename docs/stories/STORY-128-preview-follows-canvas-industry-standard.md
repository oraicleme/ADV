# STORY-128: Preview Follows Canvas — Industry Standard & Full Connection

**Status:** ✅ Done  
**Created:** 2026-03-13  
**Package:** client (Retail Promo Designer)

## What

The **preview pane** (right side / Preview mode) must **follow and stay in sync with the canvas**: same content, same format, same “view” the user sees in Edit mode. Industry standard (Canva, Adobe Express): preview = WYSIWYG output of what the canvas shows and what export produces for that view.

Currently: preview shows a single HTML built from all products (`livePreviewHtml`), while the canvas in multi-page mode shows one **page** at a time. So preview does not follow the canvas (e.g. 13 products → canvas shows page 1 with 6 products, preview shows all 13 in one frame). Preview must reflect the **current page** when multi-page, and stay the **single source of truth** with the canvas.

## Why

- Users expect: “what I see on the canvas = what I see in preview = what I get on export.”
- When preview and canvas show different content (e.g. all products vs current page), it’s confusing and breaks trust.
- Industry tools keep preview and canvas tightly connected; we need the same for ads.

## Acceptance Criteria

- [x] **P1** When multi-page: preview shows the **current page** only (same HTML as export for that page). Single source of truth: `previewHtmlToShow` = HTML for current page when `htmlPerPage` exists, else `livePreviewHtml`.
- [x] **P2** Current page index is shared: canvas (AdCanvasEditor) and preview (AgentChat) use the same “current page” (e.g. lift `currentPageIndex` to AgentChat or sync via callback so preview can show `htmlPerPage[currentPageIndex]`).
- [x] **P3** When single-page: preview continues to show `livePreviewHtml` (no regression).
- [x] **P4** Preview mode and Edit mode both show the same logical content for the current page (format, footer, product slice); export produces the same as preview for the current page.
- [ ] **P5** Optional UX: in Preview mode when multi-page, show a small “Page 1 of 2” and allow switching preview page so it stays consistent with canvas when user toggles back to Edit.

## Test Plan

- [x] **T1** Unit/integration: when `htmlPerPage` has 2 elements and `currentPageIndex === 0`, preview HTML equals `htmlPerPage[0]`; when `currentPageIndex === 1`, preview HTML equals `htmlPerPage[1]`.
- [x] **T2** Unit: when `htmlPerPage` is undefined (single page), preview HTML equals `livePreviewHtml`.
- [ ] **T3** Manual: 13 products, Story, switch canvas to page 2 → switch to Preview → preview shows page 2 content (7 products). Export page 2 → matches preview.

## Roadmap (implementation order)

| Step | Scope | Outcome |
|------|--------|--------|
| **1** | Lift current page to AgentChat | Add `currentPageIndex` state in AgentChat; pass `currentPageIndex` and `onCurrentPageChange` to AdCanvasEditor so canvas drives the index. |
| **2** | Preview HTML from current page | In AgentChat: when `htmlPerPage?.length > 1`, set `previewHtmlToShow = generatedHtml ?? htmlPerPage[currentPageIndex]` (and for single-page keep `livePreviewHtml`). When no multi-page, keep `previewHtmlToShow = generatedHtml ?? livePreviewHtml`. |
| **3** | Sync on mode switch | When switching Edit → Preview, preview already uses current page (no extra sync needed if step 2 is done). When switching Preview → Edit, canvas already has currentPageIndex. |
| **4** | Optional: Preview pane page indicator | When multi-page and in Preview mode, show “Page N of M” and prev/next so user can flip preview page; optionally keep in sync with canvas when returning to Edit. |
| **5** | Tests | T1–T2 (and T3 manual). |

## Files Changed

- `client/src/components/AgentChat.tsx` — added `currentPageIndex` state; `previewHtmlToShow` via `getPreviewHtmlToShow()`; pass `currentPageIndex` and `onCurrentPageChange` to AdCanvasEditor.
- `client/src/components/AdCanvasEditor.tsx` — optional `currentPageIndex` and `onCurrentPageChange` (controlled mode); when provided, use them instead of internal state.
- `client/src/lib/preview-html.ts` — new: `getPreviewHtmlToShow(generatedHtml, livePreviewHtml, htmlPerPage, currentPageIndex)`.
- `client/src/lib/preview-html.test.ts` — new: T1, T2 and edge-case tests for preview HTML logic.

## Notes

- **Backward compatibility:** When `onCurrentPageChange` is not provided, AdCanvasEditor can keep local state (e.g. for standalone use). When provided, AdCanvasEditor is controlled.
- **generatedHtml:** After “Generate Ad”, we may still want to show generated HTML; clarify whether that overrides per-page preview or only applies to single-page. For consistency: when multi-page, prefer `htmlPerPage[currentPageIndex]` so preview always follows canvas/export; when single-page, keep `generatedHtml ?? livePreviewHtml`.
