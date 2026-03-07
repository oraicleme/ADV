/**
 * Extension point for product sources: Excel, paste, URL JSON, future catalog APIs.
 */
import type { ProductItem } from './ad-templates';

export interface ProductSourceAdapter {
  id: string;
  label: string;
  load(params: unknown): Promise<ProductItem[]>;
}

/**
 * Normalise a raw object from an API into ProductItem (allow extra fields).
 */
export function normaliseProductItem(raw: Record<string, unknown>): ProductItem {
  const name = String(raw.name ?? raw.title ?? raw.productName ?? '').trim();
  const code = raw.code != null ? String(raw.code).trim() || undefined : undefined;
  const price = raw.price != null ? String(raw.price).trim() || undefined : undefined;
  const retailPrice =
    raw.retailPrice != null ? String(raw.retailPrice).trim() || undefined : price;
  const wholesalePrice =
    raw.wholesalePrice != null ? String(raw.wholesalePrice).trim() || undefined : undefined;
  const category =
    raw.category != null ? String(raw.category).trim() || undefined : undefined;
  const brand = raw.brand != null ? String(raw.brand).trim() || undefined : undefined;
  const currency =
    raw.currency != null ? String(raw.currency).trim() || undefined : undefined;

  const classifications: Record<string, string> = {};
  if (raw.classifications && typeof raw.classifications === 'object' && !Array.isArray(raw.classifications)) {
    for (const [k, v] of Object.entries(raw.classifications)) {
      if (v != null && String(v).trim()) classifications[k] = String(v).trim();
    }
  }

  return {
    name: name || (code ?? ''),
    code,
    price,
    retailPrice: retailPrice ?? price,
    wholesalePrice,
    currency,
    category,
    brand,
    classifications: Object.keys(classifications).length ? classifications : undefined,
  };
}

/**
 * Adapter that fetches a JSON array from a URL and normalises to ProductItem[].
 */
export class UrlJsonAdapter implements ProductSourceAdapter {
  id = 'url-json';
  label = 'Load from URL';

  async load(params: unknown): Promise<ProductItem[]> {
    const url = typeof params === 'string' ? params : (params as { url?: string })?.url;
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required');
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    let arr: unknown[];
    if (Array.isArray(data)) {
      arr = data;
    } else if (Array.isArray(data?.products)) {
      arr = data.products;
    } else if (Array.isArray(data?.items)) {
      arr = data.items;
    } else {
      throw new Error('Response is not an array of products');
    }
    return arr
      .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
      .map((item) => normaliseProductItem(item as Record<string, unknown>));
  }
}
