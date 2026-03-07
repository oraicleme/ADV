import { describe, it, expect } from 'vitest';
import {
  normalisePrice,
  extractCurrency,
  deduplicateProducts,
  validateProduct,
  formatParseSummary,
  checkFileSize,
  formatFileSize,
  emptyStats,
} from './parse-utils';
import type { ProductItem } from './ad-templates';

describe('normalisePrice', () => {
  it('returns undefined for null/undefined', () => {
    expect(normalisePrice(null)).toBeUndefined();
    expect(normalisePrice(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalisePrice('')).toBeUndefined();
    expect(normalisePrice('   ')).toBeUndefined();
  });

  it('handles Balkan format: 1.234,56 → 1234.56', () => {
    expect(normalisePrice('1.399,00')).toBe('1399.00');
    expect(normalisePrice('12.345,67')).toBe('12345.67');
  });

  it('handles international format: 1,234.56 → 1234.56', () => {
    expect(normalisePrice('1,399.00')).toBe('1399.00');
    expect(normalisePrice('12,345.67')).toBe('12345.67');
  });

  it('handles plain numbers', () => {
    expect(normalisePrice('899')).toBe('899');
    expect(normalisePrice('49.99')).toBe('49.99');
  });

  it('handles JS numbers (from XLSX)', () => {
    expect(normalisePrice(899)).toBe('899');
    expect(normalisePrice(49.99)).toBe('49.99');
  });

  it('strips currency text: 899 EUR → 899', () => {
    expect(normalisePrice('899 EUR')).toBe('899');
    expect(normalisePrice('1.399,00 BAM')).toBe('1399.00');
  });

  it('returns undefined for NaN/Infinity', () => {
    expect(normalisePrice(NaN)).toBeUndefined();
    expect(normalisePrice(Infinity)).toBeUndefined();
  });

  it('returns undefined for all-text input', () => {
    expect(normalisePrice('abc')).toBeUndefined();
  });
});

describe('extractCurrency', () => {
  it('detects EUR', () => {
    expect(extractCurrency('899 EUR')).toBe('EUR');
  });

  it('detects BAM', () => {
    expect(extractCurrency('1799 BAM')).toBe('BAM');
  });

  it('normalises KM → BAM', () => {
    expect(extractCurrency('1799 KM')).toBe('BAM');
  });

  it('normalises DIN → RSD', () => {
    expect(extractCurrency('50000 DIN')).toBe('RSD');
  });

  it('returns undefined when no currency found', () => {
    expect(extractCurrency('899')).toBeUndefined();
    expect(extractCurrency('hello world')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(extractCurrency('899 eur')).toBe('EUR');
  });
});

describe('deduplicateProducts', () => {
  it('returns all products when no duplicates', () => {
    const products: ProductItem[] = [
      { name: 'A', code: 'A1' },
      { name: 'B', code: 'B2' },
    ];
    const result = deduplicateProducts(products);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(0);
  });

  it('removes duplicates by code (case-insensitive)', () => {
    const products: ProductItem[] = [
      { name: 'Phone A', code: 'SM-001' },
      { name: 'Phone A copy', code: 'sm-001' },
      { name: 'Phone B', code: 'SM-002' },
    ];
    const result = deduplicateProducts(products);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.unique[0].name).toBe('Phone A');
  });

  it('deduplicates by name when no code', () => {
    const products: ProductItem[] = [
      { name: 'Samsung Galaxy S24' },
      { name: 'samsung galaxy s24' },
    ];
    const result = deduplicateProducts(products);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });

  it('keeps first occurrence', () => {
    const products: ProductItem[] = [
      { name: 'Phone', code: 'X', price: '100' },
      { name: 'Phone v2', code: 'X', price: '200' },
    ];
    const result = deduplicateProducts(products);
    expect(result.unique[0].price).toBe('100');
  });
});

describe('validateProduct', () => {
  it('returns no warnings for valid product', () => {
    expect(validateProduct({ name: 'Phone', price: '899' }, 0)).toHaveLength(0);
  });

  it('warns on missing name and code', () => {
    const warnings = validateProduct({ name: '' }, 5);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].row).toBe(5);
    expect(warnings[0].message).toMatch(/missing/i);
  });

  it('warns on suspect price (negative)', () => {
    const warnings = validateProduct({ name: 'Phone', price: '-50' }, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/suspect price/i);
  });

  it('warns on suspect price (NaN)', () => {
    const warnings = validateProduct({ name: 'Phone', price: 'abc' }, 0);
    expect(warnings).toHaveLength(1);
  });
});

describe('formatParseSummary', () => {
  it('basic summary with no issues', () => {
    expect(formatParseSummary({ ...emptyStats(), parsedCount: 10 })).toBe('Loaded 10 products');
  });

  it('summary with duplicates and skipped rows', () => {
    const summary = formatParseSummary({
      ...emptyStats(),
      parsedCount: 45,
      duplicateCount: 3,
      skippedCount: 2,
    });
    expect(summary).toBe('Loaded 45 products (3 duplicates removed, 2 rows skipped)');
  });

  it('summary with currency', () => {
    const summary = formatParseSummary({
      ...emptyStats(),
      parsedCount: 5,
      currencyDetected: 'EUR',
    });
    expect(summary).toBe('Loaded 5 products (currency: EUR)');
  });

  it('singular product', () => {
    expect(formatParseSummary({ ...emptyStats(), parsedCount: 1 })).toBe('Loaded 1 product');
  });
});

describe('checkFileSize', () => {
  it('returns null for small file', () => {
    const file = new File(['x'], 'test.xlsx', { type: 'application/octet-stream' });
    expect(checkFileSize(file)).toBeNull();
  });

  it('returns error for oversized file', () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], 'big.xlsx');
    const result = checkFileSize(file);
    expect(result).toMatch(/too large/i);
    expect(result).toContain('5 MB');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
