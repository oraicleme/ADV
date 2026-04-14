# STORY-100: Agent → Canvas Action Pipeline Fix

**Status:** 🟡 In Progress
**Created:** 2026-03-09
**Package:** oraicle-retail-promo (client)

## What
Fix the broken pipeline between the AI agent chat and the canvas editor. The agent correctly calls io.net, parses the response, and displays "N changes applied" in the chat — but the canvas state (headline, badge, colors, layout, etc.) is NOT actually updated.

## Why
The agent chat is the core UX differentiator. Users expect that when the AI says "I've created a professional ad" with "13 changes applied", those changes actually appear on the canvas. Currently they don't — the canvas remains in its default state.

## Root Cause Investigation

### Confirmed working:
- io.net API call succeeds (VITE_IONET_API_KEY is now valid)
- `sendChatMessage()` returns correct `{ message, actions }` with valid JSON
- `parseAgentResponse()` extracts the correct number of actions
- Chat panel displays the message and action count correctly
- `extractActions()` properly filters to valid action types

### Suspected failure points:
1. **`applyAgentActions()` → `filterValidPatches()`**: Some patches may be silently rejected by `ad-block-schema.ts` validation (e.g. `imageHeight: 460` when max is 300, `columns: 1` as number vs enum expecting string "1")
2. **State setter context**: The `handleChatSend` useCallback may have stale closures, though React guarantees stable setState identities
3. **React batching**: Multiple rapid setState calls within `applyAgentActions` may batch in a way that causes some updates to be lost
4. **`columns` enum mismatch**: The schema defines `columns` as `enum: ['0','1','2','3','4']` but the AI returns numbers (1, 3, etc.) — coercion via `String()` should handle this, but needs verification

### Key files:
- `client/src/lib/agent-actions.ts` — `applyAgentActions()` dispatcher
- `client/src/lib/ad-canvas-ai.ts` — `filterValidPatches()`, `applyPatches()`
- `client/src/lib/ad-block-schema.ts` — `validateBlockChange()`, `AD_BLOCK_MANIFEST`
- `client/src/components/AgentChat.tsx` — `handleChatSend()` callback (lines 796–990)
- `client/src/components/AdCanvasEditor.tsx` — receives props from AgentChat
- `client/src/components/AgentChatPanel.tsx` — sends user input via `onSend`

## Acceptance Criteria
- [ ] Agent actions (headline, badge, colors, layout, font, element order) are visibly applied to the canvas
- [ ] `catalog_filter` actions correctly update selected product indices
- [ ] `imageHeight` values exceeding schema max (300) are clamped instead of silently rejected — **done** (ad-block-schema)
- [ ] Enum properties (e.g. `columns`) accept numeric AI output and coerce to number for canvas — **done** (coerceValue)
- [ ] No regressions in existing unit tests (fontSize 999 still rejected)

## Test Plan
- [ ] Manual: Add product → send "make a professional ad" → verify canvas updates
- [ ] Manual: Send "filter products by name X" → verify product selection updates
- [ ] Unit: `applyAgentActions` with debug callback confirms setters are invoked
- [ ] Unit: `filterValidPatches` with out-of-range imageHeight returns clamped value

## Files Changed
- `client/src/lib/ad-block-schema.ts` — (1) accept `products.imageHeight` over max and clamp in `coerceValue` to schema max 300; (2) add `enum` case in `coerceValue` to coerce numeric enum values (e.g. `columns` "1" → 1) so canvas receives numbers
- `client/src/lib/agent-actions.ts` — removed temporary debug logging
- `client/src/components/AgentChat.tsx` — reverted debug wrapper on setHeadline

## Notes
- Debug logging has been added to `applyAgentActions()` and `handleChatSend()` — check browser console for `[applyAgentActions]` and `[handleChatSend]` prefixed messages
- The `type: "cta"` action from the AI is not in `VALID_ACTION_TYPES` — it gets filtered out by `extractActions()` in `agent-chat-engine.ts`
- The AI system prompt tells it to use `block_patch` with `blockType: "cta"` and `property: "buttons"`, but the model sometimes returns `type: "cta"` directly
