import { describe, it, expect } from 'vitest';
import { parseText } from './text-parser';

describe('parseText', () => {
  it('returns empty result for empty string', () => {
    const result = parseText('');
    expect(result.products).toEqual([]);
    expect(result.stats.parsedCount).toBe(0);
  });

  it('returns empty result for whitespace only', () => {
    const result = parseText('   \n  \n  ');
    expect(result.products).toEqual([]);
  });

  describe('tab-separated', () => {
    it('parses 3-column TSV (code, name, price)', () => {
      const input = 'ABC123\tSamsung Galaxy S24\t899.00';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toMatchObject({
        code: 'ABC123',
        name: 'Samsung Galaxy S24',
        price: '899.00',
      });
    });

    it('parses multiple TSV lines', () => {
      const input = [
        'ABC123\tSamsung Galaxy S24\t899',
        'DEF456\tApple iPhone 16\t1199',
      ].join('\n');
      const result = parseText(input);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].code).toBe('ABC123');
      expect(result.products[1].code).toBe('DEF456');
    });

    it('handles TSV with currency in price column', () => {
      const input = 'SM-S928B\tSamsung Galaxy S24 Ultra\t1399 EUR';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].currency).toBe('EUR');
    });

    it('handles 2-column TSV (name, price)', () => {
      const input = 'Samsung Galaxy S24\t899';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Samsung Galaxy S24');
      expect(result.products[0].price).toBe('899');
    });
  });

  describe('comma-separated', () => {
    it('parses CSV-style: code, name, price', () => {
      const input = 'ABC123, Samsung Galaxy S24, 899.00';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toMatchObject({
        code: 'ABC123',
        name: 'Samsung Galaxy S24',
        price: '899.00',
      });
    });

    it('parses multiple CSV lines', () => {
      const input = [
        'ABC123, Samsung Galaxy S24, 899',
        'DEF456, Apple iPhone 16, 1199',
        'GHI789, Xiaomi 14, 599',
      ].join('\n');
      const result = parseText(input);
      expect(result.products).toHaveLength(3);
    });
  });

  describe('dash-separated', () => {
    it('parses "Name - price EUR" format', () => {
      const input = 'Samsung Galaxy S24 - 899 EUR';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toMatchObject({
        name: 'Samsung Galaxy S24',
        price: '899',
        currency: 'EUR',
      });
    });

    it('handles em-dash separator', () => {
      const input = 'Samsung Galaxy S24 — 899 EUR';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Samsung Galaxy S24');
    });

    it('handles en-dash separator', () => {
      const input = 'Samsung Galaxy S24 – 1.399,00 BAM';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe('1399.00');
      expect(result.products[0].currency).toBe('BAM');
    });
  });

  describe('Balkan number formatting', () => {
    it('normalises 1.234,56 (Balkan) to 1234.56', () => {
      const input = 'Phone\t1.399,00';
      const result = parseText(input);
      expect(result.products[0].price).toBe('1399.00');
    });

    it('normalises 1,234.56 (international) to 1234.56', () => {
      const input = 'Phone\t1,399.00';
      const result = parseText(input);
      expect(result.products[0].price).toBe('1399.00');
    });
  });

  describe('currency detection', () => {
    it('detects EUR', () => {
      const input = 'Phone - 899 EUR';
      expect(parseText(input).products[0].currency).toBe('EUR');
    });

    it('detects BAM', () => {
      const input = 'Phone - 1799 BAM';
      expect(parseText(input).products[0].currency).toBe('BAM');
    });

    it('normalises KM to BAM', () => {
      const input = 'Phone - 1799 KM';
      expect(parseText(input).products[0].currency).toBe('BAM');
    });

    it('normalises DIN to RSD', () => {
      const input = 'Phone - 50000 DIN';
      expect(parseText(input).products[0].currency).toBe('RSD');
    });
  });

  describe('freeform / line-per-item', () => {
    it('parses "name price currency" at end of line', () => {
      const input = 'Samsung telefon 899 EUR';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Samsung telefon');
      expect(result.products[0].price).toBe('899');
      expect(result.products[0].currency).toBe('EUR');
    });

    it('treats plain text as product name', () => {
      const input = 'Samsung Galaxy S24';
      const result = parseText(input);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Samsung Galaxy S24');
      expect(result.products[0].price).toBeUndefined();
    });
  });

  describe('mixed formats', () => {
    it('skips blank lines', () => {
      const input = 'Phone A\t899\n\nPhone B\t999\n  \nPhone C\t1099';
      const result = parseText(input);
      expect(result.products).toHaveLength(3);
    });
  });

  describe('stats and deduplication', () => {
    it('reports stats correctly', () => {
      const input = [
        'ABC123\tPhone A\t899',
        'DEF456\tPhone B\t999',
      ].join('\n');
      const result = parseText(input);
      expect(result.stats.totalRows).toBe(2);
      expect(result.stats.parsedCount).toBe(2);
      expect(result.stats.duplicateCount).toBe(0);
    });

    it('detects and removes duplicates by code', () => {
      const input = [
        'ABC123\tPhone A\t899',
        'ABC123\tPhone A (copy)\t999',
        'DEF456\tPhone B\t999',
      ].join('\n');
      const result = parseText(input);
      expect(result.products).toHaveLength(2);
      expect(result.stats.duplicateCount).toBe(1);
      expect(result.products[0].name).toBe('Phone A');
    });

    it('detects dominant currency in stats', () => {
      const input = [
        'Phone A - 899 EUR',
        'Phone B - 999 EUR',
        'Phone C - 500 BAM',
      ].join('\n');
      const result = parseText(input);
      expect(result.stats.currencyDetected).toBe('EUR');
    });
  });
});
