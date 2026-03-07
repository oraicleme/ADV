import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProductImages,
  getProductImageUrl,
  isMobilelandImageEnabled,
  parseImageUrlsFromProductPage,
} from './mobileland-images';

describe('parseImageUrlsFromProductPage', () => {
  const base = 'https://mobileland.me';

  it('extracts og:image when present', () => {
    const html = `<meta property="og:image" content="https://mobileland.me/media/catalog/product/x/y/xy.jpg" />`;
    expect(parseImageUrlsFromProductPage(html, base)).toEqual([
      'https://mobileland.me/media/catalog/product/x/y/xy.jpg',
    ]);
  });

  it('extracts twitter:image when og:image is missing', () => {
    const html = `<meta name="twitter:image" content="https://example.com/img.png" />`;
    expect(parseImageUrlsFromProductPage(html, base)).toEqual(['https://example.com/img.png']);
  });

  it('prefers og:image over twitter:image', () => {
    const html = `
      <meta property="og:image" content="https://a.com/og.jpg" />
      <meta name="twitter:image" content="https://b.com/tw.jpg" />
    `;
    expect(parseImageUrlsFromProductPage(html, base)).toEqual(['https://a.com/og.jpg']);
  });

  it('falls back to first img src when no meta image', () => {
    const html = `<div><img src="/media/product.jpg" alt="Product" /></div>`;
    expect(parseImageUrlsFromProductPage(html, base)).toEqual([
      'https://mobileland.me/media/product.jpg',
    ]);
  });

  it('makes protocol-relative img src absolute', () => {
    const html = `<img src="//cdn.mobileland.me/x.jpg" />`;
    expect(parseImageUrlsFromProductPage(html, base)).toEqual(['https://cdn.mobileland.me/x.jpg']);
  });

  it('returns empty array for empty or non-matching html', () => {
    expect(parseImageUrlsFromProductPage('', base)).toEqual([]);
    expect(parseImageUrlsFromProductPage('<div>No images</div>', base)).toEqual([]);
  });
});

describe('getProductImages', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns empty array when code is empty', async () => {
    expect(await getProductImages('')).toEqual([]);
    expect(await getProductImages('   ')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns empty array when base URL is not configured', async () => {
    const origEnv = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        '';
      expect(await getProductImages('1062776')).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        origEnv;
    }
  });

  it('returns image URL when fetch returns HTML with og:image', async () => {
    const origEnv = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        'https://mobileland.me';
      const html = `<meta property="og:image" content="https://mobileland.me/media/x.jpg" />`;
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(html),
      } as Response);

      const urls = await getProductImages('1062776');
      expect(urls).toEqual(['https://mobileland.me/media/x.jpg']);
      expect(fetch).toHaveBeenCalledWith(
        'https://mobileland.me/1062776.html',
        expect.objectContaining({ method: 'GET' }),
      );
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        origEnv;
    }
  });

  it('returns empty array when response is not ok', async () => {
    const origEnv = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        'https://mobileland.me';
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
      expect(await getProductImages('1062776')).toEqual([]);
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        origEnv;
    }
  });

  it('returns empty array when fetch throws', async () => {
    const origEnv = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        'https://mobileland.me';
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      expect(await getProductImages('1062776')).toEqual([]);
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        origEnv;
    }
  });
});

describe('getProductImageUrl', () => {
  it('returns first URL from getProductImages', async () => {
    const origEnv = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        'https://mobileland.me';
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<meta property="og:image" content="https://mobileland.me/first.jpg" />',
          ),
      } as Response);
      expect(await getProductImageUrl('1062776')).toBe('https://mobileland.me/first.jpg');
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        origEnv;
    }
  });

  it('returns undefined when no images', async () => {
    expect(await getProductImageUrl('')).toBeUndefined();
  });
});

describe('isMobilelandImageEnabled', () => {
  it('returns false when PUBLIC_MOBILELAND_IMAGE_BASE is not set', () => {
    const orig = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE;
    try {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        '';
      expect(isMobilelandImageEnabled()).toBe(false);
    } finally {
      (import.meta.env as { PUBLIC_MOBILELAND_IMAGE_BASE?: string }).PUBLIC_MOBILELAND_IMAGE_BASE =
        orig;
    }
  });
});
