# STORY-148: VC Investor — System Overview & Roadmap Document

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** docs

## What
A single, concise document for VC investors and technical due diligence that explains how the Oraicle system works: canvas, preview, export pipeline, libraries, external tools, and project story/roadmap.

## Why
Investors need a clear, detailed but readable picture of how we build and ship: one source of truth for the ad (template → preview → export), which tech we use, and how the project is run (story-driven, industry contracts).

## Acceptance Criteria
- [x] One document that covers: system overview, canvas → preview → export flow, key code references (files/functions), libraries and external services, and high-level project story/roadmap.
- [x] Document is concise (not a giant prompt); code is referenced by path and name, not pasted in full.
- [x] Story file created and TRACKER updated.

## Test Plan
- [x] Document exists at `docs/system-overview-vc.md` and is self-contained.
- [x] Manual: readability check and that all linked concepts (WYSIWYG, footer dock, export pipeline, html2canvas, image proxy) are accurately described.

## Files Changed
- `docs/system-overview-vc.md` — new (system overview, pipeline, libs, external tools, roadmap, file map).
- `docs/stories/STORY-148-vc-investor-system-overview-doc.md` — this story.
- `docs/stories/TRACKER.md` — add 148, next story 149.

## Notes
- Cross-references `docs/industry-standard-manner.md` and `docs/stories/TRACKER.md` for deeper detail.
- File map in §6 gives quick paths for canvas, preview, export, agent, and image proxy.
