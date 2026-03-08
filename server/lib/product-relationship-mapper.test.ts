import { describe, it, expect } from 'vitest';
import { ProductRelationshipMapper, type ProductGroup } from './product-relationship-mapper';
import type { ExtractedProductStructure } from './product-structure-extractor';

describe('ProductRelationshipMapper', () => {
  const mockPhone: ExtractedProductStructure = {
    originalName: 'iPhone 15 Pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    productType: 'phone',
    category: 'Mobilni telefon',
    specs: { storage: '256GB' },
    tags: ['Apple', 'iPhone', '15', 'Pro'],
    confidence: 0.95,
    reasoning: 'Clear iPhone model',
  };

  const mockCase: ExtractedProductStructure = {
    originalName: 'Futrola za iPhone 15 Pro - crna',
    brand: undefined,
    model: 'iPhone 15 Pro',
    variant: 'crna',
    productType: 'case',
    category: 'Futrola za mob. tel.',
    specs: { material: 'silicone' },
    tags: ['case', 'iPhone', '15', 'Pro'],
    confidence: 0.88,
    reasoning: 'iPhone case identified',
  };

  const mockCharger: ExtractedProductStructure = {
    originalName: 'USB-C Charger za iPhone',
    brand: undefined,
    model: 'iPhone',
    productType: 'charger',
    category: 'Punjač',
    specs: { power: '20W' },
    tags: ['charger', 'iPhone', 'USB-C'],
    confidence: 0.85,
    reasoning: 'iPhone charger',
  };

  const mockSamsungPhone: ExtractedProductStructure = {
    originalName: 'Samsung Galaxy S24',
    brand: 'Samsung',
    model: 'Galaxy S24',
    productType: 'phone',
    category: 'Mobilni telefon',
    specs: { storage: '256GB' },
    tags: ['Samsung', 'Galaxy', 'S24'],
    confidence: 0.92,
    reasoning: 'Samsung phone',
  };

  describe('mapProductRelationships', () => {
    it('should group products by model', () => {
      const products = [mockPhone, mockCase, mockCharger];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      expect(groups.length).toBeGreaterThan(0);
      const iPhoneGroup = groups.find((g) => g.model === 'iPhone 15 Pro');
      expect(iPhoneGroup).toBeDefined();
      expect(iPhoneGroup?.mainProducts).toContain(mockPhone);
    });

    it('should separate main products from accessories', () => {
      const products = [mockPhone, mockCase];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      const group = groups.find((g) => g.model === 'iPhone 15 Pro');
      expect(group?.mainProducts).toContain(mockPhone);
      expect(group?.accessories).toContain(mockCase);
    });

    it('should handle multiple brands', () => {
      const products = [mockPhone, mockSamsungPhone];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      expect(groups.length).toBeGreaterThanOrEqual(2);
      expect(groups.some((g) => g.brand === 'Apple')).toBe(true);
      expect(groups.some((g) => g.brand === 'Samsung')).toBe(true);
    });

    it('should sort groups by main products count', () => {
      const products = [mockPhone, mockCase, mockCharger, mockSamsungPhone];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      // First group should have more main products
      if (groups.length > 1) {
        expect(groups[0].mainProducts.length).toBeGreaterThanOrEqual(
          groups[1].mainProducts.length
        );
      }
    });
  });

  describe('getRelatedProducts', () => {
    it('should return related products for a model', () => {
      const products = [mockPhone, mockCase, mockCharger];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      const relationships = ProductRelationshipMapper.getRelatedProducts(
        'Apple iPhone 15 Pro',
        groups
      );

      expect(relationships.length).toBeGreaterThan(0);
      expect(relationships[0].mainProduct).toBe(mockPhone);
    });

    it('should return empty array for non-existent model', () => {
      const products = [mockPhone];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      const relationships = ProductRelationshipMapper.getRelatedProducts('NonExistent', groups);
      expect(relationships).toHaveLength(0);
    });
  });

  describe('findBestProductsForAgent', () => {
    it('should return limited number of products', () => {
      const products = [mockPhone, mockCase, mockCharger, mockSamsungPhone];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      const best = ProductRelationshipMapper.findBestProductsForAgent(groups, 2);
      expect(best.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize main products', () => {
      const products = [mockPhone, mockCase, mockCharger];
      const groups = ProductRelationshipMapper.mapProductRelationships(products);

      const best = ProductRelationshipMapper.findBestProductsForAgent(groups, 10);
      const mainProductCount = best.filter((p) => p.productType === 'phone').length;
      expect(mainProductCount).toBeGreaterThan(0);
    });
  });

  describe('filterByType', () => {
    it('should filter products by type', () => {
      const products = [mockPhone, mockCase, mockCharger];

      const phones = ProductRelationshipMapper.filterByType(products, ['phone']);
      expect(phones).toContain(mockPhone);
      expect(phones).not.toContain(mockCase);

      const accessories = ProductRelationshipMapper.filterByType(products, ['case', 'charger']);
      expect(accessories).toContain(mockCase);
      expect(accessories).toContain(mockCharger);
    });
  });

  describe('filterByBrand', () => {
    it('should filter products by brand', () => {
      const products = [mockPhone, mockSamsungPhone];

      const apple = ProductRelationshipMapper.filterByBrand(products, ['Apple']);
      expect(apple).toContain(mockPhone);
      expect(apple).not.toContain(mockSamsungPhone);

      const samsung = ProductRelationshipMapper.filterByBrand(products, ['Samsung']);
      expect(samsung).toContain(mockSamsungPhone);
    });
  });

  describe('searchByTag', () => {
    it('should search products by tag', () => {
      const products = [mockPhone, mockCase, mockSamsungPhone];

      const iPhoneResults = ProductRelationshipMapper.searchByTag(products, 'iPhone');
      expect(iPhoneResults).toContain(mockPhone);
      expect(iPhoneResults).toContain(mockCase);

      const galaxyResults = ProductRelationshipMapper.searchByTag(products, 'Galaxy');
      expect(galaxyResults).toContain(mockSamsungPhone);
    });

    it('should search by model name', () => {
      const products = [mockPhone, mockSamsungPhone];

      const results = ProductRelationshipMapper.searchByTag(products, 'Pro');
      expect(results).toContain(mockPhone);
    });
  });
});
