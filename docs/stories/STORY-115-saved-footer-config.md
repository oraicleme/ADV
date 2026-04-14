# STORY-115: Saved Footer Config — Save & Apply (Same as Logos)

**Status:** 🟡 In Progress
**Created:** 2026-03-11
**Package:** client (Retail Promo Designer)

## What

Footer data (company name, phone, website, address, colors) had no way to save or reuse. Users need to save the current footer and apply a previously saved footer, same pattern as company/brand logos.

## Why

- Users enter footer details once and want to reuse them across ads or sessions.
- Without save, they must re-type everything each time.

## Acceptance Criteria

- [x] "Save this footer" button in the Footer step (Retail Promo) persists current footer config to localStorage.
- [x] "Saved footers" list shows saved entries with name (company name or "Footer N"); each has "Use" and "Remove".
- [x] Clicking "Use" applies that footer config (and enabled state) to the form.
- [x] Max 5 saved footers; saving when full replaces the oldest.
- [x] Persistence module and tests; UI only for Retail Promo.

## Test Plan

- [x] Unit tests: getSavedFooters, saveFooter, removeSavedFooter, max count, isSavedFootersFull.
- [ ] Manual: Save footer → reload or open another ad → apply saved footer; remove from saved.

## Files Changed

- `client/src/lib/saved-footer-config.ts` — New persistence module.
- `client/src/lib/saved-footer-config.test.ts` — Unit tests.
- `client/src/components/AgentChat.tsx` — Footer step: Save button + Saved footers list (Retail Promo only).

## Notes

- Same pattern as saved-logos and saved-brand-logos: localStorage key `retail-promo-saved-footers`, max 5 entries, newest first.
