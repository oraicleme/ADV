import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isMobilelandImageEnabled,
  getMobilelandMapFromLocalStorage,
  getMobilelandMapTimestamp,
  saveMobilelandMapToLocalStorage,
  fetchMobilelandImageMap,
  getProductImageUrl,
} from './mobileland-images';

const LS_KEY = 'mobileland_image_map_v1';

describe('isMobilelandImageEnabled', () => {
  it('returns false when VITE_MOBILELAND_ENABLED is not set', () => {
    const orig = import.meta.env.VITE_MOBILELAND_ENABLED;
    try {
      (import.meta.env as Record<string, string>).VITE_MOBILELAND_ENABLED = '';
      expect(isMobilelandImageEnabled()).toBe(false);
    } finally {
      (import.meta.env as Record<string, string>).VITE_MOBILELAND_ENABLED = orig ?? '';
    }
  });

  it('returns true when VITE_MOBILELAND_ENABLED is "1"', () => {
    const orig = import.meta.env.VITE_MOBILELAND_ENABLED;
    try {
      (import.meta.env as Record<string, string>).VITE_MOBILELAND_ENABLED = '1';
      expect(isMobilelandImageEnabled()).toBe(true);
    } finally {
      (import.meta.env as Record<string, string>).VITE_MOBILELAND_ENABLED = orig ?? '';
    }
  });
});

describe('localStorage cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getMobilelandMapFromLocalStorage returns undefined when empty', () => {
    expect(getMobilelandMapFromLocalStorage()).toBeUndefined();
  });

  it('saveMobilelandMapToLocalStorage persists data and getMobilelandMapFromLocalStorage reads it back', () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 1200; i++) {
      map[`SKU-${i}`] = `https://mobileland.me/media/catalog/product/img-${i}.jpg`;
    }
    saveMobilelandMapToLocalStorage(map);
    const result = getMobilelandMapFromLocalStorage();
    expect(result).toBeDefined();
    expect(result?.['SKU-0']).toBe('https://mobileland.me/media/catalog/product/img-0.jpg');
    expect(Object.keys(result ?? {}).length).toBe(1200);
  });

  it('getMobilelandMapFromLocalStorage returns undefined for small cache (<1000 entries)', () => {
    const smallMap: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      smallMap[`SKU-${i}`] = `https://example.com/img-${i}.jpg`;
    }
    saveMobilelandMapToLocalStorage(smallMap);
    expect(getMobilelandMapFromLocalStorage()).toBeUndefined();
  });

  it('getMobilelandMapFromLocalStorage returns undefined for expired cache', () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 1200; i++) {
      map[`SKU-${i}`] = `https://mobileland.me/img-${i}.jpg`;
    }
    const expired = { data: map, savedAt: Date.now() - 25 * 60 * 60 * 1000 };
    localStorage.setItem(LS_KEY, JSON.stringify(expired));
    expect(getMobilelandMapFromLocalStorage()).toBeUndefined();
  });

  it('getMobilelandMapTimestamp returns savedAt for valid cache', () => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 1200; i++) {
      map[`SKU-${i}`] = `https://mobileland.me/img-${i}.jpg`;
    }
    const before = Date.now();
    saveMobilelandMapToLocalStorage(map);
    const ts = getMobilelandMapTimestamp();
    expect(ts).toBeDefined();
    expect(ts!).toBeGreaterThanOrEqual(before);
    expect(ts!).toBeLessThanOrEqual(Date.now());
  });

  it('getMobilelandMapTimestamp returns undefined when no cache', () => {
    expect(getMobilelandMapTimestamp()).toBeUndefined();
  });
});

describe('fetchMobilelandImageMap', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty object when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchMobilelandImageMap();
    expect(result).toEqual({});
  });

  it('returns empty object when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    const result = await fetchMobilelandImageMap();
    expect(result).toEqual({});
  });

  it('returns map from tRPC v11 response (result.data.json)', async () => {
    const map = { '1035914': 'https://mobileland.me/media/catalog/product/1/0/img.jpg' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: { data: { json: map } } }),
    } as Response);
    const result = await fetchMobilelandImageMap();
    expect(result).toEqual(map);
  });

  it('returns map from legacy flat result.data', async () => {
    const map = { '1035914': 'https://mobileland.me/media/catalog/product/1/0/img.jpg' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: { data: map } }),
    } as Response);
    const result = await fetchMobilelandImageMap();
    expect(result).toEqual(map);
  });

  it('returns empty object when tRPC response has no data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
    const result = await fetchMobilelandImageMap();
    expect(result).toEqual({});
  });
});

describe('getProductImageUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined when code is empty', async () => {
    expect(await getProductImageUrl('')).toBeUndefined();
    expect(await getProductImageUrl('   ')).toBeUndefined();
  });

  it('returns image URL from map when code is found', async () => {
    const url = 'https://mobileland.me/media/catalog/product/1/0/img.jpg';
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ result: { data: { json: { '1035914': url } } } }),
    } as Response);
    const result = await getProductImageUrl('1035914');
    expect(result).toBe(url);
  });

  it('returns undefined when code is not in map', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        result: { data: { json: { other: 'https://example.com/x.jpg' } } },
      }),
    } as Response);
    const result = await getProductImageUrl('missing-sku');
    expect(result).toBeUndefined();
  });
});
