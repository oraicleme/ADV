import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  searchProducts,
  extractProductVariants,
  filterProductsIntelligent,
  suggestProductCorrections,
} from './product-search';
import type { ProductItem } from './ad-templates';

const mockProducts: ProductItem[] = [
  { name: 'iPhone 15', code: 'IP15', price: 799, category: 'Phones' },
  { name: 'iPhone 15 Pro', code: 'IP15P', price: 999, category: 'Phones' },
  { name: 'iPhone 15 Pro Max', code: 'IP15PM', price: 1199, category: 'Phones' },
  { name: 'iPhone 15 Plus', code: 'IP15PL', price: 899, category: 'Phones' },
  { name: 'Samsung Galaxy S24', code: 'SGS24', price: 899, category: 'Phones' },
  { name: 'Samsung Galaxy S24 Ultra', code: 'SGS24U', price: 1299, category: 'Phones' },
];

describe('product-search', () => {
  describe('calculateSimilarity', () => {
    it('returns 1 for exact matches', () => {
      expect(calculateSimilarity('iPhone 15 Pro', 'iPhone 15 Pro')).toBe(1);
    });

    it('returns high score for substring matches', () => {
      const score = calculateSimilarity('iPhone 15', 'iPhone 15 Pro');
      expect(score).toBeGreaterThan(0.8);
    });

    it('handles case-insensitive matching', () => {
      const score = calculateSimilarity('iphone', 'iPhone');
      expect(score).toBeGreaterThan(0.9);
    });

    it('returns low score for unrelated strings', () => {
      const score = calculateSimilarity('iPhone', 'Samsung');
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('searchProducts', () => {
    it('finds products by exact name', () => {
      const results = searchProducts(mockProducts, 'iPhone 15 Pro');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toContain('iPhone 15 Pro');
    });

    it('finds products by code', () => {
      const results = searchProducts(mockProducts, 'IP15P');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.code).toBe('IP15P');
    });

    it('respects minSimilarity threshold', () => {
      const results = searchProducts(mockProducts, 'iPhone', { minSimilarity: 0.7 });
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(0.7));
    });

    it('respects maxResults limit', () => {
      const results = searchProducts(mockProducts, 'iPhone', { maxResults: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('extractProductVariants', () => {
    it('extracts variants from product name', () => {
      const variants = extractProductVariants('iPhone 15 Pro Max');
      expect(variants).toEqual(['iphone', '15', 'pro', 'max']);
    });

    it('handles different separators', () => {
      const variants = extractProductVariants('Samsung-Galaxy-S24-Ultra');
      expect(variants).toContain('samsung');
      expect(variants).toContain('galaxy');
    });
  });

  describe('filterProductsIntelligent', () => {
    it('returns all products when query is empty', () => {
      const indices = filterProductsIntelligent(mockProducts, '');
      expect(indices.length).toBe(mockProducts.length);
    });

    it('filters products with fuzzy matching', () => {
      const indices = filterProductsIntelligent(mockProducts, 'iPhone 15 Pro', {
        fuzzyMatch: true,
      });
      expect(indices.length).toBeGreaterThan(0);
      indices.forEach((i) => {
        expect(mockProducts[i].name).toContain('iPhone 15');
      });
    });

    it('filters products with standard substring matching', () => {
      const indices = filterProductsIntelligent(mockProducts, 'Pro', {
        fuzzyMatch: false,
      });
      expect(indices.length).toBeGreaterThan(0);
      indices.forEach((i) => {
        expect(mockProducts[i].name).toContain('Pro');
      });
    });
  });

  describe('suggestProductCorrections', () => {
    it('suggests corrections for typos', () => {
      const suggestions = suggestProductCorrections('iphone 15 pro', mockProducts);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].suggestion).toContain('iPhone');
    });

    it('respects limit parameter', () => {
      const suggestions = suggestProductCorrections('iPhone', mockProducts, 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('returns empty array for empty query', () => {
      const suggestions = suggestProductCorrections('', mockProducts);
      expect(suggestions.length).toBe(0);
    });
  });
});
