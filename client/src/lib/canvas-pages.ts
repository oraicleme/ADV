/**
 * STORY-127: Multi-page canvas — industry-standard page distribution.
 * When product count exceeds single-page capacity (Story/Square: 3 rows × columns; Landscape: 4),
 * products are split across multiple pages with deterministic distribution.
 * Industry standard: first page(s) full, short page last (e.g. 13 → [7,6], 55 → [8,8,…,7]).
 * STORY-161: Portrait capacity scales with product grid columns (e.g. 4 cols → 12 per page).
 */

import type { FormatPreset } from './ad-layouts/types';

/** Single page: indices into the full product list for this page. */
export interface CanvasPage {
  productIndices: number[];
}

/** Fixed rows for portrait Story/Square product grids (matches multi-grid vertical rhythm). */
const PORTRAIT_PRODUCT_ROWS = 3;

/**
 * Max products that fit on one ad page by format (Story/Square vs Landscape).
 * Story/Square: 3 × columns (default 3 → 9); Landscape: 4.
 * @param gridColumns Product block columns (1–4); 0 or undefined → 3 for capacity.
 */
export function maxProductsPerPage(format: FormatPreset, gridColumns?: number): number {
  const isLandscape = format.width > format.height * 1.1;
  if (isLandscape) return 4;
  const cols =
    gridColumns !== undefined && gridColumns > 0 ? Math.min(4, Math.max(1, gridColumns)) : 3;
  return PORTRAIT_PRODUCT_ROWS * cols;
}

/**
 * Deterministic split: how many products go on each page.
 * Example: 13 products, Story → [7, 6]; 55 → [8,8,…,7]; 9 → [9].
 * - Single page when count <= maxPerPage.
 * - Otherwise N pages: first pages get max (full), last page gets remainder (industry standard: first page full).
 */
export function splitProductsByPage(
  productCount: number,
  format: FormatPreset,
  gridColumns?: number,
): number[] {
  if (productCount <= 0) return [];
  const max = maxProductsPerPage(format, gridColumns);
  if (productCount <= max) return [productCount];

  const pageCount = Math.ceil(productCount / max);
  const base = Math.floor(productCount / pageCount);
  const remainder = productCount % pageCount;
  // Put extra products on the first pages so the first page is full (e.g. 55 Story → 7 pages).
  const counts: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    counts.push(base + (i < remainder ? 1 : 0));
  }
  return counts;
}

/**
 * Build page descriptors: each page has the slice of product indices for that page.
 * Backward compatible: one page = all indices [0..count-1].
 */
export function getPages(
  productCount: number,
  format: FormatPreset,
  gridColumns?: number,
): CanvasPage[] {
  const counts = splitProductsByPage(productCount, format, gridColumns);
  let offset = 0;
  return counts.map((n) => {
    const productIndices = Array.from({ length: n }, (_, i) => offset + i);
    offset += n;
    return { productIndices };
  });
}
