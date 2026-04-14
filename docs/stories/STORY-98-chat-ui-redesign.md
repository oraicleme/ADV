# STORY-98: AI Agent Chat — Industry-Standard UI Redesign

**Status:** 🟡 In Progress
**Created:** 2026-03-09
**Package:** root

## What
Redesign the AgentChatPanel to match modern AI chat UX (ChatGPT, Claude, v0 style): prominent centered input on empty state, quick-start suggestion chips, larger textarea input, and proper vertical space allocation so the chat is the primary interaction surface — not a tiny afterthought.

## Why
Current chat wastes 90% of the panel on a small centered placeholder text. The input is a cramped single-line field. Users should feel invited to type — the input should be the hero of the empty state.

## Acceptance Criteria
- [x] Empty state: input is centered vertically with welcome text above it, not buried at the bottom
- [x] Quick-start suggestion chips (clickable prompts) shown on empty state
- [x] Input is a multi-line textarea (auto-grows, Enter to send, Shift+Enter for newline)
- [x] Chat panel uses full available height (no arbitrary maxHeight)
- [x] Once messages exist, input docks to bottom and messages fill the space
- [x] Header stays compact; model toggle and controls remain accessible
- [x] Visual polish: modern spacing, subtle animations, clear hierarchy

## Test Plan
- [x] Empty state renders centered input with suggestion chips
- [x] Clicking a chip fills the input
- [x] Textarea auto-grows and Enter sends
- [x] Messages scroll properly when chat has history
- [ ] Responsive on mobile (visual verification needed)
- [x] All 102 tests passing

## Files Changed
- `client/src/components/AgentChatPanel.tsx` — Complete redesign: two-state layout (empty hero vs active chat), textarea replaces input, quick-start chips, bouncing dots typing indicator, full-height flex layout
- `client/src/components/AdCanvasEditor.tsx` — Removed `max-h-96` constraint on tab panel, changed chat wrapper from `overflow-y-auto` to `flex flex-col`

## Notes
- Reference: ChatGPT empty state (centered input + suggestions), Claude (prominent textarea), v0 (chips + input)
