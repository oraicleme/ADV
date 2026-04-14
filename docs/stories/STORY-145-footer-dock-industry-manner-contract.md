# STORY-145: Footer Dock — Industry Manner Contract

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** client (export + preview template contract)

## What
Osiguravamo da se **footer uvijek “dockeduje” na dno artboarda** u svim output putanjama koje korisnik doživljava kao jedinstvenu cjelinu:
- Canvas (WYSIWYG)
- Preview / html per page
- Export (HTML i PNG/JPEG)

Dodatno, definira se i testira mali “WYSIWYG ugovor” kroz unit/integration test: HTML export/preview mora pokazivati isti footer contract kroz layout (flex column + margin-top:auto).

## Why
Korisnik traži “industry standard” i očekuje da footer izgleda profesionalno i da ne ostaje veliki prazan prostor do dna (što se trenutno vidi u exported PNG outputu).

## Acceptance Criteria
- [x] **A1** Footer se u HTML outputu (renderAdTemplate) nalazi na “dnu” artboarda: HTML `body` treba biti `display:flex` + `flex-direction:column`, a footer element (`data-footer`) mora imati `margin-top:auto` i `flex-shrink:0`.
- [x] **A2** Preview/export koristi istu HTML generaciju (`renderAdTemplate` → injectFooter) pa se footer contract ne divergirа između preview i exporta.
- [x] **A3** Unit testovi garantuju da A1 vrijedi i sprječavaju regressions.

## Test Plan
- [x] **T1 (unit):** za footer enabled output `renderAdTemplate()` sadrži `flex-direction:column` u `body` i `margin-top:auto` u `data-footer`.
- [x] **T2 (unit):** za multi-page HTML per page, svaki page HTML sadrži `data-footer` s `margin-top:auto`.

## Files Changed
- `client/src/lib/ad-layouts/shared.ts` — `renderDocument()` body artboard flex layout.
- `client/src/lib/ad-templates.ts` — `buildFooterHtml()` footer dock (`margin-top:auto`).
- `client/src/lib/ad-templates.test.ts` — kontrakt testovi za WYSIWYG footer docking.

## Notes
- Canvas već vizualno ponaša footer kao “last element”; ovaj story ga usklađuje s HTML exportom.
- “Industry manner” ovdje mjerimo kao kontrakt: layout contract + WYSIWYG parity kroz isti template generator.

