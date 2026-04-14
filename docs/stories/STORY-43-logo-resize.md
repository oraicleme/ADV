# STORY-43: Logo Resize, Alignment & Companion

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Logo height control via drag-resize, horizontal alignment options (left/center/right), and companion element rendering beside the logo (e.g., company name, tagline).

## Files Changed
- `client/src/components/AdCanvasEditor.tsx` — logoHeight, logoAlignment, logoCompanion props + drag handler
- `client/src/lib/ad-templates.test.ts` — logo resize/alignment tests
- `client/src/components/AgentChat.tsx` — logo options props
