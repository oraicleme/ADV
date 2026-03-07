import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchImages, setProvider } from './image-search';
import { MockImageSearchProvider } from './image-search-providers/mock-provider';
import type { ImageSearchProvider, ImageSearchResult } from './image-search-providers/types';

beforeEach(() => {
  setProvider(null);
});

describe('searchImages', () => {
  it('returns results for known brand (samsung)', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('Samsung Galaxy S24');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toBe('mock');
    expect(results[0].url).toContain('http');
  });

  it('returns results for known brand (iphone)', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('Apple iPhone 16 Pro');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].description.toLowerCase()).toContain('iphone');
  });

  it('returns empty array for unknown product', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('Zxyqfoo Imaginary Widget 3000');
    expect(results).toEqual([]);
  });

  it('returns empty array for empty query', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('');
    expect(results).toEqual([]);
  });

  it('returns empty array for whitespace-only query', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('   ');
    expect(results).toEqual([]);
  });

  it('respects the limit parameter', async () => {
    setProvider(new MockImageSearchProvider());
    const results = await searchImages('Samsung Galaxy', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('uses a custom provider when set', async () => {
    const customResult: ImageSearchResult = {
      id: 'custom-1',
      url: 'https://custom.example.com/image.jpg',
      thumbnailUrl: 'https://custom.example.com/thumb.jpg',
      description: 'Custom result',
      source: 'mock',
      width: 400,
      height: 300,
    };

    const customProvider: ImageSearchProvider = {
      search: vi.fn().mockResolvedValue([customResult]),
    };

    setProvider(customProvider);
    const results = await searchImages('anything');
    expect(results).toEqual([customResult]);
    expect(customProvider.search).toHaveBeenCalledWith('anything', 3);
  });
});

describe('MockImageSearchProvider', () => {
  const provider = new MockImageSearchProvider();

  it('matches case-insensitively', async () => {
    const results = await provider.search('SAMSUNG');
    expect(results.length).toBeGreaterThan(0);
  });

  it('matches partial product names', async () => {
    const results = await provider.search('Nike Air Max 90');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toContain('nike');
  });

  it('returns valid ImageSearchResult shape', async () => {
    const results = await provider.search('laptop');
    expect(results.length).toBeGreaterThan(0);
    const r = results[0];
    expect(r).toHaveProperty('id');
    expect(r).toHaveProperty('url');
    expect(r).toHaveProperty('thumbnailUrl');
    expect(r).toHaveProperty('description');
    expect(r).toHaveProperty('source');
    expect(r).toHaveProperty('width');
    expect(r).toHaveProperty('height');
  });
});
