# STORY-109: Canvas UX — Header Text Size Control + Footer Section

**Status:** ✅ Done
**Created:** 2026-03-11
**Package:** client

## What

Two related canvas UX improvements:

1. **Headline font size control** — the current slider (range 16–72, step 1 = 56 steps) forces the
   user to scroll many times to find the right size. Replace with industry-standard quick-set
   button presets (like Canva / Figma) plus a direct number input.

2. **Footer section in left panel & canvas** — the schema (`FooterConfig`), component
   (`HeaderFooterConfigPanel`), and types (`FooterOption`) all exist, but the footer is not wired
   into the left "Configure Ad" accordion, nor rendered visibly on the canvas artboard. Add a
   collapsible Footer accordion to the left panel with: company info, contact details, logo,
   optional CTA, and make it render correctly in the artboard.

## Why

### Font size UX
Canva, Adobe Express, Figma, and Google Slides all use **preset size chips** (8 / 12 / 14 / 18 /
24 / 36 / 48 / 64) rather than a plain range slider. A slider is imprecise, slow, and gives no
visual landmark. The number input next to the slider partially solves this but is tiny (10px
font). Industry standard is: chips for common sizes + editable text field that accepts keyboard
input.

### Footer
Retail ad formats (Viber story, Instagram story, Facebook story) are tall (1080×1920). The bottom
30% of the canvas is unused blank space unless a footer is present. Competitors like Canva,
Snappa, and Adobe Express all have a dedicated footer zone: logo strip, website URL, phone,
CTA button. Without this, the generated ads look unfinished.

## Acceptance Criteria

### Font size
- [x] Headline block shows **size preset chips** with at least 6 common sizes (16 / 20 / 24 / 32 / 48 / 64)
- [x] Active preset chip is highlighted (accent color ring / bold)
- [x] A direct editable number input still exists for precise control (type any value in range)
- [x] Slider is **removed** — replaced entirely by chips + input
- [x] Keyboard: typing a number in the input and pressing Enter or blurring applies it immediately
- [x] Size changes are reflected live on the canvas headline text

### Footer in left panel
- [x] "Footer" accordion exists in the left panel (below "Configure Ad" step or as its own step)
- [x] Footer can be toggled on/off with a checkbox / switch
- [x] When enabled, user can set: company name, phone, website URL, address (free-text fields)
- [ ] Optional: upload footer logo (reuses existing logo upload infrastructure)
- [ ] Optional: CTA text (e.g. "Shop now")
- [x] Footer background and text color pickers
- [x] Footer data is passed into the canvas state and rendered as a band at the bottom of the
  artboard in `AdCanvasEditor`

### Canvas rendering
- [x] When footer is enabled, a `FooterBar` block appears at the bottom of the artboard
- [x] FooterBar shows the configured fields (name, phone, website, logo — whatever is enabled)
- [x] FooterBar uses adaptive contrast (follows the artboard bg color logic already in place)
- [ ] Footer block is a `CanvasBlock` so it can be drag-reordered like other elements (deferred — footer fixed at bottom per Phase 3 spec)

## Industry Reference

| Tool | Font size control | Footer |
|------|-------------------|--------|
| **Canva** | Chip row: 8/12/14/18/24/36/48/64/72/96/144 + type-in field | Dedicated footer row with logo, URL, social icons |
| **Adobe Express** | Dropdown with presets + manual type-in | Footer / brand section configurable |
| **Figma** | Direct numeric input with up/down arrows, no slider | N/A (design tool, not template-based) |
| **Snappa** | Preset buttons + type-in | Footer zone with drag-drop elements |
| **Google Slides** | Type-in field + toolbar size dropdown | N/A |

**Key pattern across all tools:** presets remove the cognitive burden of "what size looks good?"
by providing opinionated defaults; direct input gives power users escape.

## Test Plan

- [x] Unit: `fontSizePresets` array contains correct values and is sorted ascending
- [x] Unit: clicking a preset chip calls `onTitleFontSizeChange` with the correct value
- [x] Unit: typing in number input and blurring calls `onTitleFontSizeChange` clamped to [16, 72]
- [x] Unit: footer data flows correctly from left-panel inputs to `FooterConfig` state
- [x] Unit: `FooterBar` renders all enabled fields with correct text
- [x] Manual: no slider UI visible in headline block after change
- [x] Manual: footer band visible at bottom of artboard when enabled

## Files Changed

- `client/src/components/AdCanvasEditor.tsx` — replaced slider with chip row in `renderHeadline()`; added `renderFooter()` + FooterBar at artboard bottom; imported `TITLE_FONT_SIZE_PRESETS`
- `client/src/lib/ad-constants.ts` — added `TITLE_FONT_SIZE_PRESETS = [16, 20, 24, 32, 48, 64]`; added `'footer'` to `AdElementKey`; added `footer?: FooterConfig` to `AdTemplateData`; imported `FooterConfig`
- `client/src/lib/ad-config-schema.ts` — added `companyName?: string` field to `FooterConfig`
- `client/src/components/AgentChat.tsx` — added `footerEnabled` + `footerConfig` state; added Footer AccordionStep (index 3) with all fields; wired `footer` + `onFooterChange` to `AdCanvasEditor`; wired footer into `livePreviewHtml` and `handleGenerate`
- `client/src/lib/ad-templates.ts` — added `buildFooterHtml()` + `injectFooter()` helpers; footer injected before `</body>` in all render paths; imported `escapeHtml` for XSS safety
- `client/src/components/AdCanvasEditor.test.ts` — new file: Phase 1 logic tests (34 assertions across 4 phases)
- `client/src/lib/footer-config.test.ts` — new file: Phase 2 footer state logic tests
- `client/src/lib/footer-render.test.ts` — new file: Phase 3 FooterBar render logic tests
- `client/src/lib/ad-templates.test.ts` — new file: Phase 4 HTML export + XSS tests

## Notes

- Do NOT remove `MIN_TITLE_FONT_SIZE` / `MAX_TITLE_FONT_SIZE` — the number input still clamps to them.
- `FooterConfig` type already exists in `ad-config-schema.ts` — reuse it; don't re-invent.
- The left panel footer section should match the visual style of the existing accordion steps
  (dark glass card with orange step number).
- Keep the footer rendering optional and clearly behind an `enabled: boolean` gate so users who
  don't need it see no change in their workflow.
- The `HeaderFooterConfigPanel` component already exists but is complex and uses shadcn `Card` /
  `Tabs` — simplify for the left panel to match the existing design language instead of
  transplanting the full panel.

## Agent Roadmap

> **This story is too large for a single agent turn.** Use the prompt below to spawn a
> sub-agent chain. Each phase is independently completable and testable.

See section: **[Agent Roadmap Prompt](#agent-roadmap-prompt)** below.
