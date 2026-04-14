# STORY-58: AI Vision "Edit with Prompt"

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Single-turn AI edit: serialize canvas state → send to IO.NET with user prompt → parse patch response → validate via ad-block-schema → apply patches to React state. Legacy mode shown when conversational chat (STORY-62) is absent.

## Files Changed
- `client/src/lib/ad-canvas-ai.ts` — serialize, build prompt, parse patches, apply
- `client/src/lib/ad-canvas-ai.test.ts` — tests
- `client/src/components/AdCanvasEditor.tsx` — onAiEditWithPrompt prop
