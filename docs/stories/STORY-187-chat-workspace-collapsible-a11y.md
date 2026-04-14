# STORY-187: Chat Workspace — Collapsible Accessibility

**Status:** ✅ Done
**Created:** 2026-03-23
**Package:** oraicle-retail-promo (root)

## What

Improve **keyboard and screen-reader support** for the collapsible **Workspace tools** block in `ChatWorkspaceTools`: verify **`aria-expanded`** (and Radix **`data-state`**) on the trigger, ensure a **visible `:focus-visible`** ring on the trigger, and add **regression tests** so future refactors do not drop accessibility hooks.

## Why

`docs/handoff-new-agent-2026-03-21.md` §4 lists a follow-up: confirm **focus order** and **`aria-expanded`** on the Radix `Collapsible` used in chat. This aligns with progressive disclosure already shipped (STORY-183/186) without scope-creeping into a full WCAG audit.

## Scope boundaries (validity)

| In scope | Out of scope |
|----------|----------------|
| `ChatWorkspaceTools` collapsible trigger + content region | Settings tab accordions; other `Collapsible` usages |
| Unit tests (Vitest + jsdom, `react-dom/client` + Radix) | Playwright / Cypress E2E |
| Tailwind focus-visible styles on the trigger | Redesigning the whole dark strip |

## UX / technical notes (canonical)

- **Trigger:** Must remain a single focusable control (Radix default: `button`); **ChevronDown** icon stays `aria-hidden` if it is decorative.
- **Collapsed vs expanded:** Tests assert `aria-expanded="false"` / `"true"` (or equivalent Radix exposure) after toggle.
- **Focus:** Trigger uses a visible **focus ring** (e.g. `focus-visible:ring-*` / `outline`) that works on the dark chat strip.

## Acceptance Criteria

- [x] `CollapsibleTrigger` for Workspace tools exposes **expanded state** to assistive tech (e.g. `aria-expanded` matches open/closed), verified by tests.
- [x] Trigger has **visible keyboard focus** (`:focus-visible`) in the dark workspace strip; no regressions to light-themed Settings.
- [x] **Regression tests** cover collapsed vs expanded; `pnpm test` and `pnpm exec vite build` pass.

## Test Plan

- [x] Extend `ChatWorkspaceTools.dark-scope.test.ts` (or add `ChatWorkspaceTools.a11y.test.ts` if cleaner) — toggle trigger, assert `aria-expanded` / `data-state`.
- [x] Manual: Tab to “Workspace tools”, expand/collapse with Space/Enter, confirm focus ring visible.

## Files Changed

- `client/src/components/ChatWorkspaceTools.tsx` — `focus-visible` ring + `aria-hidden` on chevron; STORY-187 header note.
- `client/src/components/ChatWorkspaceTools.a11y.test.ts` — regression: `aria-expanded`, root `data-state`, focus ring classes; jsdom `ResizeObserver` + `IS_REACT_ACT_ENVIRONMENT`.
- `vitest.config.ts` — `@vitejs/plugin-react` so Vitest transforms `.tsx` imports (matches app JSX runtime).
- `docs/stories/TRACKER.md` — STORY-187 Done; next story **189**.
- `.cursor/rules/guardian-agent.mdc` — Section 14 sync (next story **189**, STORY-187 Done).

## Notes

- Radix `@radix-ui/react-collapsible` typically sets `aria-expanded` on `CollapsibleTrigger`; this story **locks** that behavior with tests rather than reimplementing primitives.
- **Prompt for next agent:** `docs/handoff-new-agent-2026-03-21.md` §6 — replace `<TASK>` with the next story from **`TRACKER.md`** (next id **189**).

---

## Prompt for the next agent (STORY-188+)

When STORY-187 is **Done**, use **`docs/handoff-new-agent-2026-03-21.md` §6** with next story number from **`TRACKER.md`**.
