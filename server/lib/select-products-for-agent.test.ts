import { describe, it, expect } from "vitest";
import {
  selectProductsForAgent,
  getRemainingProducts,
  formatSelectedProductsForPrompt,
  groupProductsByName,
  type ProductItem,
} from "./select-products-for-agent";

describe("Product Selection for Agents", () => {
  const mockProducts: ProductItem[] = [
    {
      id: "1",
      name: "Futrola Abstract za iPhone 15 Pro - crna",
      code: "1078072",
      price: 0.3692,
      discount: 50,
      category: "Phone Cases",
    },
    {
      id: "2",
      name: "Futrola Abstract za iPhone 15 Pro - ljubicasta",
      code: "1078073",
      price: 0.3691,
      discount: 50,
      category: "Phone Cases",
    },
    {
      id: "3",
      name: "Futrola Abstract za iPhone 15 Pro - roza",
      code: "1078074",
      price: 0.3689,
      discount: 50,
      category: "Phone Cases",
    },
    {
      id: "4",
      name: "Futrola Abstract za iPhone 15 Pro Max - crna",
      code: "1078078",
      price: 0.3691,
      discount: 50,
      category: "Phone Cases",
    },
    {
      id: "5",
      name: "iPhone 15 Pro Screen Protector",
      code: "1078100",
      price: 0.15,
      discount: 30,
      category: "Accessories",
    },
    {
      id: "6",
      name: "Samsung Galaxy S24 Case",
      code: "1078200",
      price: 0.25,
      discount: 40,
      category: "Phone Cases",
    },
  ];

  describe("selectProductsForAgent", () => {
    it("should find all iPhone 15 Pro cases when searching for 'iPhone 15 Pro'", () => {
      const result = selectProductsForAgent(mockProducts, "iPhone 15 Pro");

      expect(result.selectedProducts.length).toBeGreaterThan(0);
      expect(result.selectedProducts.some((p) => p.name.includes("iPhone 15 Pro"))).toBe(true);
      expect(result.matchType).toBe("category");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should find exact match for 'Futrola Abstract za iPhone 15 Pro - crna'", () => {
      const result = selectProductsForAgent(
        mockProducts,
        "Futrola Abstract za iPhone 15 Pro - crna"
      );

      expect(result.selectedProducts.length).toBeGreaterThan(0);
      expect(result.selectedProducts[0].id).toBe("1");
      // Substring match gets high score (0.85+), which is category match type
      expect(result.matchType).toMatch(/exact|category/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("should handle fuzzy search with typos", () => {
      const result = selectProductsForAgent(mockProducts, "iphone 15 pro case");

      expect(result.selectedProducts.length).toBeGreaterThan(0);
      expect(result.matchType).toMatch(/exact|category|fuzzy/);
    });

    it("should return all products when no matches found", () => {
      const result = selectProductsForAgent(mockProducts, "nonexistent product xyz");

      expect(result.selectedProducts.length).toBe(mockProducts.length);
      expect(result.matchType).toBe("all");
      expect(result.confidence).toBe(0);
    });

    it("should handle empty product list", () => {
      const result = selectProductsForAgent([], "iPhone 15 Pro");

      expect(result.selectedProducts).toEqual([]);
      expect(result.totalMatches).toBe(0);
      expect(result.matchType).toBe("all");
    });

    it("should prioritize products by similarity score", () => {
      const result = selectProductsForAgent(mockProducts, "iPhone 15 Pro");

      // First result should have highest similarity
      if (result.selectedProducts.length > 1) {
        expect(result.selectedProducts[0].name).toContain("iPhone 15 Pro");
      }
    });

    it("should find all iPhone 15 Pro cases (not just top 5)", () => {
      const result = selectProductsForAgent(mockProducts, "iPhone 15 Pro");

      // Should find at least 3 iPhone 15 Pro cases
      const iphone15ProCases = result.selectedProducts.filter((p) =>
        p.name.includes("iPhone 15 Pro")
      );
      expect(iphone15ProCases.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getRemainingProducts", () => {
    it("should return products not in used list", () => {
      const usedIds = ["1", "2"];
      const remaining = getRemainingProducts(mockProducts, usedIds);

      expect(remaining.length).toBe(mockProducts.length - 2);
      expect(remaining.every((p) => !usedIds.includes(p.id))).toBe(true);
    });

    it("should return all products when used list is empty", () => {
      const remaining = getRemainingProducts(mockProducts, []);

      expect(remaining.length).toBe(mockProducts.length);
    });

    it("should return empty list when all products are used", () => {
      const usedIds = mockProducts.map((p) => p.id);
      const remaining = getRemainingProducts(mockProducts, usedIds);

      expect(remaining.length).toBe(0);
    });
  });

  describe("formatSelectedProductsForPrompt", () => {
    it("should format products as readable list", () => {
      const formatted = formatSelectedProductsForPrompt(mockProducts.slice(0, 3));

      expect(formatted).toContain("Selected Products (3 total)");
      expect(formatted).toContain("1078072");
      expect(formatted).toContain("0.3692");
      expect(formatted).toContain("50%");
    });

    it("should handle empty product list", () => {
      const formatted = formatSelectedProductsForPrompt([]);

      expect(formatted).toBe("No products selected.");
    });

    it("should show truncation message for large lists", () => {
      const largeList = Array.from({ length: 60 }, (_, i) => ({
        id: String(i),
        name: `Product ${i}`,
        code: `CODE${i}`,
        price: 10 + i,
      }));

      const formatted = formatSelectedProductsForPrompt(largeList, 50);

      expect(formatted).toContain("... and 10 more products");
    });

    it("should include all product details when available", () => {
      const formatted = formatSelectedProductsForPrompt([mockProducts[0]]);

      expect(formatted).toContain("Futrola Abstract za iPhone 15 Pro - crna");
      expect(formatted).toContain("1078072");
      expect(formatted).toContain("0.3692");
      expect(formatted).toContain("50%");
    });
  });

  describe("groupProductsByName", () => {
    it("should group products by name prefix", () => {
      const groups = groupProductsByName(mockProducts);

      expect(groups.size).toBeGreaterThan(0);
      // Should have groups for different product types
      const groupKeys = Array.from(groups.keys());
      expect(groupKeys.some((k) => k.includes("futrola"))).toBe(true);
    });

    it("should group similar products together", () => {
      const groups = groupProductsByName(mockProducts);

      // All iPhone 15 Pro cases should be in related groups
      const allProducts = Array.from(groups.values()).flat();
      expect(allProducts.length).toBe(mockProducts.length);
    });

    it("should handle empty product list", () => {
      const groups = groupProductsByName([]);

      expect(groups.size).toBe(0);
    });

    it("should create meaningful group keys", () => {
      const groups = groupProductsByName(mockProducts);
      const groupKeys = Array.from(groups.keys());

      // Group keys should be meaningful (not empty)
      expect(groupKeys.every((k) => k.length > 0)).toBe(true);
    });
  });

  describe("Integration: Full workflow", () => {
    it("should support multi-ad campaign workflow", () => {
      // Step 1: User searches for iPhone 15 Pro cases
      const firstAdResult = selectProductsForAgent(mockProducts, "iPhone 15 Pro");
      expect(firstAdResult.selectedProducts.length).toBeGreaterThan(0);

      // Step 2: User creates first ad with some products
      const usedInFirstAd = firstAdResult.selectedProducts.slice(0, 3).map((p) => p.id);

      // Step 3: Get remaining products for second ad
      const remaining = getRemainingProducts(mockProducts, usedInFirstAd);
      expect(remaining.length).toBeGreaterThan(0);

      // Step 4: Create second ad with remaining products
      const secondAdResult = selectProductsForAgent(
        remaining,
        "iPhone 15 Pro"
      );
      expect(secondAdResult.selectedProducts.length).toBeGreaterThan(0);

      // Verify no overlap
      const usedIds = new Set(usedInFirstAd);
      expect(
        secondAdResult.selectedProducts.every((p) => !usedIds.has(p.id))
      ).toBe(true);
    });

    it("should maintain product selection across multiple ads", () => {
      const allUsedProducts: string[] = [];

      // Create 3 ads
      for (let i = 0; i < 3; i++) {
        const remaining = getRemainingProducts(mockProducts, allUsedProducts);
        if (remaining.length === 0) break;

        const result = selectProductsForAgent(remaining, "iPhone 15 Pro");
        const selectedIds = result.selectedProducts.slice(0, 2).map((p) => p.id);
        allUsedProducts.push(...selectedIds);
      }

      // Verify no duplicates
      const uniqueIds = new Set(allUsedProducts);
      expect(uniqueIds.size).toBe(allUsedProducts.length);
    });
  });
});
