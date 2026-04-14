# STORY-129: Multi-Page & Preview — Industry Manner + No Leaking Helpers

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client (Retail Promo Designer)

## What

Align multi-page canvas and preview with **how big players do it** (Canva, Adobe Express, Figma): first page full, preview = canvas, clear page model. Also enforce a **code rule**: no helpers that “spill out” (export/public) without a clear in-app consumer — they add surface area and confusion without benefit.

## Why

- Users expect behavior consistent with tools they know (Canva, Adobe): first page filled, preview matches canvas, export matches preview.
- Exported helpers with no real consumer (only tests or “future use”) clutter the API, make refactors harder, and violate YAGNI.

## Industry Reference (how the big ones do it)

| Aspect | Canva / Adobe Express / Figma |
|--------|------------------------------|
| **Page distribution** | First page(s) full; short page last. User always sees a “full” first page. |
| **Preview** | Preview shows exactly the current page / current view; same as export for that frame. |
| **Page indicator** | Clear “Page 1 of N” and prev/next; optional in-preview pagination. |
| **API surface** | Logic lives in components or in non-exported modules; few “utility” exports unless reused or part of a clear public API. |

We already did: first-page-full (STORY-127/canvas-pages), preview-follows-canvas (STORY-128). This story locks the **principle** and the **no-leaking-helpers** rule.

## Acceptance Criteria

- [x] **P1** Document or confirm: page distribution is “first page full, short page last” (already implemented in `canvas-pages.ts`).
- [x] **P2** No **new** public helpers that don’t have a clear in-app consumer. New logic: in-component or in a non-exported module; export only when multiple call sites or a defined public API need it.
- [x] **P3** Review existing “preview HTML” helper: either (a) keep as a **single internal module** used only by AgentChat + tests, with no other exports, or (b) inline the logic into AgentChat and test via component/integration; remove any helper that “only exists for tests” and doesn’t simplify the component.
- [x] **P4** Story doc or project rule: “No leaking helpers — don’t export utilities that have no in-app consumer.”

## Test Plan

- [x] **T1** Existing canvas-pages and preview tests still pass (no regression).
- [x] **T2** If preview logic is moved/inlined, ensure AgentChat preview behavior is covered (existing or new test).

## Files Changed

- `client/src/lib/canvas-pages.ts` — doc comment: industry standard "first page(s) full, short page last".
- `client/src/lib/preview-html.ts` — internal-use notice: used only by AgentChat + tests.
- `.cursor/rules/no-leaking-helpers.mdc` — new rule: no leaking helpers.

## Files to Touch (expected)

- `client/src/lib/canvas-pages.ts` — already correct; at most a comment that distribution is “first page full.”
- `client/src/components/AgentChat.tsx` — single place that decides `previewHtmlToShow` (either via internal helper or inlined).
- `client/src/lib/preview-html.ts` — either make non-exported (internal) or inline into AgentChat and remove file; tests updated accordingly.
- Optional: `.cursor/rules` or `docs/` — short rule: “No leaking helpers.”

## Notes

- **Helper rule:** “Helpers that spill out” = exported functions/modules that nothing in the app (other than tests) uses. Prefer: logic inside the component, or in a file that is not part of the public API (e.g. `preview-html.ts` with a single export used only by AgentChat can be kept but documented as internal, or inlined).
- **Industry alignment:** First-page-full and preview = current page are already done; this story is about documenting the standard and cleaning the helper surface.
