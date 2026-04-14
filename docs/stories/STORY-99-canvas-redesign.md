# STORY-99: Canvas WYSIWYG — Canva-Style Visual Redesign

**Status:** 🟡 In Progress
**Created:** 2026-03-09
**Package:** client

## What
Visually redesign the WYSIWYG canvas area in AdCanvasEditor to feel like Canva: neutral workspace background with the ad as a centered artboard card, hover-revealed block controls, modern product cards, and cleaner typography/spacing. Same props and data flow — entirely new visual layer.

## Why
The current canvas looks outdated and developer-ish. For a world-class ad design tool, the editing surface needs to feel polished, professional, and inviting — like Canva, not like a prototype.

## Acceptance Criteria
- [x] Neutral workspace background with ad displayed as a centered artboard card with shadow
- [x] CanvasBlock shows clean content by default; drag handles and labels appear on hover only
- [x] Headline, badge, CTA, disclaimer inputs are cleaner with better typography
- [x] Product grid uses modern Tailwind-styled cards with consistent design
- [x] Logo section hides controls behind hover toolbar; no duplicate resize UI
- [x] Empty state matches new workspace aesthetic
- [x] All existing tests pass

## Test Plan
- [x] All existing 102+ tests pass with no regressions
- [ ] Visual verification: workspace background visible around artboard
- [ ] Visual verification: block controls hidden by default, appear on hover
- [ ] Visual verification: product cards look modern and consistent

## Files Changed
- `client/src/components/AdCanvasEditor.tsx` — complete visual overhaul: workspace shell, artboard card, hover-revealed CanvasBlock, modernized product grid, polished inputs, simplified logo section, new empty state

## Notes
- Bottom tab panel (Chat, Products, Export, Settings) is out of scope
- No data flow or prop interface changes — visual only
- Reference: Canva's clean toolbar, centered canvas, hover-revealed controls
