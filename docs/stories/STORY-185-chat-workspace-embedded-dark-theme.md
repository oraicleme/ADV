# STORY-185: Chat Workspace — Embedded Settings Dark Theme

**Status:** ✅ Done
**Created:** 2026-03-23
**Package:** oraicle-retail-promo (root)

## What

Scope **Search**, **Agent brief**, and **API key** blocks inside `ChatWorkspaceTools` with Tailwind’s **`.dark`** variant so shadcn semantic tokens (`foreground`, `muted`, `border`, sliders, inputs) match the dark chat strip instead of light-theme `:root` colors.

## Why

The handoff (Phase B) noted a mixed theme: settings sections used global light tokens while the chat workspace is visually dark — poor contrast and inconsistent UI.

## Acceptance Criteria

- [x] Embedded workspace settings live under a `.dark` scope with a stable `data-testid` for tests.
- [x] `WorkspaceSettingsPanel` usage of the same sections is unchanged (still light theme).
- [x] Regression test documents the dark scope (source or behavior).
- [x] `pnpm test` and `pnpm exec vite build` pass.

## Test Plan

- [x] `ChatWorkspaceTools.dark-scope.test.ts` passes.
- [ ] Manual: expand Workspace tools on `/agents/retail-promo` — body copy, sliders, textarea, and key field read clearly on dark background.

## Files Changed

- `client/src/components/ChatWorkspaceTools.tsx` — `.dark` wrapper + heading token alignment.
- `client/src/components/ChatWorkspaceTools.dark-scope.test.ts` — new.
- `docs/stories/TRACKER.md` — next story **186**.
- `.cursor/rules/guardian-agent.mdc` — Section 14 next story **186**.

## Notes

- Uses design tokens via `.dark` in `index.css`, not duplicated per-component palette classes.
