# STORY-101: Preview — Nearly Full-Screen, No Left Panel

**Status:** ✅ Done
**Created:** 2026-03-09
**Package:** oraicle-retail-promo (client)

## What
When the user switches to **Preview** mode (Edit/Preview toggle or keyboard P), the ad preview must be **nearly full-screen** and the **left sidebar (Upload Logos, Add Products, Configure Ad, etc.) must not be visible**. Currently the preview is a small phone-style frame in the center with the left card still taking ~380px; the result looks poor ("smijurija").

## Why
Preview is for judging the final ad at real-world size. A tiny preview with the full left panel visible is useless. Preview mode should feel like "full-screen ad view" with minimal chrome (e.g. a thin header with Edit/Back + export actions only).

## Acceptance Criteria
- [x] In Preview mode, the left sidebar (stepper: Upload Logos, Add Products, Configure Ad…) is hidden or has zero width.
- [x] In Preview mode, the preview content (rendered ad) uses most of the viewport — nearly full-screen (e.g. max width/height with safe padding, or scale-to-fit so the ad fills the available space).
- [x] A clear way to exit Preview (e.g. "Edit" or "← Back to Edit") so the user can return to the editor and see the left panel again.
- [x] Export actions (Copy, Download, Export PNG/JPG) remain available in Preview (e.g. in a slim header or footer bar).
- [x] Edit mode unchanged: left panel and canvas editor behave as today.

## Test Plan
- [x] Switch to Preview → left panel not visible, preview area is large.
- [x] Click "Edit" (or Back) → left panel visible again, canvas in edit mode.
- [x] Keyboard P toggles Edit ↔ Preview; layout changes as above.
- [x] Export buttons still work in Preview.

## Files Changed
- `client/src/components/AgentChat.tsx` — Added viewport size tracking (`viewportSize` state + resize listener), `previewContainerWidth` memo that scale-fits the ad to fill the viewport in preview mode; `<aside>` now collapses to `lg:w-0` when `canvasMode === 'preview'` regardless of `leftPanelOpen`; panel toggle button conditionally rendered only in edit mode; preview content block removes `DeviceFrame` in favour of a full-bleed rounded container using `previewContainerWidth`.

## Notes
- `leftPanelOpen` state is preserved as-is so Edit mode returns to the user's last panel-open state.
- The "Edit" button in the header toggle and "← Back to Edit" in the empty-preview state both serve as the exit from Preview mode.
- Export actions (Copy, Download, Export PNG, Export JPEG) remain in the persistent footer bar visible in both modes.
