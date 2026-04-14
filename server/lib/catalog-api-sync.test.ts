/**
 * STORY-178: Catalog API sync — mapping helpers + mocked fetch pagination.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getNestedValue, getItemsArray, syncCatalogFromApi } from './catalog-api-sync';

describe('getNestedValue / getItemsArray', () => {
  it('reads dot paths', () => {
    expect(getNestedValue({ a: { b: { c: 2 } } }, 'a.b.c')).toBe(2);
    expect(getNestedValue({ x: 1 }, '')).toEqual({ x: 1 });
  });

  it('resolves items array by path', () => {
    const j = { data: { products: [{ name: 'N' }] } };
    expect(getItemsArray(j, 'data.products')).toEqual([{ name: 'N' }]);
    expect(getItemsArray([{ name: 'R' }], '')).toEqual([{ name: 'R' }]);
    expect(getItemsArray({ not: 1 }, 'missing')).toBeNull();
  });
});

describe('syncCatalogFromApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseInput = {
    baseUrl: 'https://example.com/api',
    itemsPath: 'items',
    paginationMode: 'offset' as const,
    offsetParam: 'offset',
    limitParam: 'limit',
    pageParam: 'page',
    pageSizeParam: 'limit',
    pageSize: 100,
    firstPage: 0,
    startOffset: 0,
    maxPages: 5,
    maxProducts: 1000,
    mapName: 'name',
    mapCode: 'code',
  };

  it('returns products on single page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ items: [{ name: 'A', code: '1' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const r = await syncCatalogFromApi(baseInput);
    expect(r.ok).toBe(true);
    expect(r.products).toHaveLength(1);
    expect(r.products[0]?.name).toBe('A');
    expect(r.pagesFetched).toBe(1);
  });

  it('fetches next page when first page is full', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls++;
        const u = new URL(url);
        const offset = Number(u.searchParams.get('offset') ?? '0');
        if (offset === 0) {
          return new Response(JSON.stringify({ items: [{ name: 'A' }, { name: 'B' }] }), { status: 200 });
        }
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }),
    );
    const r = await syncCatalogFromApi({
      ...baseInput,
      pageSize: 2,
      maxPages: 10,
    });
    expect(r.ok).toBe(true);
    expect(r.products.map((p) => p.name)).toEqual(['A', 'B']);
    expect(calls).toBe(2);
  });

  it('blocks loopback in production', async () => {
    const prev = process.env.NODE_ENV;
    const prevV = process.env.VITEST;
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
    try {
      const r = await syncCatalogFromApi({
        ...baseInput,
        baseUrl: 'http://127.0.0.1/foo',
      });
      expect(r.ok).toBe(false);
      expect(r.blockedReason).toBe('ssrf');
    } finally {
      process.env.NODE_ENV = prev;
      if (prevV !== undefined) process.env.VITEST = prevV;
    }
  });
});
