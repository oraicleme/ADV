# STORY-108: Second Turn Stuck — Vision Analysis Blocks on Mobileland URLs

**Status:** ✅ Done
**Created:** 2026-03-11
**Package:** client

## What

After a successful first agent turn (which runs `catalog_filter` and selects products), the
second user message causes the chat to hang at "..." for up to 3.5 minutes before either
responding or showing an error.

## Why

The vision analysis (`analyzeProductImages`) was being called with Mobileland HTTP image URLs
(e.g. `https://mobileland.me/catalog/...`). Each vision model attempt has a 45-second timeout,
and there are 2 models. Combined with the main LLM call (60s × 2 models), the worst-case
hang is 45+45+60+60 = **210 seconds**.

## Root Cause

Chain of events after STORY-107 zero-selection:

1. First agent turn → `catalog_filter` action → `setSelectedProductIndices(N indices)`
2. `templateProducts` re-computes with those products — their `imageDataUri` is populated
   from `mobilelandImageUrls[i]` (HTTPS URLs, not `data:` URIs)
3. `useEffect([templateProducts])` fires → resets `imageAnalysisRan = false`
4. Second message → `imageUris` is non-empty (Mobileland URLs) → `await analyzeProductImages(...)` fires
5. io.net vision model tries to fetch the cross-origin Mobileland URL → hangs up to 45s
6. Fallback vision model → another 45s
7. Then `sendChatMessage` (main LLM) → 60s + 60s fallback
8. UI shows "..." for the entire duration, appearing stuck

Before STORY-107 the issue was masked: all 6213 products were auto-selected on upload but
had no `imageDataUri` (no Mobileland images loaded yet), so `imageUris` was always empty
and vision analysis never ran.

## Fix

Filter `imageUris` to only include `data:` URIs (user-uploaded base64 images).
Mobileland HTTP URLs are NOT suitable for vision analysis — they're external cross-origin URLs
that the io.net server may not be able to reach.

One-line change in `AgentChat.tsx`:

```diff
- .filter((uri): uri is string => !!uri)
+ .filter((uri): uri is string => !!uri && uri.startsWith('data:'))
```

## Acceptance Criteria

- [x] Upload Excel with Mobileland products → send first prompt → works (unchanged)
- [x] After first agent turn selects products → send second prompt → responds within normal LLM time (< 30s)
- [x] No "stuck" spinner on second or subsequent turns
- [x] Vision analysis still runs correctly for user-uploaded product photos (base64 data URIs)

## Test Plan

- [x] Verify `imageUris` filter only passes `data:` URIs to `analyzeProductImages`
- [x] Existing agent-chat-engine tests pass
- [x] Manual test: upload catalog → prompt → prompt → no hang

## Files Changed

- `client/src/components/AgentChat.tsx` — filter `imageUris` to `data:` URIs only (one line)

## Notes

- The `useEffect([templateProducts])` reset of `imageAnalysisRan` is correct in intent
  (re-analyze when product set changes) but was accidentally triggered by catalog_filter
  selection changes. The `data:` URI filter is a simpler and more targeted fix.
- Vision analysis enrichment is optional — the agent works fine without it.
