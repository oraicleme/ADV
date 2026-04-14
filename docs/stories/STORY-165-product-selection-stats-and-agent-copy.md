# STORY-165: Product Selection Stats — Shown vs Checked + Agent Prompt

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client + agent prompt)

## What

1. **UI:** Replace misleading **"0 in list"** with **"shown"** (count of `filteredProducts`) and rename **"in list"** → **"checked"** (batch checkboxes), with **title** tooltips for both.
2. **Canvas + legacy** rows in the panel header use the same vocabulary where applicable.
3. **Agent:** Extend `agent-chat-engine.ts` so the **PRODUCT CATALOG** system prompt explains **catalog vs on ad vs available vs shown vs checked** so the assistant does not contradict the UI.

## Why

Users saw **6191** rows in the scrollable list but **"0 in list"** — "in list" meant **checkbox selection**, not **visible rows**. That looked like a bug. The AI also sometimes implied the whole catalog was loaded when search had narrowed the view.

## Acceptance Criteria

- [x] Stats row includes **shown** = filtered list length and **checked** = panel checkbox count (with tooltips).
- [x] **agent-chat-engine.ts** documents the five concepts for the assistant.
- [x] Story + tracker updated.

## Test Plan

- [x] Manual: open Products tab — with empty search, **shown** ≈ **available** (when unused filter on); type search — **shown** drops.

## Files Changed

- `client/src/components/ProductSelectionPanel.tsx` — stats labels + tooltips
- `client/src/lib/agent-chat-engine.ts` — PRODUCT SELECTION PANEL paragraph
- `docs/agent-product-selection-panel.md` — reference table for agents/support
- `docs/stories/STORY-165-product-selection-stats-and-agent-copy.md`

## Notes

Optional follow-up: sync **checked** with **on ad** via `selectedProductIds` from `AgentChat` — out of scope for this story.
