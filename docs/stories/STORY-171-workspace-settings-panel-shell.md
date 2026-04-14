# STORY-171: Workspace Settings Panel Shell (P0)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle (client)

## What

Replace the Settings tab placeholder with **`WorkspaceSettingsPanel`**: accordion sections (Connections, Import, Search, Agent, Design defaults) with placeholder copy; controlled open section from parent; **Products** tab link “Search settings” switches to Settings → Search.

## Why

[`left-panel-settings-roadmap.md`](../left-panel-settings-roadmap.md) P0 — navigable IA before BYOK/import work.

## Acceptance Criteria

- [x] Settings tab renders accordion; all five sections have short placeholder text (no dead end).
- [x] Parent controls which section is open (for deep link from Products).
- [x] Products panel includes a control to jump to Settings → Search.
- [x] Tests: `workspace-settings-sections.test.ts` (ids + type guard).

## Test Plan

- [x] `pnpm exec vitest run client/src/lib/workspace-settings-sections.test.ts`

## Files Changed

- `client/src/components/WorkspaceSettingsPanel.tsx`
- `client/src/lib/workspace-settings-sections.ts`, `workspace-settings-sections.test.ts`
- `client/src/components/AdCanvasEditor.tsx`
- `client/src/components/ProductSelectionPanel.tsx`
- `docs/left-panel-settings-roadmap.md` — P0 shipped
- `docs/stories/TRACKER.md` — next **172**
