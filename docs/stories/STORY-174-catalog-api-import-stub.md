# STORY-174: Catalog API — Import Stub (Persist Only)

**Status:** ✅ Done
**Created:** 2026-03-20
**Package:** oraicle (client)

## What

Add a **Catalog API** configuration block under **Workspace Settings → Import**: base URL, optional HTTP auth header name/value, and a **sync cadence** preference (stored only). **No network calls** — this aligns IA with the API-first roadmap until a real sync exists.

## Why

Users need one place to prepare credentials and URL before E2E sync exists; shipping the shell avoids rework when the ingestion pipeline lands.

## Acceptance Criteria

- [x] Settings → **Import** shows the Catalog API stub (copy explains no sync yet).
- [x] Values persist in this browser (localStorage) with sensible length limits; secrets are masked in the UI.
- [x] Unit tests cover read/write, merge, reset, and change event dispatch.

## Test Plan

- [x] `catalog-api-settings-storage.test.ts` passes
- [x] `pnpm vitest run` on new/changed tests passes

## Files Changed

- `client/src/lib/catalog-api-settings-storage.ts` — persist + bounds + event
- `client/src/lib/catalog-api-settings-storage.test.ts` — new
- `client/src/components/CatalogApiImportStubSection.tsx` — Import UI stub
- `client/src/components/WorkspaceSettingsPanel.tsx` — embed Import stub; drop unused import

## Notes

- Future work: HTTP client + server proxy or tRPC; this story is **storage + UI only**.
