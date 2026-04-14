# STORY-179: Workspace Settings — Collapsible Accordion (Close Open Section)

**Status:** ✅ Done  
**Created:** 2026-03-21  
**Package:** oraicle (client)

## What

Enable **collapsing** workspace settings accordion sections (`collapsible={true}`) and allow **no section open** so users can hide long forms (Import, etc.) after opening. Radix previously used `collapsible={false}`, which set `aria-disabled` on the active trigger and blocked closing.

## Why

Users could not dismiss an expanded section; the Import panel stayed open with no way to collapse it from the same control pattern as other sections.

## Acceptance Criteria

- [x] Clicking the open section header collapses it; all sections can be closed.
- [x] Deep-link from Products still opens the target section.
- [x] Existing tests pass.

## Test Plan

- [x] `pnpm vitest run`

## Files Changed

- `client/src/components/WorkspaceSettingsPanel.tsx` — `collapsible`, controlled `value` with empty state
- `client/src/components/AdCanvasEditor.tsx` — `workspaceSettingsSection` may be `null`

## Notes

- Initial state remains `connections` when opening Settings.
