# STORY-210: Canvas swap UX — merchant-friendly modal (thumbnails, keyboard, isolated search)

**Status:** 🟡 In Progress  
**Created:** 2026-03-24  
**Package:** client

## What

Replace the small two-step popover swap flow with a **single centered modal**: clear tabs **Pick another product** / **Change photo**, **isolated search** seeded from the current tile (non-tech users are not blocked by empty global search), **product thumbnails**, and **keyboard** (↑↓ Enter Esc) to choose a replacement.

## Why

Non-technical merchants need a flow that feels like Shopify/Canva: one obvious surface, pictures, plain language, and no dependency on the Products-tab “only search matches” setting to see candidates.

## Acceptance Criteria

- [ ] Clicking a canvas product image opens a **modal** (not a tiny corner menu) when swap and/or photo actions exist.
- [ ] **Pick another product** uses **local search** with a **smart seed** from the current product name/code; optional control to copy **Products tab / Add Products** search.
- [ ] **Empty local search** shows a capped “browse all” list (not a dead empty state).
- [ ] Rows show **thumbnail** when resolver provides URL (Mobileland / `imageDataUri`).
- [ ] **Keyboard:** arrow keys move highlight, **Enter** confirms, **Escape** closes (via dialog).
- [ ] Tests: seed helper + at least one filter/list behavior test.

## Test Plan

- [ ] `pnpm vitest run client/src/lib/product-swap-seed.test.ts`
- [ ] `pnpm vitest run` (spot-check) + `pnpm exec vite build`

## Files Changed

- (filled when done)

## Notes

- `PhotoPickerPopover` gains an **inline** variant for embedding in the modal photo tab.
