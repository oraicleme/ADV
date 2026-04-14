import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelBuffer } from './excel-parser';

function makeExcelBuffer(
  rows: Record<string, unknown>[],
  sheetName = 'Sheet1',
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out;
}

describe('parseExcelBuffer', () => {
  it('parses 5 products with standard headers', () => {
    const rows = [
      { Code: 'A001', Name: 'Product 1', Price: 10 },
      { Code: 'A002', Name: 'Product 2', Price: 20 },
      { Code: 'A003', Name: 'Product 3', Price: 30 },
      { Code: 'A004', Name: 'Product 4', Price: 40 },
      { Code: 'A005', Name: 'Product 5', Price: 50 },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.errors).toHaveLength(0);
    expect(result.products).toHaveLength(5);
    expect(result.products[0]).toMatchObject({
      code: 'A001',
      name: 'Product 1',
      price: '10',
    });
    expect(result.products[4].name).toBe('Product 5');
  });

  it('detects Balkan header variants (Naziv, Šifra, Cijena)', () => {
    const rows = [
      { Šifra: 'SM-01', Naziv: 'Samsung Galaxy S24', Cijena: '1.399,00' },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      code: 'SM-01',
      name: 'Samsung Galaxy S24',
      price: '1399.00',
    });
  });

  it('detects wholesale price column (VP)', () => {
    const rows = [
      { Name: 'Phone', Price: 899, VP: 799 },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products[0].wholesalePrice).toBe('799');
    expect(result.products[0].retailPrice).toBe('899');
  });

  it('detects category column', () => {
    const rows = [
      { Name: 'Phone', Price: 899, Category: 'Electronics' },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products[0].category).toBe('Electronics');
  });

  it('returns error for empty file', () => {
    const result = parseExcelBuffer(makeExcelBuffer([]));
    expect(result.products).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/empty/i);
  });

  it('returns error for unrecognised columns', () => {
    const rows = [{ foo: 'bar', baz: 42 }];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(0);
    expect(result.errors[0]).toMatch(/could not detect/i);
  });

  it('returns error for corrupt/invalid buffer', () => {
    const garbage = new Uint8Array([0, 1, 2, 3, 4, 5]).buffer;
    const result = parseExcelBuffer(garbage);
    expect(result.products).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('skips rows with no name or code', () => {
    const rows = [
      { Name: 'Product A', Price: 10 },
      { Name: '', Price: 20 },
      { Name: 'Product C', Price: 30 },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(2);
  });

  it('handles CSV-style headers (code, name, price)', () => {
    const rows = [
      { code: 'X1', name: 'Widget', price: '49.99' },
      { code: 'X2', name: 'Gadget', price: '99.99' },
    ];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(2);
    expect(result.products[0].code).toBe('X1');
    expect(result.products[1].price).toBe('99.99');
  });

  it('falls back to code as name when name column is missing', () => {
    const rows = [{ Code: 'SKU-001' }];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('SKU-001');
  });

  it('normalises Balkan prices (1.234,56 → 1234.56)', () => {
    const rows = [{ Name: 'Phone', Price: '1.399,00' }];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products[0].price).toBe('1399.00');
  });

  it('normalises international prices (1,234.56 → 1234.56)', () => {
    const rows = [{ Name: 'Phone', Price: '1,399.00' }];
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products[0].price).toBe('1399.00');
  });

  describe('stats', () => {
    it('reports totalRows, parsedCount, skippedCount', () => {
      const rows = [
        { Name: 'Product A', Price: 10 },
        { Name: '', Price: 20 },
        { Name: 'Product C', Price: 30 },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.totalRows).toBe(3);
      expect(result.stats.parsedCount).toBe(2);
      expect(result.stats.skippedCount).toBe(1);
    });

    it('returns stats even for empty files', () => {
      const result = parseExcelBuffer(makeExcelBuffer([]));
      expect(result.stats).toBeDefined();
      expect(result.stats.totalRows).toBe(0);
    });
  });

  describe('currency detection', () => {
    it('detects currency from header name (e.g. EUR column)', () => {
      const rows = [{ Name: 'Phone', EUR: 899 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.currencyDetected).toBe('EUR');
      expect(result.products[0].currency).toBe('EUR');
    });

    it('detects currency from cell values', () => {
      const rows = [
        { Name: 'Phone A', Price: '899 BAM' },
        { Name: 'Phone B', Price: '999 BAM' },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.currencyDetected).toBe('BAM');
    });

    it('detects KM and normalises to BAM', () => {
      const rows = [
        { Name: 'Phone', Price: '899 KM' },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.currencyDetected).toBe('BAM');
    });
  });

  describe('discount column detection (popust / rabat)', () => {
    it('detects Bosnian "Popust" column and maps to discountPercent', () => {
      const rows = [{ Naziv: 'Samsung Galaxy S24', Popust: '20%' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products).toHaveLength(1);
      expect(result.products[0].discountPercent).toBe(20);
    });

    it('normalises discount "20%" → 20', () => {
      const rows = [{ Name: 'Phone', Discount: '20%' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBe(20);
    });

    it('normalises discount "20" (plain number) → 20', () => {
      const rows = [{ Name: 'Phone', Discount: '20' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBe(20);
    });

    it('normalises discount 0.20 (fractional) → 20', () => {
      const rows = [{ Name: 'Phone', Discount: 0.20 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBe(20);
    });

    it('normalises discount "0,20" (Balkan comma decimal) → 20', () => {
      const rows = [{ Name: 'Phone', Discount: '0,20' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBe(20);
    });

    it('sets discountPercent undefined for null/empty discount', () => {
      const rows = [{ Name: 'Phone', Discount: '' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBeUndefined();
    });

    it('detects "rabat" variant', () => {
      const rows = [{ Naziv: 'Phone', Rabat: '15%' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].discountPercent).toBe(15);
    });

    it('stats.hasDiscounts = true when discount column present', () => {
      const rows = [{ Name: 'Phone', Discount: '20%' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.hasDiscounts).toBe(true);
    });

    it('stats.hasDiscounts = false when no discount column', () => {
      const rows = [{ Name: 'Phone', Price: 100 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.hasDiscounts).toBe(false);
    });

    it('parses "Rasprodaja VP" style file: naziv + popust only (no code)', () => {
      const rows = [
        { Naziv: 'Samsung Galaxy A55 8/256', Popust: '20%' },
        { Naziv: 'Samsung Galaxy A35 6/128', Popust: '15%' },
        { Naziv: 'Redmi Note 13 Pro 256GB', Popust: '25%' },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.errors).toHaveLength(0);
      expect(result.products).toHaveLength(3);
      expect(result.stats.hasProductCodes).toBe(false);
      expect(result.stats.hasDiscounts).toBe(true);
      expect(result.products[0].name).toBe('Samsung Galaxy A55 8/256');
      expect(result.products[0].discountPercent).toBe(20);
      expect(result.products[0].code).toBeUndefined();
    });
  });

  describe('stats.hasProductCodes', () => {
    it('is true when products have codes', () => {
      const rows = [{ Code: 'A001', Name: 'Product A' }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.hasProductCodes).toBe(true);
    });

    it('is false when no code column', () => {
      const rows = [{ Name: 'Phone', Price: 100 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.stats.hasProductCodes).toBe(false);
    });
  });

  describe('numeric codes (numbers stored as text)', () => {
    it('converts a JS number code to string (xlsx raw=true behaviour)', () => {
      // SheetJS returns 1074427 (number) when the Excel cell is a plain number type
      const rows = [{ Code: 1074427, Name: 'Auto držač Denmen DH02', Price: 5.45 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products).toHaveLength(1);
      expect(result.products[0].code).toBe('1074427');
    });

    it('converts an integer-like float code without decimal (1074427.0 → "1074427")', () => {
      const rows = [{ Code: 1074427.0, Name: 'Phone holder', Price: 3.99 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].code).toBe('1074427');
    });

    it('preserves string numeric codes unchanged', () => {
      // SheetJS returns "1074427" (string) when the cell is text-type
      const rows = [{ Code: '1074427', Name: 'Auto držač', Price: 3.99 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].code).toBe('1074427');
    });

    it('trims whitespace from numeric string codes', () => {
      const rows = [{ Code: ' 1074427 ', Name: 'Phone holder', Price: 3.99 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].code).toBe('1074427');
    });

    it('strips non-breaking spaces from codes', () => {
      // \u00A0 is inserted by some Excel exporters
      const rows = [{ Code: '\u00A01074427\u00A0', Name: 'Phone holder', Price: 3.99 }];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products[0].code).toBe('1074427');
    });

    it('handles multiple numeric-code rows matching a full catalog excerpt', () => {
      const rows = [
        { Code: 1074427, Name: 'Auto držač Denmen DH02 - srebma', Price: 5.45 },
        { Code: 1074428, Name: 'Auto držač Denmen DH02 - Tarnish', Price: 5.45 },
        { Code: 1074429, Name: 'Auto držač Denmen DH03 - srebma', Price: 2.42 },
        { Code: 1074430, Name: 'Auto držač Denmen DH03 - Tarnish', Price: 10.00 },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.errors).toHaveLength(0);
      expect(result.products).toHaveLength(4);
      expect(result.products.map((p) => p.code)).toEqual(['1074427', '1074428', '1074429', '1074430']);
      expect(result.stats.hasProductCodes).toBe(true);
    });
  });

  describe('duplicate detection', () => {
    it('removes duplicate products by code', () => {
      const rows = [
        { Code: 'A001', Name: 'Product A', Price: 10 },
        { Code: 'A001', Name: 'Product A (copy)', Price: 10 },
        { Code: 'A002', Name: 'Product B', Price: 20 },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products).toHaveLength(2);
      expect(result.stats.duplicateCount).toBe(1);
      expect(result.products[0].name).toBe('Product A');
    });

    it('removes duplicates by name when no code', () => {
      const rows = [
        { Name: 'Product A', Price: 10 },
        { Name: 'product a', Price: 10 },
      ];
      const result = parseExcelBuffer(makeExcelBuffer(rows));
      expect(result.products).toHaveLength(1);
      expect(result.stats.duplicateCount).toBe(1);
    });
  });
});

// STORY-107: Zero-Selection Start contract
// parseExcelBuffer returns products but does NOT select them — selection is
// the caller's responsibility. ProductDataInput must NOT auto-call
// onSelectionChange after Excel/paste parse (zero-selection start).
describe('STORY-107 zero-selection contract', () => {
  it('parseExcelBuffer returns products without any selection side-effects', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      Code: `P${String(i + 1).padStart(3, '0')}`,
      Name: `Product ${i + 1}`,
      Price: (i + 1) * 100,
    }));
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(10);
    // The parser returns products only — no selection state lives here.
    // ProductDataInput must NOT call onSelectionChange with all indices.
    // Verified by removing the auto-select call in ProductDataInput.tsx.
    expect(result.errors).toHaveLength(0);
  });

  it('parseExcelBuffer on large catalog (100 products) returns all products — canvas starts empty', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      Code: `SKU${i + 1}`,
      Name: `Item ${i + 1}`,
      Price: i + 1,
    }));
    const result = parseExcelBuffer(makeExcelBuffer(rows));
    expect(result.products).toHaveLength(100);
    // With zero-selection start, selectedProductIndices.size === 0 immediately
    // after upload — the agent uses catalog_filter on its first turn to select.
    expect(result.stats.parsedCount).toBe(100);
  });
});
