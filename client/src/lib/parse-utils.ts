import type { ProductItem } from './ad-templates';

/**
 * Normalise a price value from Balkan or international format to a
 * machine-friendly decimal string. Handles:
 * - Balkan: `1.234,56` (dot = thousands, comma = decimal)
 * - International: `1,234.56` (comma = thousands, dot = decimal)
 * - Plain numbers: `899`, `49.99`
 * - XLSX numeric cells (JS number)
 * - Strings with embedded currency text: `899 EUR`
 */
export function normalisePrice(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number') {
    return isFinite(raw) ? raw.toString() : undefined;
  }
  const str = String(raw).trim();
  if (!str) return undefined;
  const cleaned = str.replace(/[A-Za-z]/g, '').trim();
  if (!cleaned) return undefined;

  // Balkan: 1.234,56
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    return cleaned.replace(/\./g, '').replace(',', '.');
  }
  // International: 1,234.56
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
    return cleaned.replace(/,/g, '');
  }
  // Fallback: strip non-numeric chars except dot, comma, minus
  const fallback = cleaned.replace(/[^\d.,-]/g, '');
  return fallback || undefined;
}

const CURRENCY_PATTERN = /\b(EUR|USD|BAM|KM|HRK|RSD|DIN|GBP|CHF)\b/i;
const CURRENCY_ALIASES: Record<string, string> = { KM: 'BAM', DIN: 'RSD' };

/** Extract and normalise a currency code from a text string. */
export function extractCurrency(text: string): string | undefined {
  const match = text.match(CURRENCY_PATTERN);
  if (!match) return undefined;
  const raw = match[1].toUpperCase();
  return CURRENCY_ALIASES[raw] ?? raw;
}

/**
 * Remove duplicate products. Keyed by `code` when present, otherwise by `name`.
 * First occurrence wins; later duplicates are dropped.
 */
export function deduplicateProducts(products: ProductItem[]): {
  unique: ProductItem[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const unique: ProductItem[] = [];
  let duplicateCount = 0;

  for (const p of products) {
    const key = (p.code?.trim() || p.name).toLowerCase();
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
      unique.push(p);
    }
  }

  return { unique, duplicateCount };
}

export interface RowWarning {
  row: number;
  message: string;
}

/**
 * Validate a parsed product and return warnings (not errors — the product
 * is still included but the user should know about quality issues).
 */
export function validateProduct(product: ProductItem, rowIndex: number): RowWarning[] {
  const warnings: RowWarning[] = [];
  if (!product.name && !product.code) {
    warnings.push({ row: rowIndex, message: 'Missing both name and code' });
  }
  if (product.price) {
    const num = parseFloat(product.price);
    if (isNaN(num) || num < 0) {
      warnings.push({ row: rowIndex, message: `Suspect price value: "${product.price}"` });
    }
  }
  return warnings;
}

export interface ParseStats {
  totalRows: number;
  parsedCount: number;
  skippedCount: number;
  duplicateCount: number;
  currencyDetected: string | undefined;
  /** True when at least one product has a non-empty code. Used to warn when image enrichment won't work. */
  hasProductCodes: boolean;
  /** True when at least one product has a discountPercent value. */
  hasDiscounts: boolean;
  warnings: RowWarning[];
}

export interface ParseResult {
  products: ProductItem[];
  errors: string[];
  stats: ParseStats;
}

export function emptyStats(): ParseStats {
  return {
    totalRows: 0,
    parsedCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    currencyDetected: undefined,
    hasProductCodes: false,
    hasDiscounts: false,
    warnings: [],
  };
}

/** Human-readable parse summary, e.g. "Loaded 45 products (3 duplicates removed, 2 rows skipped)" */
export function formatParseSummary(stats: ParseStats): string {
  const parts: string[] = [];
  if (stats.duplicateCount > 0) {
    parts.push(`${stats.duplicateCount} duplicate${stats.duplicateCount !== 1 ? 's' : ''} removed`);
  }
  if (stats.skippedCount > 0) {
    parts.push(`${stats.skippedCount} row${stats.skippedCount !== 1 ? 's' : ''} skipped`);
  }
  if (stats.currencyDetected) {
    parts.push(`currency: ${stats.currencyDetected}`);
  }
  const detail = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `Loaded ${stats.parsedCount} product${stats.parsedCount !== 1 ? 's' : ''}${detail}`;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function checkFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${sizeMB} MB). Maximum allowed size is 5 MB.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
