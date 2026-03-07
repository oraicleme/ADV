import { describe, it, expect } from 'vitest';
import { formatPrice } from './price-format';

describe('formatPrice', () => {
  it('formats number in en-US with comma thousands and dot decimal', () => {
    expect(formatPrice(1234.56, { locale: 'en-US' })).toBe('1,234.56');
    expect(formatPrice(1234.56, { locale: 'en-US', currency: 'USD' })).toBe('1,234.56 USD');
  });

  it('formats number in sr-RS with dot thousands and comma decimal', () => {
    expect(formatPrice(1234.56, { locale: 'sr-RS' })).toBe('1.234,56');
    expect(formatPrice(1234.56, { locale: 'sr-RS', currency: 'RSD' })).toBe('1.234,56 RSD');
  });

  it('formats number in de-DE (Balkan-style)', () => {
    expect(formatPrice(1399, { locale: 'de-DE', currency: 'EUR' })).toBe('1.399,00 EUR');
  });

  it('returns empty string for null or undefined', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });

  it('accepts string amount (dot decimal)', () => {
    expect(formatPrice('899.50', { locale: 'en-US' })).toBe('899.50');
    expect(formatPrice('899.5', { locale: 'de-DE', currency: 'EUR' })).toBe('899,50 EUR');
  });
});
