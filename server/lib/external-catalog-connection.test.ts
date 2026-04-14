/**
 * STORY-177: Catalog API test connection — mocked fetch + SSRF guard checks.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { testExternalCatalogConnection } from './external-catalog-connection';

describe('testExternalCatalogConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns preview on HTTP 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('{"hello":1}', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const r = await testExternalCatalogConnection({ baseUrl: 'https://example.com/v1/products' });
    expect(r.ok).toBe(true);
    expect(r.httpStatus).toBe(200);
    expect(r.contentType).toContain('application/json');
    expect(r.bodyPreview).toContain('hello');
  });

  it('reports error on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 401, statusText: 'Unauthorized' })),
    );
    const r = await testExternalCatalogConnection({ baseUrl: 'https://example.com/api' });
    expect(r.ok).toBe(false);
    expect(r.httpStatus).toBe(401);
    expect(r.error).toMatch(/401/);
  });

  it('rejects empty URL', async () => {
    const r = await testExternalCatalogConnection({ baseUrl: '  ' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/required/i);
  });

  it('rejects non-http(s) URL', async () => {
    const r = await testExternalCatalogConnection({ baseUrl: 'ftp://example.com/x' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/http/i);
  });

  it('blocks loopback when not in dev/test', async () => {
    const prev = process.env.NODE_ENV;
    const prevV = process.env.VITEST;
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
    try {
      const r = await testExternalCatalogConnection({ baseUrl: 'http://127.0.0.1/foo' });
      expect(r.ok).toBe(false);
      expect(r.blockedReason).toBe('ssrf');
    } finally {
      process.env.NODE_ENV = prev;
      if (prevV !== undefined) process.env.VITEST = prevV;
    }
  });

  it('sends optional auth header to fetch', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await testExternalCatalogConnection({
      baseUrl: 'https://example.com/api',
      authHeaderName: 'X-Api-Key',
      authHeaderValue: 'secret',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get('X-Api-Key')).toBe('secret');
  });
});
