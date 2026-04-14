# STORY-170: Left Panel — Settings / Import / Search / API Roadmap (Documentation)

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle (docs)

## What

Author **`docs/left-panel-settings-roadmap.md`**: information architecture for the left card (Chat, Products, Export, Settings), placement of API config, Excel/manual import, search tuning, end-stage design defaults, and the **system vs user-configurable** split for agent behavior.

## Why

The team needs a single reference before implementing the Settings tab shell and BYOK/import/search phases.

## Acceptance Criteria

- [x] Document describes tab placement, Settings sub-sections, progressive disclosure, and phased engineering roadmap.
- [x] Clear rule: core agent prompts/schema stay in code; user-facing prompt engineering is **additive** and bounded.

## Test Plan

- [x] N/A (documentation).

## Files Changed

- `docs/left-panel-settings-roadmap.md`
- `docs/stories/STORY-170-left-panel-settings-roadmap-doc.md`
- `docs/stories/TRACKER.md`
