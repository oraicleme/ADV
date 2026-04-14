/**
 * Unit tests for server/lib/mobileland-api.ts
 *
 * Covers:
 *   - percentEncode (RFC 5849 compliance)
 *   - buildOAuthHeader (structure, signature determinism)
 *   - buildImageUrl (URL construction)
 *   - getMobilelandImageMap (pagination, caching, unconfigured fallback)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Module mocking — must come before the dynamic import below
// ---------------------------------------------------------------------------

vi.mock('../_core/env', () => ({
  ENV: {
    mobilelandBaseUrl: 'https://mobileland.me',
    mobilelandConsumerKey: 'test-consumer-key',
    mobilelandConsumerSecret: 'test-consumer-secret',
    mobilelandAccessToken: 'test-access-token',
    mobilelandAccessTokenSecret: 'test-token-secret',
  },
}));

import {
  percentEncode,
  buildOAuthHeader,
  buildImageUrl,
  getMobilelandImageMap,
  fetchFullImageMap,
  clearCache,
} from './mobileland-api';

// ---------------------------------------------------------------------------
// percentEncode
// ---------------------------------------------------------------------------

describe('percentEncode', () => {
  it('encodes spaces as %20', () => {
    expect(percentEncode('hello world')).toBe('hello%20world');
  });

  it('encodes special OAuth characters', () => {
    expect(percentEncode('!')).toBe('%21');
    expect(percentEncode('*')).toBe('%2A');
    expect(percentEncode("'")).toBe('%27');
    expect(percentEncode('(')).toBe('%28');
    expect(percentEncode(')')).toBe('%29');
  });

  it('encodes & and = correctly', () => {
    expect(percentEncode('a&b')).toBe('a%26b');
    expect(percentEncode('a=b')).toBe('a%3Db');
  });

  it('leaves unreserved characters untouched', () => {
    expect(percentEncode('abc123-_.')).toBe('abc123-_.');
  });

  it('encodes brackets used in Magento query params', () => {
    expect(percentEncode('searchCriteria[pageSize]')).toBe('searchCriteria%5BpageSize%5D');
  });
});

// ---------------------------------------------------------------------------
// buildOAuthHeader
// ---------------------------------------------------------------------------

describe('buildOAuthHeader', () => {
  const oauth = {
    consumerKey: 'ck',
    consumerSecret: 'cs',
    token: 'tok',
    tokenSecret: 'ts',
  };

  it('produces an OAuth header starting with "OAuth "', () => {
    const header = buildOAuthHeader('GET', 'https://example.com/api', {}, oauth);
    expect(header).toMatch(/^OAuth /);
  });

  it('includes all required OAuth parameters', () => {
    const header = buildOAuthHeader('GET', 'https://example.com/api', {}, oauth);
    expect(header).toContain('oauth_consumer_key=');
    expect(header).toContain('oauth_token=');
    expect(header).toContain('oauth_signature_method=');
    expect(header).toContain('oauth_timestamp=');
    expect(header).toContain('oauth_nonce=');
    expect(header).toContain('oauth_version=');
    expect(header).toContain('oauth_signature=');
  });

  it('uses HMAC-SHA256 as the signature method', () => {
    const header = buildOAuthHeader('GET', 'https://example.com/api', {}, oauth);
    expect(header).toContain('oauth_signature_method="HMAC-SHA256"');
  });

  it('produces a deterministic signature given fixed timestamp + nonce', () => {
    const params = { foo: 'bar' };
    const h1 = buildOAuthHeader('GET', 'https://example.com/api', params, oauth, '1700000000', 'abc123');
    const h2 = buildOAuthHeader('GET', 'https://example.com/api', params, oauth, '1700000000', 'abc123');
    expect(h1).toBe(h2);
  });

  it('produces a different signature for different query params', () => {
    const h1 = buildOAuthHeader('GET', 'https://example.com/api', { a: '1' }, oauth, '1700000000', 'abc');
    const h2 = buildOAuthHeader('GET', 'https://example.com/api', { a: '2' }, oauth, '1700000000', 'abc');
    expect(h1).not.toBe(h2);
  });

  it('produces a verifiable HMAC-SHA256 signature', () => {
    // Manually compute the expected signature to cross-check
    const method = 'GET';
    const url = 'https://example.com/api';
    const queryParams = { 'searchCriteria[pageSize]': '100' };
    const ts = '1700000000';
    const nonce = 'testnonce';

    const header = buildOAuthHeader(method, url, queryParams, oauth, ts, nonce);

    // Extract the signature from the header
    const sigMatch = header.match(/oauth_signature="([^"]+)"/);
    expect(sigMatch).toBeTruthy();
    const decodedSig = decodeURIComponent(sigMatch![1]);

    // Rebuild expected signature manually
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: oauth.consumerKey,
      oauth_token: oauth.token,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: ts,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };
    const allParams = { ...oauthParams, ...queryParams };
    const paramString = Object.keys(allParams)
      .sort()
      .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
      .join('&');
    const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
    const signingKey = `${percentEncode(oauth.consumerSecret)}&${percentEncode(oauth.tokenSecret)}`;
    const expectedSig = crypto
      .createHmac('sha256', signingKey)
      .update(signatureBase)
      .digest('base64');

    expect(decodedSig).toBe(expectedSig);
  });
});

// ---------------------------------------------------------------------------
// buildImageUrl
// ---------------------------------------------------------------------------

describe('buildImageUrl', () => {
  it('constructs a full image URL from a media file path', () => {
    expect(buildImageUrl('https://mobileland.me', '/1/0/1035914_21404_.jpg')).toBe(
      'https://mobileland.me/media/catalog/product/1/0/1035914_21404_.jpg',
    );
  });

  it('handles trailing slash on base URL', () => {
    expect(buildImageUrl('https://mobileland.me/', '/1/0/img.jpg')).toBe(
      'https://mobileland.me/media/catalog/product/1/0/img.jpg',
    );
  });

  it('handles file path without leading slash', () => {
    expect(buildImageUrl('https://mobileland.me', '1/0/img.jpg')).toBe(
      'https://mobileland.me/media/catalog/product/1/0/img.jpg',
    );
  });

  it('STORY-155: passes through absolute http(s) URLs unchanged', () => {
    const u = 'https://mobileland.me/media/catalog/product/k/u/foo.jpg';
    expect(buildImageUrl('https://mobileland.me', u)).toBe(u);
  });

  it('STORY-155: normalizes protocol-relative URLs', () => {
    expect(buildImageUrl('https://mobileland.me', '//mobileland.me/media/catalog/product/x.jpg')).toBe(
      'https://mobileland.me/media/catalog/product/x.jpg',
    );
  });

  it('STORY-155: strips duplicate media/catalog prefix from site-relative paths', () => {
    expect(
      buildImageUrl('https://mobileland.me', '/media/catalog/product/t/e/teracell.jpg'),
    ).toBe('https://mobileland.me/media/catalog/product/t/e/teracell.jpg');
    expect(
      buildImageUrl('https://mobileland.me', 'media/catalog/product/t/e/teracell.jpg'),
    ).toBe('https://mobileland.me/media/catalog/product/t/e/teracell.jpg');
  });
});

// ---------------------------------------------------------------------------
// fetchFullImageMap — paginated fetch + cache population
// getMobilelandImageMap — synchronous cache reader
// ---------------------------------------------------------------------------

describe('fetchFullImageMap / getMobilelandImageMap', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchFullImageMap: returns a SKU → image URL map from a single-page response', async () => {
    const mockResponse = {
      items: [
        { sku: '1035914', media_gallery_entries: [{ file: '/1/0/img1.jpg' }] },
        { sku: '2034512', media_gallery_entries: [{ file: '/2/0/img2.jpg' }] },
      ],
      total_count: 2,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();

    expect(map['1035914']).toBe('https://mobileland.me/media/catalog/product/1/0/img1.jpg');
    expect(map['2034512']).toBe('https://mobileland.me/media/catalog/product/2/0/img2.jpg');
  });

  it('getMobilelandImageMap: returns {} before cache is warm (synchronous)', () => {
    // No fetch mocked — cache is empty → synchronous read returns {}
    expect(getMobilelandImageMap()).toEqual({});
  });

  it('getMobilelandImageMap: returns populated cache after fetchFullImageMap', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [{ sku: 'sync-sku', media_gallery_entries: [{ file: '/s.jpg' }] }],
        total_count: 1,
      }),
    }));

    await fetchFullImageMap();

    // Synchronous getter now returns the warm cache
    const map = getMobilelandImageMap();
    expect(map['sync-sku']).toBe('https://mobileland.me/media/catalog/product/s.jpg');
  });

  it('paginates when total_count > pageSize (PAGE_SIZE=500)', async () => {
    const page1 = {
      items: Array.from({ length: 500 }, (_, i) => ({
        sku: `sku-${i}`,
        media_gallery_entries: [{ file: `/img/${i}.jpg` }],
      })),
      total_count: 750,
    };
    const page2 = {
      items: Array.from({ length: 250 }, (_, i) => ({
        sku: `sku-${500 + i}`,
        media_gallery_entries: [{ file: `/img/${500 + i}.jpg` }],
      })),
      total_count: 750,
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

    vi.stubGlobal('fetch', fetchMock);

    const map = await fetchFullImageMap();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Object.keys(map)).toHaveLength(750);
    expect(map['sku-0']).toBe('https://mobileland.me/media/catalog/product/img/0.jpg');
    expect(map['sku-500']).toBe('https://mobileland.me/media/catalog/product/img/500.jpg');
  });

  it('retries on 503 and succeeds on second attempt', async () => {
    const goodResponse = {
      ok: true,
      json: () => Promise.resolve({
        items: [{ sku: 'retry-sku', media_gallery_entries: [{ file: '/r.jpg' }] }],
        total_count: 1,
      }),
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('Backend fetch failed') })
      .mockResolvedValueOnce(goodResponse);

    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const mapPromise = fetchFullImageMap();
    await vi.runAllTimersAsync();
    const map = await mapPromise;

    vi.useRealTimers();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(map['retry-sku']).toBe('https://mobileland.me/media/catalog/product/r.jpg');
  });

  it('deduplicates concurrent fetch calls — only one fetch runs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [{ sku: 'abc', media_gallery_entries: [{ file: '/a.jpg' }] }], total_count: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Two concurrent calls share the same in-flight fetch
    const [map1, map2] = await Promise.all([fetchFullImageMap(), fetchFullImageMap()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(map1['abc']).toBeDefined();
    expect(map2['abc']).toBeDefined();
  });

  it('refetches after the cache has expired', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total_count: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchFullImageMap();

    vi.useFakeTimers();
    vi.advanceTimersByTime(6 * 60 * 1000);
    clearCache();

    await fetchFullImageMap();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('skips products with no gallery and no image attributes', async () => {
    const mockResponse = {
      items: [
        { sku: 'no-image', media_gallery_entries: [] },
        {
          sku: 'placeholder-only',
          media_gallery_entries: [],
          custom_attributes: [{ attribute_code: 'image', value: 'no_selection' }],
        },
        { sku: 'has-gallery', media_gallery_entries: [{ file: '/img.jpg' }] },
      ],
      total_count: 3,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();
    expect(map['no-image']).toBeUndefined();
    expect(map['placeholder-only']).toBeUndefined();
    expect(map['has-gallery']).toBeDefined();
  });

  it('uses custom_attributes image when media gallery is empty', async () => {
    const mockResponse = {
      items: [
        {
          sku: 'attr-only',
          media_gallery_entries: [],
          custom_attributes: [
            { attribute_code: 'description', value: 'x' },
            { attribute_code: 'image', value: '/k/u/product.jpg' },
          ],
        },
      ],
      total_count: 1,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();
    expect(map['attr-only']).toBe(
      'https://mobileland.me/media/catalog/product/k/u/product.jpg',
    );
  });

  it('STORY-156: indexes by sku, Magento entity id, and url_key when distinct', async () => {
    const mockResponse = {
      items: [
        {
          id: 9667,
          sku: '1052510',
          media_gallery_entries: [{ file: '/t/c/tc06.jpg' }],
          custom_attributes: [{ attribute_code: 'url_key', value: 'teracell-tc-bez-kabla' }],
        },
      ],
      total_count: 1,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();
    const expected = 'https://mobileland.me/media/catalog/product/t/c/tc06.jpg';
    expect(map['1052510']).toBe(expected);
    expect(map['9667']).toBe(expected);
    expect(map['teracell-tc-bez-kabla']).toBe(expected);
  });

  it('STORY-156: does not duplicate url_key when equal to sku', async () => {
    const mockResponse = {
      items: [
        {
          id: 42,
          sku: '1035914',
          media_gallery_entries: [{ file: '/1/0/x.jpg' }],
          custom_attributes: [{ attribute_code: 'url_key', value: '1035914' }],
        },
      ],
      total_count: 1,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();
    expect(Object.keys(map).sort()).toEqual(['1035914', '42']);
  });

  it('prefers gallery file over custom_attributes image', async () => {
    const mockResponse = {
      items: [
        {
          sku: 'both',
          media_gallery_entries: [{ file: '/from/gallery.jpg' }],
          custom_attributes: [{ attribute_code: 'image', value: '/from/attr.jpg' }],
        },
      ],
      total_count: 1,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const map = await fetchFullImageMap();
    expect(map['both']).toBe(
      'https://mobileland.me/media/catalog/product/from/gallery.jpg',
    );
  });

  it('throws on API error (graceful degradation via tRPC handler catch)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Unauthorized'),
    }));

    await expect(fetchFullImageMap()).rejects.toThrow('401');
    // Synchronous getter still returns {} safely
    expect(getMobilelandImageMap()).toEqual({});
  });
});
