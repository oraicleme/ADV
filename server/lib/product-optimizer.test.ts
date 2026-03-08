import { describe, it, expect } from "vitest";
import {
  optimizeProductCatalog,
  formatOptimizedCatalogForPrompt,
  generateFallbackSuggestion,
  type ProductItem,
} from "./product-optimizer";

describe("Product Optimizer", () => {
  describe("optimizeProductCatalog", () => {
    it("should handle empty product list", () => {
      const result = optimizeProductCatalog([]);

      expect(result.totalProducts).toBe(0);
      expect(result.topProducts).toEqual([]);
      expect(result.categorySummary).toEqual({});
      expect(result.priceStats).toEqual({ min: 0, max: 0, avg: 0 });
      expect(result.discountStats).toEqual({
        hasDiscounts: false,
        avgDiscount: 0,
        maxDiscount: 0,
      });
    });

    it("should extract top products by discount", () => {
      const products: ProductItem[] = [
        {
          id: "1",
          name: "Product A",
          price: 100,
          discount: 50,
          category: "Electronics",
        },
        {
          id: "2",
          name: "Product B",
          price: 200,
          discount: 10,
          category: "Electronics",
        },
        {
          id: "3",
          name: "Product C",
          price: 150,
          discount: 30,
          category: "Clothing",
        },
      ];

      const result = optimizeProductCatalog(products, 3);

      expect(result.totalProducts).toBe(3);
      expect(result.topProducts.length).toBe(3);
      // Should be sorted by discount (highest first)
      expect(result.topProducts[0].discount).toBe(50);
      expect(result.topProducts[1].discount).toBe(30);
      expect(result.topProducts[2].discount).toBe(10);
    });

    it("should build category summary correctly", () => {
      const products: ProductItem[] = [
        {
          id: "1",
          name: "iPhone 15",
          price: 999,
          category: "Electronics",
        },
        {
          id: "2",
          name: "iPhone 14",
          price: 799,
          category: "Electronics",
        },
        {
          id: "3",
          name: "iPad",
          price: 599,
          category: "Electronics",
        },
        { id: "4", name: "T-Shirt", price: 29, category: "Clothing" },
        { id: "5", name: "Jeans", price: 79, category: "Clothing" },
      ];

      const result = optimizeProductCatalog(products);

      expect(result.categorySummary["Electronics"].count).toBe(3);
      expect(result.categorySummary["Electronics"].avgPrice).toBeCloseTo(
        799.33,
        0
      );
      expect(result.categorySummary["Clothing"].count).toBe(2);
      expect(result.categorySummary["Clothing"].avgPrice).toBe(54);
    });

    it("should calculate price statistics correctly", () => {
      const products: ProductItem[] = [
        { id: "1", name: "Cheap", price: 10 },
        { id: "2", name: "Medium", price: 50 },
        { id: "3", name: "Expensive", price: 100 },
      ];

      const result = optimizeProductCatalog(products);

      expect(result.priceStats.min).toBe(10);
      expect(result.priceStats.max).toBe(100);
      expect(result.priceStats.avg).toBe(53.33);
    });

    it("should calculate discount statistics correctly", () => {
      const products: ProductItem[] = [
        { id: "1", name: "Product A", price: 100, discount: 10 },
        { id: "2", name: "Product B", price: 100, discount: 20 },
        { id: "3", name: "Product C", price: 100, discount: 30 },
        { id: "4", name: "Product D", price: 100 }, // No discount
      ];

      const result = optimizeProductCatalog(products);

      expect(result.discountStats.hasDiscounts).toBe(true);
      expect(result.discountStats.avgDiscount).toBe(20);
      expect(result.discountStats.maxDiscount).toBe(30);
    });

    it("should limit top products to specified count", () => {
      const products: ProductItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        name: `Product ${i}`,
        price: 100,
      }));

      const result = optimizeProductCatalog(products, 10);

      expect(result.totalProducts).toBe(100);
      expect(result.topProducts.length).toBe(10);
    });

    it("should handle products without categories", () => {
      const products: ProductItem[] = [
        { id: "1", name: "Product A", price: 100 },
        { id: "2", name: "Product B", price: 200 },
      ];

      const result = optimizeProductCatalog(products);

      expect(result.categorySummary["Uncategorized"].count).toBe(2);
    });
  });

  describe("formatOptimizedCatalogForPrompt", () => {
    it("should format catalog as readable string", () => {
      const products: ProductItem[] = [
        {
          id: "1",
          name: "iPhone 15",
          price: 999,
          discount: 20,
          category: "Electronics",
        },
        {
          id: "2",
          name: "AirPods",
          price: 199,
          discount: 10,
          category: "Electronics",
        },
      ];

      const optimized = optimizeProductCatalog(products);
      const formatted = formatOptimizedCatalogForPrompt(optimized);

      expect(formatted).toContain("2 total products");
      expect(formatted).toContain("Price Range");
      expect(formatted).toContain("Discounts");
      expect(formatted).toContain("Categories");
      expect(formatted).toContain("Top Products");
      expect(formatted).toContain("iPhone 15");
      expect(formatted).toContain("20% off");
    });

    it("should not include discount section if no discounts", () => {
      const products: ProductItem[] = [
        { id: "1", name: "Product A", price: 100 },
        { id: "2", name: "Product B", price: 200 },
      ];

      const optimized = optimizeProductCatalog(products);
      const formatted = formatOptimizedCatalogForPrompt(optimized);

      expect(formatted).not.toContain("Discounts:");
    });

    it("should keep formatted output concise", () => {
      const products: ProductItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        name: `Product ${i}`,
        price: 100 + i * 10,
        category: i % 2 === 0 ? "Electronics" : "Clothing",
      }));

      const optimized = optimizeProductCatalog(products, 10);
      const formatted = formatOptimizedCatalogForPrompt(optimized);

      // Should be much shorter than serializing all 50 products
      expect(formatted.length).toBeLessThan(1000);
    });
  });

  describe("generateFallbackSuggestion", () => {
    it("should generate fallback for design agent", () => {
      const fallback = generateFallbackSuggestion(
        "design-agent",
        "LLM timeout",
        {}
      );

      expect(fallback.title).toBeTruthy();
      expect(fallback.description).toBeTruthy();
      expect(fallback.reasoning).toBeTruthy();
      expect(fallback.confidence).toBe(0.5);
      expect(fallback.title).toContain("Visual");
    });

    it("should generate fallback for copy agent", () => {
      const fallback = generateFallbackSuggestion("copy-agent", "LLM error", {});

      expect(fallback.title).toContain("CTA");
    });

    it("should generate fallback for product agent", () => {
      const fallback = generateFallbackSuggestion(
        "product-agent",
        "LLM error",
        {}
      );

      expect(fallback.title).toContain("Best Sellers");
    });

    it("should generate fallback for brand agent", () => {
      const fallback = generateFallbackSuggestion("brand-agent", "LLM error", {});

      expect(fallback.title).toContain("Brand");
    });

    it("should generate fallback for optimization agent", () => {
      const fallback = generateFallbackSuggestion(
        "optimization-agent",
        "LLM error",
        {}
      );

      expect(fallback.title).toContain("Optimize");
    });

    it("should use copy agent fallback for unknown agent", () => {
      const fallback = generateFallbackSuggestion(
        "unknown-agent" as any,
        "LLM error",
        {}
      );

      expect(fallback.title).toContain("CTA");
    });
  });
});
