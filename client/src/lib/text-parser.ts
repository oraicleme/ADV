import type { ProductItem } from './ad-templates';
import {
  normalisePrice as normalisePriceShared,
  extractCurrency,
  deduplicateProducts,
  validateProduct,
  emptyStats,
  type ParseResult,
} from './parse-utils';

export type { ParseResult };

/**
 * Text-parser normalisePrice wrapper: accepts string-only input and always
 * returns a string (empty string on failure) so existing line parsers keep
 * working without null checks.
 */
function normalisePrice(raw: string): string {
  return normalisePriceShared(raw) ?? '';
}

function splitTsvRow(line: string): string[] {
  return line.split('\t').map((c) => c.trim());
}

function splitCsvRow(line: string): string[] {
  return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) =>
    c.trim().replace(/^"|"$/g, ''),
  );
}

function looksLikePrice(val: string): boolean {
  return /^\d[\d.,]*\d?$/.test(val.trim()) || /^\d+$/.test(val.trim());
}

function parseStructuredLines(lines: string[]): ProductItem[] {
  const items: ProductItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.includes('\t')) {
      const cols = splitTsvRow(trimmed);
      if (cols.length >= 3) {
        const currency = extractCurrency(cols.slice(2).join(' '));
        items.push({
          code: cols[0],
          name: cols[1],
          price: normalisePrice(cols[2]),
          currency,
        });
        continue;
      }
      if (cols.length === 2) {
        if (looksLikePrice(cols[1])) {
          items.push({ name: cols[0], price: normalisePrice(cols[1]) });
        } else {
          items.push({ code: cols[0], name: cols[1] });
        }
        continue;
      }
    }

    const commaCount = (trimmed.match(/,/g) || []).length;
    if (commaCount >= 2) {
      const cols = splitCsvRow(trimmed);
      if (cols.length >= 3 && looksLikePrice(cols[cols.length - 1])) {
        const priceCol = cols.pop()!;
        const code = cols.length > 1 ? cols[0] : undefined;
        const name = cols.length > 1 ? cols.slice(1).join(', ') : cols[0];
        const currency = extractCurrency(trimmed);
        items.push({
          code,
          name,
          price: normalisePrice(priceCol),
          currency,
        });
        continue;
      }
    }

    const dashMatch = trimmed.match(
      /^(.+?)\s*[-–—]\s*(\d[\d.,]*)\s*(.*)$/,
    );
    if (dashMatch) {
      const currency = extractCurrency(dashMatch[3]) ?? extractCurrency(trimmed);
      items.push({
        name: dashMatch[1].trim(),
        price: normalisePrice(dashMatch[2]),
        currency,
      });
      continue;
    }

    const endPriceMatch = trimmed.match(
      /^(.+?)\s+(\d[\d.,]+)\s*(EUR|USD|BAM|KM|HRK|RSD|DIN|GBP|CHF)?\s*$/i,
    );
    if (endPriceMatch) {
      const currency = extractCurrency(trimmed);
      items.push({
        name: endPriceMatch[1].trim(),
        price: normalisePrice(endPriceMatch[2]),
        currency,
      });
      continue;
    }

    items.push({ name: trimmed });
  }

  return items;
}

/**
 * Parse pasted text into a ParseResult.
 * Handles tab-separated, comma-separated, dash-separated, and freeform text.
 */
export function parseText(text: string): ParseResult {
  const stats = emptyStats();

  if (!text || !text.trim()) {
    return { products: [], errors: [], stats };
  }

  const lines = text.split('\n');
  stats.totalRows = lines.filter((l) => l.trim().length > 0).length;

  const rawProducts = parseStructuredLines(lines);

  // Detect dominant currency across all parsed products
  const currencies = rawProducts
    .map((p) => p.currency)
    .filter((c): c is string => !!c);
  if (currencies.length > 0) {
    const freq = new Map<string, number>();
    for (const c of currencies) freq.set(c, (freq.get(c) ?? 0) + 1);
    const entries: Array<[string, number]> = Array.from(freq.entries());
    stats.currencyDetected = entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // Validate
  for (let i = 0; i < rawProducts.length; i++) {
    stats.warnings.push(...validateProduct(rawProducts[i], i + 1));
  }

  const { unique, duplicateCount } = deduplicateProducts(rawProducts);
  stats.duplicateCount = duplicateCount;
  stats.parsedCount = unique.length;
  stats.skippedCount = stats.totalRows - rawProducts.length;

  return { products: unique, errors: [], stats };
}
