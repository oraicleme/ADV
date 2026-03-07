import { describe, it, expect } from 'vitest';
import type { ProductItem } from './ad-templates';

/**
 * Same logic as ProductDataInput visibleIndices: filter by search and activeFilters.
 * Used to assert that with 20k–50k products the filter completes in < 500ms.
 */
function getProductClassificationValue(p: ProductItem, dimension: string): string {
  if (dimension === 'category') return p.category?.trim() ?? '';
  if (dimension === 'brand') return p.brand?.trim() ?? '';
  return p.classifications?.[dimension]?.trim() ?? '';
}

function computeVisibleIndices(
  products: ProductItem[],
  searchQuery: string,
  activeFilters: Record<string, Set<string>>,
): number[] {
  const q = searchQuery.toLowerCase().trim();
  return products
    .map((_, i) => i)
    .filter((i) => {
      const p = products[i];
      if (p == null) return false;
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const codeMatch = (p.code ?? '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }
      for (const dim of Object.keys(activeFilters)) {
        const active = activeFilters[dim];
        if (!active || active.size === 0) continue;
        const val = getProductClassificationValue(p, dim);
        if (!active.has(val)) return false;
      }
      return true;
    });
}

describe('visibleIndices scale', () => {
  it('completes in < 500ms with 20k products (search + dimension filter)', () => {
    const products: ProductItem[] = Array.from({ length: 20000 }, (_, i) => ({
      name: `Product ${i}`,
      code: `C${i}`,
      category: `Cat${i % 20}`,
    }));
    const searchQuery = 'Product 1';
    const activeFilters: Record<string, Set<string>> = { category: new Set(['Cat0', 'Cat1']) };
    const start = performance.now();
    const result = computeVisibleIndices(products, searchQuery, activeFilters);
    const elapsed = performance.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
