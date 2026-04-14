# STORY-109 Agent Roadmap Prompt

> Paste one phase at a time into a new agent chat.
> Complete Phase 1, verify tests pass, then proceed to Phase 2.
> Never combine phases — the model will hallucinate or produce untestable diffs.

---

## PHASE 1 — Replace Font Size Slider with Preset Chips

**Paste this as your entire first agent message:**

```
Read STORY-109 at docs/stories/STORY-109-canvas-ux-header-footer-and-text-size.md before starting.

TASK: Replace the headline font size slider in AdCanvasEditor with industry-standard preset
chip buttons, matching the pattern used by Canva and Adobe Express.

CONTEXT:
- File: client/src/components/AdCanvasEditor.tsx
- Current control: <input type="range"> slider (lines ~462-472) + a tiny number <input>
- Problem: 56 steps (16–72), user must scroll many times to reach desired size
- Constants live in client/src/lib/ad-constants.ts (MIN/MAX_TITLE_FONT_SIZE = 16/72)

WHAT TO BUILD:
1. Add to client/src/lib/ad-constants.ts:
   export const TITLE_FONT_SIZE_PRESETS = [16, 20, 24, 32, 48, 64] as const;

2. In AdCanvasEditor.tsx, in the renderHeadline() function:
   - REMOVE the <input type="range"> slider entirely
   - KEEP the existing number <input> (it's the precise entry for power users)
   - ADD a row of chip buttons, one per preset value
   - Active chip (titleFontSize matches preset exactly) gets a visible highlight:
     border-orange-500 text-orange-600 bg-orange-50 font-bold
   - Inactive chips: border-gray-200 text-gray-500 bg-white hover:border-orange-300
   - Clicking a chip calls onTitleFontSizeChange(preset)
   - Keep the "Aa" label for the whole row
   - Number input: keep it, but increase from w-10 to w-12 for legibility
   - The existing data-testid="font-size-slider" should be REMOVED;
     add data-testid="font-size-chip-{value}" to each chip button

ACCEPTANCE:
- No <input type="range"> in the file after this change
- Six chip buttons visible in renderHeadline()
- Clicking 32 chip sets titleFontSize to 32 (verified by data-testid)
- Number input still works (type 45, blur → sets to 45)

TESTS — add to a new file: client/src/components/AdCanvasEditor.test.tsx
(use vitest + @testing-library/react or pure DOM logic if RTL not available;
check vitest.config.ts for environment — if "node", write logic-only tests)

Test cases:
1. TITLE_FONT_SIZE_PRESETS array contains [16, 20, 24, 32, 48, 64]
2. Array is sorted ascending
3. All values are within [MIN_TITLE_FONT_SIZE, MAX_TITLE_FONT_SIZE]
4. Chips: active chip selection logic (given titleFontSize=32, preset 32 is "active")
5. Number input: clamped correctly (input 8 → clamped to MIN, input 200 → clamped to MAX)

After making the changes run: pnpm vitest run
All tests must pass before marking this phase done.
```

---

## PHASE 2 — Wire Footer State into Left Panel

**Paste this as your entire second agent message (only after Phase 1 passes):**

```
Read STORY-109 at docs/stories/STORY-109-canvas-ux-header-footer-and-text-size.md before starting.

TASK: Add a Footer configuration section to the left panel in AgentChat.tsx,
using the existing FooterConfig type from ad-config-schema.ts.

CONTEXT:
- FooterConfig type: client/src/lib/ad-config-schema.ts (already exists, do not change)
- Left panel: client/src/components/AgentChat.tsx — has 3 AccordionStep components
  ("Upload Logos", "Add Products", "Configure Ad")
- The left panel uses a dark glass design language: border-white/10, bg-white/[0.03], etc.
- DO NOT use shadcn Card/Tabs — match the existing AccordionStep style

WHAT TO BUILD in AgentChat.tsx:
1. Add state:
   const [footerEnabled, setFooterEnabled] = useState(false);
   const [footerConfig, setFooterConfig] = useState<FooterConfig>({
     enabled: false,
     options: [],
     backgroundColor: '#1a1a1a',
     textColor: '#ffffff',
   });

2. Add a new AccordionStep (index=3, after "Configure Ad"):
   - Title: "Footer"
   - Summary: footerEnabled ? "On" : "Off"
   - isLast: true (move isLast from "Configure Ad" to this one)

3. Inside the Footer AccordionStep render:
   a. Enable/disable toggle (checkbox + label "Show footer on ad")
   b. When enabled, show these fields using existing input styling (text-sm, border-white/10,
      bg-white/5, text-gray-300, focus:ring-orange-500/50):
      - Company name (text input)
      - Phone (text input, placeholder "+387 61 123 456")
      - Website (text input, placeholder "https://yourstore.com")
      - Address (text input, optional, placeholder "Str. 15, Sarajevo")
      - Footer background color (color picker, default #1a1a1a)
      - Footer text color (color picker, default #ffffff)
   c. No CTA in this phase (Phase 3 adds canvas rendering)

4. Pass footerEnabled and footerConfig down to AdCanvasEditor as:
   footer={footerEnabled ? footerConfig : undefined}
   onFooterChange={setFooterConfig}

ACCEPTANCE:
- "Footer" accordion visible as 4th step in left panel
- Toggle shows/hides footer fields
- Fields update footerConfig state correctly
- footerConfig flows down to AdCanvasEditor via footer prop

TESTS — write to client/src/lib/footer-config.test.ts (logic only, no DOM):
1. Default footerConfig has enabled=false
2. FooterConfig with all fields set serialises to expected JSON shape
3. Toggling enabled flag changes the footer prop passed to canvas (undefined vs config object)

Run pnpm vitest run before marking done.
```

---

## PHASE 3 — Render FooterBar in Canvas Artboard

**Paste this as your entire third agent message (only after Phase 2 passes):**

```
Read STORY-109 at docs/stories/STORY-109-canvas-ux-header-footer-and-text-size.md before starting.

TASK: Render a FooterBar block at the bottom of the AdCanvasEditor artboard when
footer prop is provided and footer.enabled is true.

CONTEXT:
- AdCanvasEditor already accepts footer?: FooterConfig and onFooterChange? props
  (wired in Phase 2 but not yet rendered on canvas)
- The artboard is the centered card in AdCanvasEditor
- The canvas already has CanvasBlock wrappers for headline, badge, cta, disclaimer, products
- Adaptive color utilities getLuminance / getAdaptiveColors are already in the file
- FooterConfig type: client/src/lib/ad-config-schema.ts

WHAT TO BUILD in AdCanvasEditor.tsx:

1. Add 'footer' to the AdElementKey union in ad-constants.ts:
   export type AdElementKey = 'headline' | 'products' | 'badge' | 'cta' | 'disclaimer' | 'footer';

2. Create a renderFooter() function in AdCanvasEditor:
   - Only renders when footer prop exists and footer.enabled is true
   - Renders a band div at the bottom of the artboard:
     - background: footer.backgroundColor (default '#1a1a1a')
     - text: footer.textColor (default '#ffffff')
     - padding: 12px 16px
     - shows enabled fields: company name (bold), phone, website, address (smaller text)
     - Each field only shown if non-empty
   - Wrap in a CanvasBlock with label "Footer" and elementKey="footer"
   - Use the existing adaptive contrast helper for text if backgroundColor is provided

3. Add renderFooter() to the bottom of the artboard element order
   (after the elementOrder.map loop — footer is always last, not drag-reorderable in this phase)

4. In AdCanvasEditor props interface, ensure footer?: FooterConfig is listed
   (it was already added in Phase 2 wiring, but double-check the component signature)

5. Update elementLabels record to include footer: 'Footer'

ACCEPTANCE:
- When footer is undefined → no footer bar visible, no error
- When footer.enabled = false → no footer bar
- When footer.enabled = true with company="Mobileland" phone="+387 61 100 200" → 
  both visible in a bottom band with correct colors
- CanvasBlock hover shows "Footer" label

TESTS — add to client/src/lib/footer-render.test.ts (logic only):
1. renderFooterFields(config) helper: returns [] when no fields set
2. renderFooterFields(config): returns correct field array when phone + website set
3. renderFooterFields(config): skips empty string fields
4. When footer.enabled = false, renderFooter returns null (test the boolean logic)

Run pnpm vitest run before marking done.
```

---

## PHASE 4 — Export: Include Footer in HTML Template

**Paste this as your entire fourth agent message (only after Phase 3 passes):**

```
Read STORY-109 at docs/stories/STORY-109-canvas-ux-header-footer-and-text-size.md before starting.

TASK: Make the footer also appear in the exported HTML (ad-templates.ts renderAdTemplate output).
Currently the canvas shows the footer but the exported HTML does not include it.

CONTEXT:
- Exported HTML: client/src/lib/ad-templates.ts — renderAdTemplate() function
- FooterConfig type: client/src/lib/ad-config-schema.ts
- The function already renders header-like elements (headline, badge, etc.)
- The footer data comes from AgentChat.tsx → AdCanvasEditor → but currently NOT passed
  to renderAdTemplate()

WHAT TO BUILD:

1. Add footer?: FooterConfig to the renderAdTemplate() options parameter
   (alongside existing: companyLogoDataUri, title, products, layout, format, etc.)

2. At the bottom of the generated HTML string (before the closing </div>),
   conditionally append a footer <div> when footer?.enabled is true:
   - background: footer.backgroundColor
   - color: footer.textColor
   - padding: 12px 16px
   - display: flex; justify-content: space-between; align-items: center;
   - Left side: company name + address (stacked, small text)
   - Right side: phone + website
   - If a footer logo exists (footer.logo?.url), show it on the left at height 28px

3. In AgentChat.tsx, pass footerConfig (when footerEnabled) to the livePreviewHtml useMemo
   and to renderAdTemplate inside handleGenerate():
   footer={footerEnabled ? footerConfig : undefined}

4. In AdCanvasEditor.tsx: ensure the AdPreviewFrame (rendered HTML preview) also reflects
   footer — it already does if livePreviewHtml includes footer HTML

ACCEPTANCE:
- Generate Ad with footer enabled → downloaded HTML contains footer div
- Footer div has correct background/text colors
- Footer text fields are HTML-escaped (no XSS from phone/website inputs)
- Without footer or footer.enabled=false → no footer div in HTML output

TESTS — add to client/src/lib/ad-templates.test.ts (if it exists) or new file:
1. renderAdTemplate with footer=undefined → output does not contain 'data-footer'
2. renderAdTemplate with footer.enabled=false → no footer section
3. renderAdTemplate with footer enabled, company="Test Co", phone="+1 555 0100" →
   output contains "Test Co" and "+1 555 0100" in a footer element
4. XSS: footer with website="<script>alert(1)</script>" → output does NOT contain raw <script>
   (should be HTML-escaped: &lt;script&gt;)

Run pnpm vitest run before marking done. Mark STORY-109 status as ✅ Done in the story file
and update docs/stories/TRACKER.md accordingly.
```

---

## Summary Table

| Phase | Scope | Key file(s) | Est. complexity |
|-------|-------|-------------|-----------------|
| 1 | Chip presets replacing slider | `AdCanvasEditor.tsx`, `ad-constants.ts` | Low |
| 2 | Footer state + left panel fields | `AgentChat.tsx` | Medium |
| 3 | FooterBar rendered in artboard | `AdCanvasEditor.tsx`, `ad-constants.ts` | Medium |
| 4 | Footer in exported HTML | `ad-templates.ts`, `AgentChat.tsx` | Low-Medium |

**Why 4 phases?**
Each phase has a clear, verifiable acceptance criteria and touches different files. Combining them
risks the model losing track of the canvas rendering pipeline (`AgentChat` → `AdCanvasEditor` →
`ad-templates`) and hallucinating prop names or missing the state wiring. One phase at a time also
means a regression in Phase 3 doesn't corrupt the Phase 1 font-size improvement.
