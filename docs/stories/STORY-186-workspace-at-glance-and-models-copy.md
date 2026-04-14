# STORY-186: Workspace At-a-Glance + Models List Copy

**Status:** ✅ Done
**Created:** 2026-03-23
**Package:** oraicle-retail-promo (root)

## What

1. **Chat → Workspace tools:** Add a compact **at-a-glance** strip (read-only) for **Catalog API import** status and **design defaults** summary (format + layout), using the same persisted data as Settings. Users see state without opening Settings; shortcut buttons remain the primary path to edit.
2. **Settings → Models (`IonetModelsSettingsSection`):** Improve **empty and error copy** so it reflects **two valid places** to save the LLM key (Chat → Workspace tools API block and Settings → Connections) and clarifies **empty API responses** vs **not loaded yet**.

## Why

Handoff Phase B (items 2–3): users asked for “everything in chat” — full import/design forms in the chat strip would be heavy and error-prone. Industry pattern: **progressive disclosure** (summary + deep link), **visibility of system status** (Nielsen #1), and **consistent terminology** for the shared `localStorage` API key.

## Scope boundaries (validity)

| In scope | Out of scope |
|----------|----------------|
| Read-only labels + one-line design summary | Duplicating Catalog API form or full Design defaults editor in chat |
| Copy + optional `role="status"` for the strip | Playwright/Cypress E2E (separate story) |
| Pure helper + unit tests for summary string | Changing sync/API behavior |

## UX copy (canonical — implement as written or tighten, not contradict)

### At-a-glance strip (ChatWorkspaceTools)

- Section title: **At a glance** (`text-muted-foreground`, uppercase micro-label).
- **Catalog API:** `Configured` or `Not configured` (from `hasSavedCatalogApiConfig()`).
- **Design defaults:** `{format label} · {layout label}` (e.g. `Instagram Post · Multi grid`), from `designDefaultsSummaryLine()` in `workspace-tools-at-glance.ts`.

### Models section — no API key (blocking `listModels`)

- **Primary message:** `Add your API key in Chat → Workspace tools, or under Connections here, then click Refresh model list.`
- Rationale: same storage (`llm-api-key-storage`); users who only use chat were misled by “Connections” alone.

### Models section — API returned zero models (no error string)

- Replace generic “No models loaded yet.” with: `No models returned. Check your key or account, then try Refresh.`

## Acceptance Criteria

- [x] `ChatWorkspaceTools` shows an at-a-glance block (dark-scoped) with Catalog API status + design defaults summary; values update when catalog or design storage events fire.
- [x] `IonetModelsSettingsSection` uses the canonical copy above for no-key and empty-list cases.
- [x] `designDefaultsSummaryLine` covered by unit tests; `pnpm test` and `pnpm exec vite build` pass.

## Test Plan

- [x] `client/src/lib/workspace-tools-at-glance.test.ts` — format/layout labels for known snapshots.
- [x] `IonetModelsSettingsSection.copy.test.ts` + `ChatWorkspaceTools.dark-scope.test.ts` (STORY-186 assertions).

## Files Changed

- `client/src/lib/workspace-tools-at-glance.ts` — new
- `client/src/lib/workspace-tools-at-glance.test.ts` — new
- `client/src/components/ChatWorkspaceTools.tsx` — strip + hooks
- `client/src/components/IonetModelsSettingsSection.tsx` — copy
- `client/src/components/IonetModelsSettingsSection.copy.test.ts` — new
- `client/src/components/ChatWorkspaceTools.dark-scope.test.ts` — STORY-186 at-a-glance
- `docs/stories/TRACKER.md`, `docs/handoff-new-agent-2026-03-21.md` — tracker + prompt
- `.cursor/rules/guardian-agent.mdc` — Section 14 next story 187

## Notes

- Layout labels must stay aligned with `DesignDefaultsSection` / `LAYOUT_OPTIONS` (duplicate map in `workspace-tools-at-glance.ts` until a shared export exists).

---

## Prompt for the next agent (STORY-187+)

Use **`docs/handoff-new-agent-2026-03-21.md` §6** — it references next story **187**, STORY-184–186 context, Guardian sync, and a `<TASK>` placeholder. This story is complete; create `STORY-187-<slug>.md` before the next implementation.
