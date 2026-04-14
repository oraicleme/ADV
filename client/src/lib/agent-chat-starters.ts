/**
 * STORY-189: Retail Promo chat — predefined starter prompts (search vs design vs full ad).
 * Labels are short for chips; `text` is what gets inserted for the model.
 */

export interface RetailPromoChatStarter {
  /** Short chip label (HR/EN mix matches app) */
  label: string;
  /** Full user message inserted into the chat input */
  text: string;
}

export const RETAIL_PROMO_CHAT_STARTERS: RetailPromoChatStarter[] = [
  {
    label: 'Pretraga / postavke',
    text: 'Objasni kako radi pretraga proizvoda i što znače Min-Score klizači u postavkama radnog prostora — bez mijenjanja odabira proizvoda na oglasu i bez JSON-a u odgovoru.',
  },
  {
    label: 'Samo dizajn (naslov/boje)',
    text: 'Napravi samo promjenu naslova i boja pozadine/akcenta (bez mijenjanja odabira proizvoda i bez catalog_filter).',
  },
  {
    label: 'Puna reklama',
    text: 'Napravi kompletnu profesionalnu reklamu za trenutno odabrane proizvode: layout, paleta, naslov, badge i CTA.',
  },
  {
    label: 'Search help (EN)',
    text: 'Explain how product search and Min-Score sliders work in workspace settings — informational only, no catalog changes.',
  },
];
