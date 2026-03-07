/**
 * Locale-aware number/price formatting for the Retail Promo Designer.
 * Respects user or tenant locale (e.g. 1.234,56 vs 1,234.56; RSD/EUR/USD).
 */

export interface PriceFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a price string or number for display in the given locale.
 * e.g. en-US: "1,234.56 USD", sr-RS/de-DE: "1.234,56 RSD"
 */
export function formatPrice(
  amount: number | string | undefined | null,
  options: PriceFormatOptions = {},
): string {
  if (amount == null || amount === '') return '';
  const { locale = 'en-US', currency, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  let num: number;
  if (typeof amount === 'number') {
    num = Number.isFinite(amount) ? amount : 0;
  } else {
    let s = String(amount).trim().replace(/\s/g, '');
    // Balkan-style input: 1.234,56 → treat as decimal
    if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    }
    num = parseFloat(s) || 0;
  }
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
  return currency ? `${formatted} ${currency}` : formatted;
}
