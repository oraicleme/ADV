import { describe, it, expect } from 'vitest';
import type { ProductItem } from './ad-constants';
import { buildSearchIndex } from './product-index';
import {
  filterCatalogBySearchQuery,
  filterCatalogIndicesBySearchQuery,
  filterImportedCatalogByActiveSearch,
  filterProductsForSelectionPanel,
  remainingCatalogForNewAd,
} from './product-selection-panel-filters';
import { SEARCH_RULES_STORAGE_KEY } from './search-rules-storage';

function p(overrides: Partial<ProductItem> & { name: string }): ProductItem {
  return { name: overrides.name, ...overrides };
}

describe('filterProductsForSelectionPanel', () => {
  const catalog = [
    p({ name: 'On canvas A', code: 'A' }),
    p({ name: 'Free B', code: 'B', category: 'Cat' }),
    p({ name: 'Free C', code: 'C' }),
  ];

  it('with namesOnCanvas, not_on_canvas excludes products whose name is on the ad', () => {
    const out = filterProductsForSelectionPanel(
      catalog,
      '',
      ['On canvas A'],
      new Set(),
      'not_on_canvas',
      false,
    );
    expect(out.map((x) => x.name)).toEqual(['Free B', 'Free C']);
  });

  it('STORY-206: only_on_canvas keeps intersection with search', () => {
    const out = filterProductsForSelectionPanel(
      catalog,
      'Free',
      ['On canvas A', 'Free B'],
      new Set(),
      'only_on_canvas',
      false,
    );
    expect(out.map((x) => x.name)).toEqual(['Free B']);
  });

  it('STORY-206: only_on_canvas with no names on canvas yields empty', () => {
    const out = filterProductsForSelectionPanel(catalog, '', [], new Set(), 'only_on_canvas', false);
    expect(out).toHaveLength(0);
  });

  it('with namesOnCanvas undefined, legacyShowOnlyUnused uses panel selectedNames', () => {
    const out = filterProductsForSelectionPanel(
      catalog,
      '',
      undefined,
      new Set(['Free B']),
      null,
      true,
    );
    expect(out.map((x) => x.name)).toEqual(['On canvas A', 'Free C']);
  });

  it('applies search then not_on_canvas', () => {
    const out = filterProductsForSelectionPanel(
      catalog,
      'Free',
      ['On canvas A'],
      new Set(),
      'not_on_canvas',
      false,
    );
    expect(out.map((x) => x.name)).toEqual(['Free B', 'Free C']);
  });

  it('matches search on brand', () => {
    const withBrand = [
      ...catalog,
      p({ name: 'X', brand: 'Teracell' }),
    ];
    const out = filterProductsForSelectionPanel(withBrand, 'teracell', undefined, new Set(), null, false);
    expect(out.map((x) => x.name)).toEqual(['X']);
  });

  it('STORY-181: uses MiniSearch index when provided (aligned with Add Products)', () => {
    const rows = [
      p({ name: 'Kućni punjač Teracell Evolution' }),
      p({ name: 'Unrelated mouse' }),
    ];
    const idx = buildSearchIndex(rows);
    const out = filterProductsForSelectionPanel(rows, 'teracell', undefined, new Set(), null, false, {
      catalogSearchIndex: idx,
      searchSource: 'manual',
    });
    expect(out.length).toBe(1);
    expect(out[0]!.name).toContain('Teracell');
  });

  it('when canvas scope is all, does not exclude by canvas', () => {
    const out = filterProductsForSelectionPanel(
      catalog,
      '',
      ['On canvas A'],
      new Set(),
      'all',
      false,
    );
    expect(out).toHaveLength(3);
  });
});

describe('filterCatalogBySearchQuery / filterImportedCatalogByActiveSearch (STORY-193)', () => {
  it('filterImportedCatalogByActiveSearch returns full list when search is empty', () => {
    const rows = [p({ name: 'A' }), p({ name: 'B' })];
    expect(filterImportedCatalogByActiveSearch(rows, '')).toEqual(rows);
    expect(filterImportedCatalogByActiveSearch(rows, '   ')).toEqual(rows);
  });

  it('filterImportedCatalogByActiveSearch narrows imported rows to search (MiniSearch)', () => {
    const rows = [p({ name: 'Teracell Kućni punjač' }), p({ name: 'Random mouse' })];
    const out = filterImportedCatalogByActiveSearch(rows, 'teracell');
    expect(out.map((x) => x.name)).toEqual(['Teracell Kućni punjač']);
  });

  it('filterCatalogBySearchQuery without index uses substring fields', () => {
    const rows = [p({ name: 'X', brand: 'Acme' })];
    expect(filterCatalogBySearchQuery(rows, 'acme', {}).map((x) => x.name)).toEqual(['X']);
  });

  it('STORY-209: filterCatalogIndicesBySearchQuery matches filterCatalogBySearchQuery products', () => {
    const rows = [
      p({ name: 'Kućni punjač Teracell Evolution' }),
      p({ name: 'Unrelated mouse' }),
    ];
    const idx = buildSearchIndex(rows);
    const opts = { catalogSearchIndex: idx, searchSource: 'manual' as const };
    const q = 'teracell';
    const products = filterCatalogBySearchQuery(rows, q, opts);
    const indices = filterCatalogIndicesBySearchQuery(rows, q, opts);
    expect(indices.map((i) => rows[i]!)).toEqual(products);
  });

  it('STORY-209: empty search returns full index range in catalog order', () => {
    const rows = [p({ name: 'A' }), p({ name: 'B' })];
    const idx = buildSearchIndex(rows);
    expect(filterCatalogIndicesBySearchQuery(rows, '', { catalogSearchIndex: idx })).toEqual([0, 1]);
  });

  it('STORY-196: exclude rule in localStorage removes product for exact query (MiniSearch path)', () => {
    localStorage.removeItem(SEARCH_RULES_STORAGE_KEY);
    const rows = [p({ name: 'Product A', code: 'SKU-A' }), p({ name: 'Product B', code: 'SKU-B' })];
    const idx = buildSearchIndex(rows);
    localStorage.setItem(
      SEARCH_RULES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 't1',
          queryPattern: 'product',
          productKey: 'SKU-B',
          action: 'exclude',
          createdAt: 1,
        },
      ]),
    );
    const out = filterCatalogBySearchQuery(rows, 'product', { catalogSearchIndex: idx });
    expect(out.map((x) => x.code)).toEqual(['SKU-A']);
    localStorage.removeItem(SEARCH_RULES_STORAGE_KEY);
  });
});

describe('remainingCatalogForNewAd', () => {
  const catalog = [p({ name: 'A' }), p({ name: 'B' })];

  it('excludes names on canvas when namesOnCanvas is provided', () => {
    const rem = remainingCatalogForNewAd(catalog, ['A'], new Set());
    expect(rem.map((x) => x.name)).toEqual(['B']);
  });

  it('uses panel selection when namesOnCanvas is undefined', () => {
    const rem = remainingCatalogForNewAd(catalog, undefined, new Set(['A']));
    expect(rem.map((x) => x.name)).toEqual(['B']);
  });
});
