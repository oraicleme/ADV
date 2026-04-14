# STORY-114: Brand Logo Remove & Swap — Industry-Standard UX

**Status:** 🟡 In Progress
**Created:** 2026-03-11
**Package:** client (Retail Promo Designer)

## What

Users cannot easily remove or swap brand logos after adding them. Once a brand logo is in the ad (from upload or from the saved library), there is no clear “in your ad” list to remove one or reorder. Industry standard (Canva, Figma) separates “assets in this design” from “library” and lets users remove or swap any asset in the design without deleting from the library.

## Why

- Users change their mind: “advertise with this and that logo, or remove one and add another.”
- Today: uploaded brand logos can be removed via the upload zone; logos added from “Saved brand logos” have no per-item remove in the sidebar, so the only way to remove them is unclear or indirect.
- Result: confusion and inability to manage which brand logos appear in the current ad.

## Acceptance Criteria

- [x] A dedicated **“Brand logos in your ad”** section lists every brand logo currently used in the ad (same order as canvas), each with a remove (X) control.
- [x] Removing an item from this list removes only that logo from the ad; it does not remove the logo from the saved library.
- [x] Users can remove any brand logo (whether it came from upload or from the saved library) from the ad from this one place.
- [ ] Section is visible when there is at least one brand logo in the ad; placement is above the Brand Logos upload zone so the flow is: “in ad” → upload / saved library.
- [ ] Optional: reorder “in ad” list (stretch goal; can be a follow-up story if time-boxed).

## Test Plan

- [x] Unit test: “Brand logos in your ad” remove-by-index logic (LogoUploader.test.ts) — same contract as parent callback.
- [ ] Manual: Add brand logo from upload → see it in “Brand logos in your ad” → remove via X → ad updates. Add from saved → same behavior.
- [ ] Manual: Remove from “in ad” does not remove from “Saved brand logos” library.

## Files Changed

- `client/src/components/LogoUploader.tsx` — Add “Brand logos in your ad” section and `onRemoveBrandLogoFromAd(index)`.
- `client/src/components/AgentChat.tsx` — Pass `onRemoveBrandLogoFromAd`; remove by index from `brandLogoDataUris`.
- `client/src/components/LogoUploader.test.ts` — Unit tests for remove-by-index contract.
- `docs/stories/STORY-114-brand-logo-remove-swap.md` — Story file.

## Notes

- Canva/Figma pattern: “Brand Kit” or library vs “used in this design”; we implement the “used in this design” list with per-item remove.
- Existing `removeLogo(id)` in the upload zone only applies to entries in `logos` (file uploads); it does not cover logos added from saved. So the new section is the single place to remove any brand logo from the ad.
