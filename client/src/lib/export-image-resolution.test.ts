/**
 * STORY-143: Tests for resolving image URLs to data URIs before export.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveImagesInHtml,
  resolveImagesInElement,
} from './export-image-resolution';

describe('export-image-resolution', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('resolveImagesInHtml', () => {
    it('returns HTML unchanged when no http(s) img src', async () => {
      const html = '<div><img src="data:image/png;base64,abc" /></div>';
      const out = await resolveImagesInHtml(html);
      expect(out).toBe(html);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('replaces http img src with data URI when fetch returns image', async () => {
      const blob = new Blob([new Uint8Array(1)], { type: 'image/png' });
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      } as Response);

      const html =
        '<body><img alt="P" src="https://example.com/photo.png" /></body>';
      const out = await resolveImagesInHtml(html);

      expect(out).not.toContain('https://example.com/photo.png');
      expect(out).toMatch(/src="data:image\/png;base64,/);
      expect(fetch).toHaveBeenCalledWith('https://example.com/photo.png', {
        mode: 'cors',
      });
    });

    it('replaces http img src with placeholder when fetch fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const html =
        '<body><img alt="X" src="https://example.com/bad.jpg" /></body>';
      const out = await resolveImagesInHtml(html);

      expect(out).not.toContain('https://example.com/bad.jpg');
      expect(out).toContain('No image');
      expect(out).toMatch(/src="data:image\/svg\+xml,/);
    });

    it('uses proxy when direct fetch fails (CORS) and proxy returns image', async () => {
      const blob = new Blob([new Uint8Array(1)], { type: 'image/jpeg' });
      const proxyResponse = {
        ok: true,
        blob: () => Promise.resolve(blob),
      } as Response;
      vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        return Promise.resolve(
          url.includes('/api/image-proxy?') ? proxyResponse : { ok: false }
        );
      });

      const html =
        '<body><img src="https://mobileland.me/media/catalog/product/1.jpg" /></body>';
      const out = await resolveImagesInHtml(html);

      expect(out).toMatch(/src="data:image\/jpeg;base64,/);
      expect(vi.mocked(fetch).mock.calls.some((c) => String(c[0]).includes('image-proxy'))).toBe(true);
    });

    it('replaces http img src with placeholder when response not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

      const html = '<img src="https://example.com/404.png" />';
      const out = await resolveImagesInHtml(html);

      expect(out).not.toContain('https://example.com/404.png');
      expect(out).toContain('No image');
    });

    it('resolves multiple same URL once (deduped)', async () => {
      const blob = new Blob([new Uint8Array(1)], { type: 'image/jpeg' });
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      } as Response);

      const html =
        '<div><img src="https://a.com/1.jpg" /><img src="https://a.com/1.jpg" /></div>';
      const out = await resolveImagesInHtml(html);

      expect(vi.mocked(fetch).mock.calls.length).toBe(1);
      expect(out).toMatch(/data:image\/jpeg;base64,/g);
    });
  });

  describe('resolveImagesInElement', () => {
    it('leaves element unchanged when no http img src', async () => {
      const div = document.createElement('div');
      div.innerHTML = '<img src="data:image/png;base64,xyz" />';
      const img = div.querySelector('img')!;
      await resolveImagesInElement(div);
      expect(img.getAttribute('src')).toBe('data:image/png;base64,xyz');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('replaces http img src in element when fetch succeeds', async () => {
      const blob = new Blob([new Uint8Array(1)], { type: 'image/png' });
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      } as Response);

      const div = document.createElement('div');
      div.innerHTML = '<img src="https://cdn.example/product.png" alt="P" />';
      const img = div.querySelector('img')!;
      await resolveImagesInElement(div);

      expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
      expect(fetch).toHaveBeenCalledWith(
        'https://cdn.example/product.png',
        expect.any(Object),
      );
    });

    it('replaces http img src with placeholder when fetch fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('CORS'));

      const div = document.createElement('div');
      div.innerHTML = '<img src="https://other.com/img.jpg" />';
      const img = div.querySelector('img')!;
      await resolveImagesInElement(div);

      expect(img.getAttribute('src')).toMatch(/data:image\/svg\+xml,/);
      expect(img.getAttribute('src')).toContain('No image');
    });
  });
});
