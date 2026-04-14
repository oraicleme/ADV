# STORY-39: Title Font Size & CTA Buttons

**Status:** ✅ Done
**Created:** pre-2025 (retroactive from code)
**Package:** packages/landing → root

## What
Added configurable headline font size (with min/max constraints) and multiple CTA button support (max limit enforced).

## Why
Different ad formats need different headline sizes; multiple CTAs support varied call-to-action strategies.

## Files Changed
- `client/src/lib/ad-constants.ts` — HEADLINE_FONT_SIZE_LIMITS, MAX_CTA_BUTTONS
- `client/src/lib/ad-templates.test.ts` — titleFontSize and ctaButtons tests
- `client/src/components/AgentChat.tsx` — CTA buttons prop
