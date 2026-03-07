/**
 * Product images from mobileland.me — shared module for web and field app.
 * Given a product identifier (code), fetches image URL(s) from the mobileland.me website.
 * Configure via PUBLIC_MOBILELAND_IMAGE_BASE (e.g. https://mobileland.me).
 */

const DEFAULT_BASE = 'https://mobileland.me';

function getBaseUrl(): string | undefined {
  if (typeof import.meta === 'undefined' || !import.meta.env) return undefined;
  const base = import.meta.env.PUBLIC_MOBILELAND_IMAGE_BASE as string | undefined;
  const trimmed = typeof base === 'string' ? base.trim() : '';
  return trimmed || undefined;
}

/**
 * Whether mobileland image fetching is enabled (base URL configured).
 */
export function isMobilelandImageEnabled(): boolean {
  return !!getBaseUrl();
}

/**
 * Fetch product page HTML and extract image URL(s).
 * Uses og:image when present, otherwise looks for first product image in gallery.
 *
 * @param code - Product identifier (e.g. "1062776" or "t28468")
 * @returns Promise of image URL(s); empty array if disabled, not found, or on error.
 */
export async function getProductImages(code: string): Promise<string[]> {
  const base = getBaseUrl();
  if (!base || !code || !String(code).trim()) return [];

  const productPageUrl = `${base.replace(/\/$/, '')}/${String(code).trim()}.html`;

  let html: string;
  try {
    const res = await fetch(productPageUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  return parseImageUrlsFromProductPage(html, base);
}

/**
 * Parse HTML for og:image or first product image. Exported for tests.
 */
export function parseImageUrlsFromProductPage(html: string, baseUrl: string): string[] {
  const urls: string[] = [];

  // 1. og:image (absolute URL)
  const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogMatch?.[1]) {
    const url = ogMatch[1].trim();
    if (url.startsWith('http')) urls.push(url);
  }

  // 2. twitter:image
  if (urls.length === 0) {
    const twMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twMatch?.[1]) {
      const url = twMatch[1].trim();
      if (url.startsWith('http')) urls.push(url);
    }
  }

  // 3. First img in common product gallery selectors (relative -> absolute)
  if (urls.length === 0) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
      let url = imgMatch[1].trim();
      if (url.startsWith('//')) url = `https:${url}`;
      else if (url.startsWith('/')) url = `${baseUrl.replace(/\/$/, '')}${url}`;
      if (url.startsWith('http')) urls.push(url);
    }
  }

  return urls;
}

/**
 * Get the first product image URL for a code. Convenience for single-image use.
 */
export async function getProductImageUrl(code: string): Promise<string | undefined> {
  const urls = await getProductImages(code);
  return urls[0];
}
