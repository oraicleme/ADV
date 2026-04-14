/**
 * STORY-178: Paginated JSON catalog fetch + field mapping (internal; called from catalog router).
 */

import { validateCatalogUrlForProxy } from './catalog-url-ssrf';

const FETCH_TIMEOUT_MS = 60_000;
const MAX_JSON_BODY_BYTES = 10 * 1024 * 1024;

export type CatalogSyncProductRow = {
  name: string;
  code?: string;
  category?: string;
  brand?: string;
  price?: string;
  retailPrice?: string;
};

export type CatalogSyncFromApiInput = {
  baseUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
  itemsPath: string;
  paginationMode: 'offset' | 'page';
  offsetParam: string;
  limitParam: string;
  pageParam: string;
  pageSizeParam: string;
  pageSize: number;
  /** First API page number (0 or 1) when paginationMode is `page`. */
  firstPage: number;
  startOffset: number;
  maxPages: number;
  maxProducts: number;
  mapName: string;
  mapCode?: string;
  mapCategory?: string;
  mapBrand?: string;
  mapPrice?: string;
};

export type CatalogSyncFromApiResult = {
  ok: boolean;
  products: CatalogSyncProductRow[];
  pagesFetched: number;
  truncatedByMaxPages?: boolean;
  truncatedByMaxProducts?: boolean;
  error?: string;
  blockedReason?: 'ssrf';
};

export function getNestedValue(obj: unknown, path: string): unknown {
  const p = path.trim();
  if (!p) return obj;
  const parts = p.split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const key of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function getItemsArray(json: unknown, itemsPath: string): unknown[] | null {
  const trimmed = itemsPath.trim();
  if (!trimmed) {
    return Array.isArray(json) ? json : null;
  }
  const v = getNestedValue(json, trimmed);
  return Array.isArray(v) ? v : null;
}

function coerceString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function mapRow(
  row: unknown,
  mapName: string,
  mapCode: string | undefined,
  mapCategory: string | undefined,
  mapBrand: string | undefined,
  mapPrice: string | undefined,
): CatalogSyncProductRow | null {
  if (row === null || typeof row !== 'object') return null;
  const name = coerceString(getNestedValue(row, mapName))?.trim();
  if (!name) return null;
  const out: CatalogSyncProductRow = { name };
  const code = mapCode ? coerceString(getNestedValue(row, mapCode))?.trim() : undefined;
  const category = mapCategory ? coerceString(getNestedValue(row, mapCategory))?.trim() : undefined;
  const brand = mapBrand ? coerceString(getNestedValue(row, mapBrand))?.trim() : undefined;
  const priceRaw = mapPrice ? getNestedValue(row, mapPrice) : undefined;
  const priceStr = priceRaw !== undefined ? coerceString(priceRaw)?.trim() : undefined;
  if (code) out.code = code;
  if (category) out.category = category;
  if (brand) out.brand = brand;
  if (priceStr) {
    out.price = priceStr;
    out.retailPrice = priceStr;
  }
  return out;
}

async function readResponseBodyWithLimit(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) {
        const remaining = maxBytes - total;
        if (remaining <= 0) break;
        const take = Math.min(value.length, remaining);
        chunks.push(value.slice(0, take));
        total += take;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    merged.set(c, o);
    o += c.length;
  }
  return merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength);
}

function buildAuthHeaders(input: CatalogSyncFromApiInput): Headers {
  const headers = new Headers();
  headers.set('Accept', 'application/json, */*;q=0.8');
  const name = input.authHeaderName?.trim();
  const value = input.authHeaderValue ?? '';
  if (name && name.length > 0) {
    headers.set(name, value);
  }
  return headers;
}

function buildPagedUrl(
  baseUrl: string,
  input: CatalogSyncFromApiInput,
  pageIndex: number,
): string {
  const u = new URL(baseUrl);
  if (input.paginationMode === 'offset') {
    const offset = input.startOffset + pageIndex * input.pageSize;
    u.searchParams.set(input.offsetParam, String(offset));
    u.searchParams.set(input.limitParam, String(input.pageSize));
  } else {
    const pageApi = input.firstPage + pageIndex;
    u.searchParams.set(input.pageParam, String(pageApi));
    u.searchParams.set(input.pageSizeParam, String(input.pageSize));
  }
  return u.toString();
}

export async function syncCatalogFromApi(input: CatalogSyncFromApiInput): Promise<CatalogSyncFromApiResult> {
  const raw = input.baseUrl?.trim() ?? '';
  const gate = await validateCatalogUrlForProxy(raw);
  if (!gate.ok) {
    return {
      ok: false,
      products: [],
      pagesFetched: 0,
      error: gate.error,
      blockedReason: gate.blockedReason,
    };
  }

  const products: CatalogSyncProductRow[] = [];
  let pagesFetched = 0;
  let truncatedByMaxPages = false;
  let truncatedByMaxProducts = false;

  for (let pageIndex = 0; pageIndex < input.maxPages; pageIndex++) {
    if (products.length >= input.maxProducts) {
      truncatedByMaxProducts = true;
      break;
    }

    const url = buildPagedUrl(raw, input, pageIndex);
    const gatePage = await validateCatalogUrlForProxy(url);
    if (!gatePage.ok) {
      return {
        ok: false,
        products,
        pagesFetched,
        error: gatePage.error,
        blockedReason: gatePage.blockedReason,
      };
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: buildAuthHeaders(input),
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(t);
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          products,
          pagesFetched,
          error: `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s.`,
        };
      }
      return { ok: false, products, pagesFetched, error: msg || 'Request failed.' };
    }
    clearTimeout(t);

    if (!response.ok) {
      return {
        ok: false,
        products,
        pagesFetched,
        error: `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
      };
    }

    let text: string;
    try {
      const buf = await readResponseBodyWithLimit(response, MAX_JSON_BODY_BYTES);
      text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, products, pagesFetched, error: msg };
    }

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return { ok: false, products, pagesFetched, error: 'Response is not valid JSON.' };
    }

    const items = getItemsArray(json, input.itemsPath);
    if (items === null) {
      return {
        ok: false,
        products,
        pagesFetched,
        error: input.itemsPath.trim()
          ? `No array found at path "${input.itemsPath.trim()}".`
          : 'Root JSON value is not an array — set an items path (e.g. data.items).',
      };
    }

    pagesFetched++;

    if (items.length === 0) {
      break;
    }

    for (const row of items) {
      if (products.length >= input.maxProducts) {
        truncatedByMaxProducts = true;
        break;
      }
      const mapped = mapRow(
        row,
        input.mapName,
        input.mapCode?.trim() || undefined,
        input.mapCategory?.trim() || undefined,
        input.mapBrand?.trim() || undefined,
        input.mapPrice?.trim() || undefined,
      );
      if (mapped) products.push(mapped);
    }

    if (truncatedByMaxProducts) break;

    if (items.length < input.pageSize) {
      break;
    }

    if (pageIndex === input.maxPages - 1 && items.length === input.pageSize) {
      truncatedByMaxPages = true;
    }
  }

  return {
    ok: true,
    products,
    pagesFetched,
    truncatedByMaxPages: truncatedByMaxPages || undefined,
    truncatedByMaxProducts: truncatedByMaxProducts || undefined,
  };
}
