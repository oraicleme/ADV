# STORY-126: Ad Preview Actions — Copy / Download / Export PNG|JPEG rade industry-standard

**Status:** 🟡 In Progress
**Created:** 2026-03-13
**Package:** client

## What

Dugmad u Ad Preview panelu (**Copy**, **Download**, **Export PNG**, **Export JPEG**) — `AdPreviewActions` u `HtmlPreview.tsx` — trebaju raditi pouzdano i po industry-standardu: jasna povratna informacija, rukovanje greškama, pristupačnost.

Kontekst: DOM put do gumba je `#ad-preview-pane` → donji toolbar s "Actions" → `button[aria-label="Copy HTML"]`, "Download HTML", "Export as PNG", "Export as JPEG". Korisnik prijavljuje da "ne rade in best industry-standard".

## Why

Ako Copy ne kopira, Download ne preuzme, ili Export PNG/JPEG puknu bez poruke, korisnik ne zna je li greška u njega ili u aplikaciju. Industry-standard: (1) sve akcije daju vidljivu povratnu informaciju (success/error), (2) greške se hvataju i prikazuju (toast ili inline), (3) loading stanje tijekom exporta, (4) opcionalno fallback za clipboard kad `navigator.clipboard` nije dostupan.

## Acceptance Criteria

- [ ] **A-1** Copy: klik na "Copy" kopira HTML u clipboard; prikaže "Copied" ili toast. Ako clipboard API ne uspije (npr. insecure context), prikaže jasnu poruku (toast ili inline) i opcionalno fallback (npr. `document.execCommand('copy')` ili "Select and copy" uputa).
- [ ] **A-2** Download: klik na "Download" preuzme `ad-creative.html`; prikaže kratku success poruku (toast) ili ostane bez greške. Ako preuzimanje ne uspije, prikaže poruku.
- [ ] **A-3** Export PNG / Export JPEG: klik pokrene export, prikaže loading ("Exporting…"); na uspjeh — kratka success poruka i stvarno preuzimanje datoteke; na grešku — vidljiva poruka (toast) s razlogom (npr. "Export failed: …") bez ostavljanja dugmeta u "Exporting…".
- [ ] **A-4** Svi gumbi su pristupačni (aria-label, disabled state vidljiv), konzistentni s ostatkom UI-a.

## Test Plan

- [ ] Unit/integration: `AdPreviewActions` ili `HtmlPreview` — handleCopy s mock `navigator.clipboard.writeText` (success i reject) daje odgovarajući state/toast.
- [ ] Unit: handleExport u slučaju greške `exportAdAsImage` — exporting se resetira i korisnik vidi poruku (mock exportAdAsImage da baci).
- [ ] Manual: Copy → provjera u clipboardu; Download → provjera datoteke; Export PNG/JPEG → provjera preuzete slike i poruke pri grešci (npr. isključiti mrežu za fontove ako utječe).

## Files Changed

- `client/src/components/HtmlPreview.tsx` — AdPreviewActions: try/catch oko clipboard i download/export, success/error feedback (toast ili state), opcionalno clipboard fallback.
- (opcionalno) `client/src/components/HtmlPreview.test.tsx` ili dodati u postojeći test — Copy/Export error path.

## Notes

- Koristiti postojeći toast sustav (npr. sonner) ako je u projektu; inače kratki inline message ili `aria-live`.
- `exportAdAsImage` je u `client/src/lib/export-image.ts`; treba osigurati da se greška propagira do UI-a i da se `setExporting(null)` pozove i u catch grani.
