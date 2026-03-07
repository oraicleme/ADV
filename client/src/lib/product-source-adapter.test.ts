import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UrlJsonAdapter,
  normaliseProductItem,
  type ProductSourceAdapter,
} from './product-source-adapter';

describe('normaliseProductItem', () => {
  it('maps name/code/price to ProductItem', () => {
    const raw = { name: 'Widget', code: 'W1', price: '99.99' };
    const out = normaliseProductItem(raw);
    expect(out.name).toBe('Widget');
    expect(out.code).toBe('W1');
    expect(out.price).toBe('99.99');
    expect(out.retailPrice).toBe('99.99');
  });

  it('uses title or productName when name missing', () => {
    expect(normaliseProductItem({ title: 'A' }).name).toBe('A');
    expect(normaliseProductItem({ productName: 'B' }).name).toBe('B');
  });

  it('includes category and brand', () => {
    const out = normaliseProductItem({
      name: 'X',
      category: 'Electronics',
      brand: 'Samsung',
    });
    expect(out.category).toBe('Electronics');
    expect(out.brand).toBe('Samsung');
  });

  it('includes classifications object when provided', () => {
    const out = normaliseProductItem({
      name: 'X',
      classifications: { region: 'EU', channel: 'B2B' },
    });
    expect(out.classifications).toEqual({ region: 'EU', channel: 'B2B' });
  });
});

describe('UrlJsonAdapter', () => {
  const adapter: ProductSourceAdapter = new UrlJsonAdapter();

  it('has id and label', () => {
    expect(adapter.id).toBe('url-json');
    expect(adapter.label).toBe('Load from URL');
  });

  it('throws when url missing', async () => {
    await expect(adapter.load({})).rejects.toThrow('URL is required');
    await expect(adapter.load(null)).rejects.toThrow('URL is required');
  });

  it('fetches and returns ProductItem[] from JSON array', async () => {
    const products = [
      { name: 'Product A', code: 'A1', price: '100' },
      { name: 'Product B', category: 'Food', brand: 'Acme' },
    ];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(products),
    });

    const result = await adapter.load({ url: 'https://example.com/products.json' });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Product A');
    expect(result[0].code).toBe('A1');
    expect(result[0].retailPrice).toBe('100');
    expect(result[1].name).toBe('Product B');
    expect(result[1].category).toBe('Food');
    expect(result[1].brand).toBe('Acme');
  });

  it('accepts string url', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: 'Only' }]),
    });
    const result = await adapter.load('https://api.example.com/items');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Only');
  });

  it('handles envelope formats (products or items)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: [{ name: 'Envelope' }] }),
    });
    const result = await adapter.load({ url: 'https://example.com/api' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Envelope');
  });

  it('throws on HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    await expect(
      adapter.load({ url: 'https://example.com/missing' }),
    ).rejects.toThrow(/404|Failed to load/);
  });

  it('throws when response is not an array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ foo: 'bar' }),
    });
    await expect(
      adapter.load({ url: 'https://example.com/bad' }),
    ).rejects.toThrow('not an array');
  });
});
