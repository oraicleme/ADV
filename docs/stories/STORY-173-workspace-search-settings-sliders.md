# STORY-173: Workspace Search — Min-Score Sliders (P3)

**Status:** ✅ Done
**Created:** 2026-03-19
**Package:** oraicle (client)

## What

Add **Search** controls under Workspace Settings: sliders for manual catalog min-score thresholds (long-query precision vs short-token recall), persisted in `localStorage` with safe numeric bounds, and wired into `getCatalogMinScoreForQuery` so the Products tab search updates when settings change.

## Why

P3 from `docs/left-panel-settings-roadmap.md`: users need tunable relevance without editing code; thresholds stay within app-defined bounds.

## Acceptance Criteria

- [x] Workspace Settings → **Search** shows two sliders (long-query / short-token min score) with reset-to-defaults.
- [x] Values persist in this browser and clamp to documented safe ranges.
- [x] Product list search uses stored thresholds; changing settings refreshes visible results (same tab).
- [x] Unit tests cover storage + `getCatalogMinScoreForQuery` with defaults and overrides.

## Test Plan

- [x] `search-settings-storage.test.ts` — read/write, clamp, defaults, dispatch event
- [x] `product-search-min-score.test.ts` — defaults unchanged when storage empty; overridden values applied
- [x] `pnpm vitest run` for affected test files passes

## Files Changed

- `client/src/lib/search-settings-storage.ts` — localStorage + bounds + change event
- `client/src/lib/product-search-min-score.ts` — reads thresholds for manual search
- `client/src/components/SearchSettingsSection.tsx` — sliders UI
- `client/src/components/WorkspaceSettingsPanel.tsx` — embed Search section
- `client/src/components/ProductDataInput.tsx` — recompute visible rows on settings change
- `client/src/lib/search-settings-storage.test.ts` — new
- `client/src/lib/product-search-min-score.test.ts` — extended

## Notes

- AI-interpreted search (`source === 'ai'`) stays minScore `0` (recall-first); sliders apply to **manual** search only.
