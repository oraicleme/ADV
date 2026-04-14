# STORY-149: VC doc rewrite (code-grounded Canvas/Preview/Export)

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** docs

## What
Rewrite `docs/system-overview-vc.md` to be fully code-grounded and investor-ready:
- how Canvas state becomes template HTML
- how Preview renders that HTML (iframe + scaling)
- how Export converts the HTML/DOM into PNG/JPEG (image resolution + html2canvas)
- how `/api/image-proxy` supports export when product images are external

## Why
The previous investor document was missing implementation details. This version must describe the real code paths, with precise file/function references, so a VC/investor can understand how the system works without assuming anything.

## Acceptance Criteria
- [x] `docs/system-overview-vc.md` contains step-by-step implementation sections for Canvas, Preview, and Export with concrete code references (file paths + function names).
- [x] No speculative statements: every claim is traceable to code we reference.
- [x] Document includes `/api/image-proxy` behavior and why it exists.
- [x] The story `STORY-149` is updated to ✅ Done only after the doc rewrite is complete.

## Test Plan
- [x] Manual validation: verify all referenced paths/functions exist in the repo.
- [x] Manual validation: sanity-check that the described flows match the code signatures.

## Files Changed
- `docs/system-overview-vc.md` — rewrite to be code-grounded

## Notes
If a section can’t be supported with exact code references, it should be omitted or rewritten to a “what the code does” description.

