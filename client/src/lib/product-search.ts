/**
 * Advanced product search and filtering utilities
 * Handles fuzzy matching, partial matches, and intelligent product discovery
 */

import type { ProductItem } from './ad-templates';

/**
 * Calculate similarity score between two strings (0-1)
 * Uses a combination of substring matching and character overlap
 */
export function calculateSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1; // Exact match
  if (t.includes(q)) return 0.95; // Substring match
  if (q.includes(t)) return 0.85; // Reverse substring match

  // Levenshtein-inspired: count matching characters in order
  let matches = 0;
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      matches++;
      qIdx++;
    }
  }

  // Bonus for consecutive matches
  const consecutiveBonus = (t.match(new RegExp(q.split('').join('.*?'), 'i')) ? 0.1 : 0);
  return Math.min(1, (matches / Math.max(q.length, t.length)) + consecutiveBonus);
}

/**
 * Search products by name and code with fuzzy matching
 * Returns products sorted by relevance score
 */
export function searchProducts(
  products: ProductItem[],
  query: string,
  options: {
    minSimilarity?: number;
    maxResults?: number;
  } = {},
): Array<{ product: ProductItem; index: number; score: number }> {
  const { minSimilarity = 0.3, maxResults = 100 } = options;
  const q = query.toLowerCase().trim();

  if (!q) return [];

  const results = products
    .map((product, index) => {
      const nameScore = calculateSimilarity(q, product.name);
      const codeScore = product.code ? calculateSimilarity(q, product.code) : 0;
      const score = Math.max(nameScore, codeScore);

      return { product, index, score };
    })
    .filter((r) => r.score >= minSimilarity)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}

/**
 * Extract product variants from a product name
 * e.g., "iPhone 15 Pro Max" -> ["iPhone", "15", "Pro", "Max"]
 */
export function extractProductVariants(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s\-_,]+/)
    .filter((part) => part.length > 0);
}

/**
 * Group products by common variants (e.g., all iPhone 15 models together)
 */
export function groupProductsByVariant(
  products: ProductItem[],
): Map<string, Array<{ product: ProductItem; index: number }>> {
  const groups = new Map<string, Array<{ product: ProductItem; index: number }>>();

  products.forEach((product, index) => {
    const variants = extractProductVariants(product.name);

    // Group by first 2 variants (e.g., "iPhone 15" is the group key)
    const groupKey = variants.slice(0, 2).join(' ');

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push({ product, index });
  });

  return groups;
}

/**
 * Filter products with intelligent matching
 * Handles exact, partial, and fuzzy matches
 */
export function filterProductsIntelligent(
  products: ProductItem[],
  query: string,
  options: {
    searchFields?: (keyof ProductItem)[];
    fuzzyMatch?: boolean;
    groupByVariant?: boolean;
  } = {},
): number[] {
  const {
    searchFields = ['name', 'code'],
    fuzzyMatch = true,
    groupByVariant = false,
  } = options;

  const q = query.toLowerCase().trim();

  if (!q) return products.map((_, i) => i);

  if (fuzzyMatch) {
    // Use fuzzy search
    const results = searchProducts(products, q, { minSimilarity: 0.3 });
    return results.map((r) => r.index);
  }

  // Standard substring matching
  return products
    .map((_, i) => i)
    .filter((i) => {
      const product = products[i];
      return searchFields.some((field) => {
        const value = product[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(q);
        }
        return false;
      });
    });
}

/**
 * Suggest product corrections based on available products
 * Useful for handling typos or variations
 */
export function suggestProductCorrections(
  query: string,
  products: ProductItem[],
  limit: number = 5,
): Array<{ suggestion: string; count: number }> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = searchProducts(products, q, { minSimilarity: 0.5, maxResults: limit });

  // Group by product name to show most common matches
  const grouped = new Map<string, number>();
  results.forEach(({ product }) => {
    grouped.set(product.name, (grouped.get(product.name) ?? 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([suggestion, count]) => ({ suggestion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
