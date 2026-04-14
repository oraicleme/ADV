/**
 * STORY-127: Multi-page canvas — distribution logic tests (T1, T2).
 */

import { describe, it, expect } from 'vitest';
import {
  maxProductsPerPage,
  splitProductsByPage,
  getPages,
  type CanvasPage,
} from './canvas-pages';

const STORY = { id: 'viber-story', label: 'Story', width: 1080, height: 1920 };
const SQUARE = { id: 'instagram-square', label: 'Square', width: 1080, height: 1080 };
const LANDSCAPE = { id: 'facebook-landscape', label: 'Landscape', width: 1200, height: 628 };

describe('maxProductsPerPage', () => {
  it('returns 9 for Story format', () => {
    expect(maxProductsPerPage(STORY)).toBe(9);
  });
  it('returns 9 for Square format', () => {
    expect(maxProductsPerPage(SQUARE)).toBe(9);
  });
  it('returns 4 for Landscape format', () => {
    expect(maxProductsPerPage(LANDSCAPE)).toBe(4);
  });
  it('STORY-161: Story with 4 columns → 12 per page (3 rows × 4)', () => {
    expect(maxProductsPerPage(STORY, 4)).toBe(12);
  });
  it('Landscape ignores grid columns', () => {
    expect(maxProductsPerPage(LANDSCAPE, 4)).toBe(4);
  });
});

describe('splitProductsByPage', () => {
  it('T1: given productCount 13 and format Story, returns 2 pages with 7 and 6 (first page full)', () => {
    expect(splitProductsByPage(13, STORY)).toEqual([7, 6]);
  });
  it('T2: given productCount 9, single page with all 9', () => {
    expect(splitProductsByPage(9, STORY)).toEqual([9]);
    expect(splitProductsByPage(9, SQUARE)).toEqual([9]);
  });
  it('returns single page when count <= maxPerPage', () => {
    expect(splitProductsByPage(1, STORY)).toEqual([1]);
    expect(splitProductsByPage(9, STORY)).toEqual([9]);
    expect(splitProductsByPage(4, LANDSCAPE)).toEqual([4]);
  });
  it('balances 10 products across 2 pages as 5+5', () => {
    expect(splitProductsByPage(10, STORY)).toEqual([5, 5]);
  });
  it('balances 18 products across 2 pages as 9+9', () => {
    expect(splitProductsByPage(18, STORY)).toEqual([9, 9]);
  });
  it('Landscape: 10 products → 3 pages (4+3+3), first page full', () => {
    expect(splitProductsByPage(10, LANDSCAPE)).toEqual([4, 3, 3]);
  });
  it('returns empty array for 0 products', () => {
    expect(splitProductsByPage(0, STORY)).toEqual([]);
  });
});

describe('getPages', () => {
  it('returns one page with all indices when count <= maxPerPage', () => {
    const pages = getPages(9, STORY);
    expect(pages).toHaveLength(1);
    expect(pages[0].productIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('returns two pages with correct indices for 13 products (7+6)', () => {
    const pages = getPages(13, STORY);
    expect(pages).toHaveLength(2);
    expect(pages[0].productIndices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pages[1].productIndices).toEqual([7, 8, 9, 10, 11, 12]);
  });
  it('55 products Story: first page has 8 (full), last page 7', () => {
    const pages = getPages(55, STORY);
    expect(pages).toHaveLength(7);
    expect(pages[0]!.productIndices).toHaveLength(8);
    expect(pages[6]!.productIndices).toHaveLength(7);
  });
  it('STORY-161: 101 products Story with 4 columns — first page has 12 slots', () => {
    const pages = getPages(101, STORY, 4);
    expect(pages[0]!.productIndices).toHaveLength(12);
    expect(pages.reduce((n, p) => n + p.productIndices.length, 0)).toBe(101);
  });
});
