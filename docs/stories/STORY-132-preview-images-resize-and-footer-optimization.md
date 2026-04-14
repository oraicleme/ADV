# STORY-132: Preview — Resize slika u odnosu na prostor + optimizacija footera

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** client (Retail Promo Designer)

## What

1. **Slike:** Product slike (i placeholderi "No image") trebaju se **resize-ati u odnosu na dostupan prostor** na stranici — visina/širina slike u gridu odgovara formatu (npr. Story 1080×1920), broju proizvoda i broju redova/kolona, tako da ispunjavaju prostor bez praznina ili prevelikih fiksnih kutija.
2. **Footer:** Optimizirati prikaz footera u previewu (i konačnoj reklami) — vizualno uklopiti u reklamu, izbjeći crnu traku ispod canvasa; format label (npr. "Viber / IG Story · 1080 × 1920") ne smije izgledati kao dio reklame nego kao UI natpis; footer reklame (company/contact) ostaje na dnu sadržaja s dobrim kontrastom.

## Why

- Korisnik vidi u previewu fiksne visine slika (npr. 180px ili 80px) koje ne prate prostor — na Story formatu ostaje puno praznog mjesta ili slike izgledaju premalo. Želja: slike prate prostor (responsive).
- Crna traka na dnu (ili label koji izgleda kao footer) zbunjuje — footer treba biti jasno dio reklame (iste boje), a tehnički label (format) treba biti diskretan dio UI-a, ne crna traka.

## Acceptance Criteria

- [x] **P1** Visina slike u product gridu ovisi o dostupnom prostoru: izračun od `format.height` minus header/footer/headline/CTA, podijeljeno s brojem redova, uz min/max (npr. 80–280px) da ne pukne layout.
- [x] **P2** Slike koriste `object-fit: contain` (ili konfigurabilno) i zadržavaju aspect ratio; placeholder "No image" ima isti rezervirani prostor kao slika.
- [x] **P3** Na višestraničnom exportu svaka stranica koristi isti princip (resize u odnosu na prostor te stranice).
- [x] **P4** Footer reklame (company/contact) ostaje na dnu sadržaja, prati boje canvasa/reklame, dobar kontrast teksta; nema crne trake kao dio reklame.
- [x] **P5** Format label ("Viber / IG Story · 1080 × 1920") prikazan je kao diskretan UI element ispod previewa (npr. siv tekst, bez crne pozadine), ne kao dio ad sadržaja.

## Test Plan

- [x] **T1** Unit: formula ili helper za efektivnu visinu slike — za dani `format`, broj redova i (opcionalno) `imageHeight` iz opcija, izračunana visina je unutar [MIN, MAX] i proporcionalna dostupnom prostoru.
- [x] **T2** Unit ili snapshot: renderirani HTML za jednu stranicu sadrži slike/placeholdere s visinom unutar očekivanog raspona (npr. provjera inline style ili class koji odražava izračunatu visinu).
- [x] **T3** Postojeći footer i export testovi i dalje prolaze (data-footer, canvas → preview → export: ad-templates, canvas-multipage-export, footer-config, footer-render).
- [x] **T4** Unit ili komponenta: format label u AgentChat/HtmlPreview nema crnu pozadinu (npr. nema `bg-black` ili ekvivalent); prikazan kao diskretan UI natpis (siv tekst / mala veličina).
- [x] **T5** E2E: preview-export-story132.e2e.test.ts — pipeline bez crne trake (footer = ad bg); visine slika u rasponu; multi-page isto.

## Files Changed

- `client/src/lib/ad-constants.ts` — PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN/MAX (80–280); korišteno u shared.
- `client/src/lib/ad-layouts/shared.ts` — `computeEffectiveImageHeight(format, rowCount, userImageHeight?)`; ESTIMATE_HEADER_FOOTER_PADDING_PX.
- `client/src/lib/ad-layouts/multi-grid.ts` — rowCount + computeEffectiveImageHeight umjesto fiksnog NATIVE_IMAGE_HEIGHT.
- `client/src/lib/ad-layouts/single-hero.ts` — computeEffectiveImageHeight(format, 1, opts?.imageHeight).
- `client/src/lib/ad-layouts/category-group.ts` — rowCount + computeEffectiveImageHeight.
- `client/src/lib/ad-layouts/sale-discount.ts` — rowCount + computeEffectiveImageHeight.
- `client/src/lib/preview-format-label.ts` — novi: PREVIEW_FORMAT_LABEL_CLASS (STORY-132 P5/T4).
- `client/src/lib/preview-format-label.test.ts` — T4: nema bg-black, koristi text-gray.
- `client/src/lib/ad-layouts/shared.test.ts` — T1: computeEffectiveImageHeight unit testovi.
- `client/src/lib/ad-templates.test.ts` — T2: multi-grid 6 proizvoda, visina u [MIN, MAX].
- `client/src/components/AgentChat.tsx` — format label koristi PREVIEW_FORMAT_LABEL_CLASS.
- `client/src/lib/preview-export-story132.e2e.test.ts` — T5 E2E: pipeline (footer = ad bg, image heights in range, multi-page).

## Notes

- **Resize formula:** Npr. `availableHeight = format.height - headerEstimate - footerEstimate - padding; perRow = Math.floor(availableHeight / rowCount); imageHeight = clamp(perRow * 0.6, MIN, MAX)` — udio reda za sliku (0.5–0.7) može se fino podesiti.
- **Footer:** STORY-131 uskladio je footer canvas ↔ preview ↔ export. Ovdje fokus: (1) format label nije na crnoj pozadini i ne izgleda kao dio reklame; (2) eventualno manje vizualne izmjene za footer band (padding, font-size).
- **Backward compatibility:** Ako postoji ručni `imageHeight` u opcijama, koristiti ga kao preferencu uz cap po formatu ili u potpunosti preći na izračun — odluka u implementaciji.
