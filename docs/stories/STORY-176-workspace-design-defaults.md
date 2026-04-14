# STORY-176: Workspace Design Defaults (P5)

**Status:** ✅ Done
**Created:** 2026-03-20
**Package:** oraicle (client)

## What

Persist **default format, layout, and style** (background/accent/fonts) in localStorage; expose **Settings → Design defaults** to edit them; **apply on new session** (initial AgentChat state) and via **“Apply to current ad”** (event → updates canvas).

## Why

P5 from `docs/left-panel-settings-roadmap.md`: faster repeated work; defaults stay bounded (valid presets + hex colors).

## Acceptance Criteria

- [x] Settings → **Design defaults** has controls + save/reset + apply-to-current-ad.
- [x] Storage validates format id, layout id, hex colors, font length.
- [x] Fresh load uses saved defaults for format/layout/style when present.
- [x] Unit tests for storage + resolution.

## Test Plan

- [x] `design-defaults-storage.test.ts`
- [x] `pnpm vitest run` on touched tests passes

## Files Changed

- `client/src/lib/design-defaults-storage.ts` — persist, validate, resolve, apply event
- `client/src/lib/design-defaults-storage.test.ts` — new
- `client/src/components/DesignDefaultsSection.tsx` — Settings → Design defaults UI
- `client/src/components/WorkspaceSettingsPanel.tsx` — embed design section
- `client/src/components/AgentChat.tsx` — initial state + listen for apply-to-canvas

## Notes

- Does not override headline/products content — only canvas chrome defaults.
