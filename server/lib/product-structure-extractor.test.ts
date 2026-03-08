import { describe, it, expect, vi } from 'vitest';
import { ProductStructureExtractor, type ExtractedProductStructure } from './product-structure-extractor';

// Mock the LLM module
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(async () => {
    // Return a generic response for all calls
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              brand: 'Test Brand',
              model: 'Test Model',
              variant: null,
              productType: 'phone',
              specs: {},
              tags: ['test'],
              confidence: 0.8,
              reasoning: 'Test',
            }),
          },
        },
      ],
    };
  }),
}));

describe('ProductStructureExtractor', () => {
  describe('extractProductStructure', () => {
    it('should extract product structure', async () => {
      const result = await ProductStructureExtractor.extractProductStructure(
        'Test Product',
        'Test Category'
      );

      expect(result.originalName).toBe('Test Product');
      expect(result.category).toBe('Test Category');
      expect(result.productType).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should include original name in result', async () => {
      const originalName = 'Test Product';
      const result = await ProductStructureExtractor.extractProductStructure(
        originalName,
        'Test Category'
      );

      expect(result.originalName).toBe(originalName);
    });

    it('should handle extraction with code parameter', async () => {
      const result = await ProductStructureExtractor.extractProductStructure(
        'Test Product',
        'Test Category',
        'CODE123'
      );

      expect(result.originalName).toBe('Test Product');
      expect(result.category).toBe('Test Category');
    });
  });

  describe('groupProductsByModel', () => {
    it('should group products by model', () => {
      const products: ExtractedProductStructure[] = [
        {
          originalName: 'Product 1',
          brand: 'Brand A',
          model: 'Model X',
          productType: 'phone',
          category: 'Category 1',
          specs: {},
          tags: ['tag1'],
          confidence: 0.9,
          reasoning: 'Test',
        },
        {
          originalName: 'Product 2',
          brand: 'Brand A',
          model: 'Model X',
          productType: 'case',
          category: 'Category 2',
          specs: {},
          tags: ['tag2'],
          confidence: 0.85,
          reasoning: 'Test',
        },
      ];

      const groups = ProductStructureExtractor.groupProductsByModel(products);

      expect(groups.size).toBeGreaterThan(0);
      for (const [key, items] of groups) {
        expect(key).toBeDefined();
        expect(items.length).toBeGreaterThan(0);
      }
    });

    it('should handle products without model', () => {
      const products: ExtractedProductStructure[] = [
        {
          originalName: 'Unknown Product',
          productType: 'other',
          category: 'Unknown',
          specs: {},
          tags: [],
          confidence: 0.1,
          reasoning: 'Test',
        },
      ];

      const groups = ProductStructureExtractor.groupProductsByModel(products);
      expect(groups.size).toBeGreaterThan(0);
    });
  });

  describe('detectAccessoryRelationship', () => {
    it('should detect case as accessory for phone', () => {
      const phone: ExtractedProductStructure = {
        originalName: 'iPhone 15 Pro',
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        productType: 'phone',
        category: 'Phone',
        specs: {},
        tags: ['iPhone', '15', 'Pro'],
        confidence: 0.95,
        reasoning: 'Test',
      };

      const phoneCase: ExtractedProductStructure = {
        originalName: 'Case for iPhone 15 Pro',
        brand: undefined,
        model: 'iPhone 15 Pro',
        productType: 'case',
        category: 'Case',
        specs: {},
        tags: ['case', 'iPhone', '15', 'Pro'],
        confidence: 0.88,
        reasoning: 'Test',
      };

      const isAccessory = ProductStructureExtractor.detectAccessoryRelationship(phoneCase, phone);
      expect(isAccessory).toBe(true);
    });

    it('should not detect phone as accessory for another phone', () => {
      const phone1: ExtractedProductStructure = {
        originalName: 'iPhone 15 Pro',
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        productType: 'phone',
        category: 'Phone',
        specs: {},
        tags: ['iPhone'],
        confidence: 0.95,
        reasoning: 'Test',
      };

      const phone2: ExtractedProductStructure = {
        originalName: 'Samsung Galaxy S24',
        brand: 'Samsung',
        model: 'Galaxy S24',
        productType: 'phone',
        category: 'Phone',
        specs: {},
        tags: ['Samsung', 'Galaxy'],
        confidence: 0.92,
        reasoning: 'Test',
      };

      const isAccessory = ProductStructureExtractor.detectAccessoryRelationship(phone2, phone1);
      expect(isAccessory).toBe(false);
    });
  });

  describe('extractBatch', () => {
    it('should process multiple products', async () => {
      const productList = [
        { name: 'Product 1', category: 'Category 1' },
        { name: 'Product 2', category: 'Category 2' },
      ];

      const results = await ProductStructureExtractor.extractBatch(productList);

      expect(results).toHaveLength(2);
      expect(results[0].originalName).toBe('Product 1');
      expect(results[1].originalName).toBe('Product 2');
    });
  });
});
