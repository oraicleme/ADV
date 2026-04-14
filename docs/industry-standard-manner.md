# Industry Standard Manner — Oraicle Ads

Ovaj dokument definiše šta “industry manner / best solution” znači za Oraicle reklame kroz dvije vrste ugovora:

1. **WYSIWYG ugovor**: Canvas (Edit) = Preview = Export.
2. **Kompozicioni ugovor (Canva-like)**: hijerarhija, razmaci i “safe-zone” ponašanje tako da footer i ključni elementi izgledaju profesionalno i dosljedno.

## 1) WYSIWYG ugovor (Canvas ↔ Preview ↔ Export)

Za svaki page/format, Oraicle koristi isti generator HTML-a kao “single source of truth”:

- Canvas koristi isti koncept element reda (headline → products → badge → cta → disclaimer → footer).
- Preview koristi `previewHtmlToShow` (za multi-page: `htmlPerPage[currentPageIndex]`).
- Export radi kroz `renderAdTemplate(...)` (HTML) i potom `html2canvas(...)` (PNG/JPEG).

**Contract test** (Story 145) garantuje footer “docking” kroz isti template pipeline.

## 2) Kompozicioni ugovor (Canva-like)

### 2.1 Footer “docked to bottom”

Footer mora biti “dockan” na dnu artboarda kako se ne bi stvarao veliki prazan prostor ispod proizvoda.

Implementirano kroz:

- HTML generator: `client/src/lib/ad-layouts/shared.ts` (`renderDocument()` dodaje `display:flex` + `flex-direction:column`)
- HTML generator: `client/src/lib/ad-templates.ts` (`buildFooterHtml()` footer dobija `margin-top:auto` + `flex-shrink:0`)
- Testovi: `client/src/lib/ad-templates.test.ts` (Story 145)

### 2.2 Hijerarhija elemenata

Hijerarhija se postiže kombinacijom:

- dosljednog element reda (`DEFAULT_ELEMENT_ORDER` + `renderOrderedElements`)
- striktnih font/spacing ograničenja (npr. headline font range, CTA/badge size tokeni u `client/src/lib/ad-constants.ts`)
- kontrasta teksta nad pozadinom (adaptive luminance logika)

### 2.3 “Safe zone” / razmak za završne UI elemente

Za vertikalne formate, industry praksa je da se sadržaj drži u “safe zone” tako da ključni elementi ne završe preblizu rubova.

U Oraicle baseline-u to se izražava kroz:

- `computeEffectiveImageHeight(...)` koja računa produktne image visine na osnovu procjene header/footer prostora (`ESTIMATE_HEADER_FOOTER_PADDING_PX`)
- footer kao “last element” u Canvas-u i “docked” elementu u HTML-u

Ovo je trenutno **baseline**; naredne iteracije mogu uvesti eksplicitne safe-zone okvire po formatu (npr. pixel padding ili %), te dodatne kontrast/spacing kontrakt testove.

### STORY-205 — eksplicitni vertikalni “chrome” rezerv

- Konstanta **`INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX`** u `client/src/lib/ad-constants.ts` (300) — procjena header + footer + padding prije dodjele visine redovima u `computeEffectiveImageHeight` (`ad-layouts/shared.ts`).
- Testovi u `shared.test.ts` vezuju visinu slike za gornju granicu nakon oduzimanja rezerve.
- Footer **dock**: `ad-templates.test.ts` provjerava `margin-top:auto` na `data-footer` traci.

## Šta je “done” u ovoj iteraciji

- Footer docking contract je implementiran i testiran (Story 145).
- WYSIWYG princip se održava kroz isti `renderAdTemplate` pipeline za Preview i Export.
- **STORY-205:** imenovani vertikalni rezerv + contract testovi (chrome reserve, footer `margin-top:auto`).

## Naredni koraci (roadmap)

- Po formatu: eksplicitni **safe-zone** inset u px ili % (sada je rezerv samo jedan broj za cijeli artboard).
- Dodatni contract testovi za **minimalan razmak** ispod product grida, udaljenost footera od dna, i CTA kao konverzijsku točku (vizualni/regresijski kad bude alat).

