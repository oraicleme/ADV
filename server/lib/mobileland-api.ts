/**
 * Mobileland.me Magento REST API client.
 * Fetches product catalog + media gallery entries via OAuth 1.0 (HMAC-SHA256).
 * Returns a SKU → image URL map. Results are cached for 5 minutes.
 */

import crypto from 'node:crypto';
import { ENV } from '../_core/env';

// ---------------------------------------------------------------------------
// In-memory cache + fetch-lock
// ---------------------------------------------------------------------------

let cache: { data: Record<string, string>; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Promise that resolves when the current background fetch finishes.
 * Prevents duplicate concurrent fetches from hammering the Mobileland API.
 */
let fetchInProgress: Promise<Record<string, string>> | null = null;

export function clearCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// OAuth 1.0 helpers
// ---------------------------------------------------------------------------

/**
 * RFC 5849 percent-encoding — stricter than encodeURIComponent.
 * Also encodes: ! * ' ( )
 */
export function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface OAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

/**
 * Build an OAuth 1.0 Authorization header for a GET request.
 * Signing follows RFC 5849 § 3.4.
 */
export function buildOAuthHeader(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  oauth: OAuthCredentials,
  /** Override timestamp for testing */
  overrideTimestamp?: string,
  /** Override nonce for testing */
  overrideNonce?: string,
): string {
  const timestamp = overrideTimestamp ?? Math.floor(Date.now() / 1000).toString();
  const nonce = overrideNonce ?? generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: oauth.consumerKey,
    oauth_token: oauth.token,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Combine all params, sort alphabetically, build signature base
  const allParams: Record<string, string> = { ...oauthParams, ...queryParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const baseUrl = url.split('?')[0];
  const signatureBase = `${method}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(oauth.consumerSecret)}&${percentEncode(oauth.tokenSecret)}`;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBase)
    .digest('base64');

  const signedParams = { ...oauthParams, oauth_signature: signature };

  return (
    'OAuth ' +
    Object.entries(signedParams)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .join(', ')
  );
}

// ---------------------------------------------------------------------------
// Magento API types
// ---------------------------------------------------------------------------

interface MagentoMediaEntry {
  file: string;
}

interface MagentoCustomAttribute {
  attribute_code?: string;
  /** Magento returns string paths or `no_selection` when unset */
  value?: string | number | null;
}

interface MagentoProduct {
  /** Magento entity_id — Excel exporti ponekad koriste ovaj broj umjesto SKU */
  id?: number;
  sku: string;
  name?: string;
  media_gallery_entries?: MagentoMediaEntry[];
  custom_attributes?: MagentoCustomAttribute[];
}

interface MagentoProductsResponse {
  items: MagentoProduct[];
  total_count: number;
}

// ---------------------------------------------------------------------------
// Image URL construction
// ---------------------------------------------------------------------------

/**
 * Build a full image URL from a Magento media file path.
 * e.g. "/1/0/1035914_21404_.jpg" → "https://mobileland.me/media/catalog/product/1/0/1035914_21404_.jpg"
 *
 * STORY-155: Custom attributes sometimes store a full https URL, a protocol-relative URL,
 * or a site path already starting with `media/catalog/product` — normalize so we never emit
 * `/media/catalog/product/media/catalog/product/...` (404 in browser).
 */
export function buildImageUrl(baseUrl: string, file: string): string {
  const base = baseUrl.replace(/\/$/, '');
  let segment = file.trim();
  if (!segment) {
    return `${base}/media/catalog/product`;
  }
  if (/^https?:\/\//i.test(segment)) {
    return segment;
  }
  if (segment.startsWith('//')) {
    return `https:${segment}`;
  }
  segment = segment.replace(/^\/?media\/catalog\/product\/?/i, '/');
  const filePath = segment.startsWith('/') ? segment : `/${segment}`;
  return `${base}/media/catalog/product${filePath}`;
}

/**
 * Resolve catalog image file path: first media gallery entry, then Magento base
 * image attributes (often set before gallery is fully filled).
 */
function resolveProductImageFile(item: MagentoProduct): string | undefined {
  const fromGallery = item.media_gallery_entries?.[0]?.file?.trim();
  if (fromGallery) return fromGallery;

  const attrs = item.custom_attributes;
  if (!Array.isArray(attrs)) return undefined;

  const byCode = new Map<string, string>();
  for (const a of attrs) {
    const code = a?.attribute_code?.trim();
    if (!code) continue;
    const raw = a.value;
    if (raw == null) continue;
    const v = String(raw).trim();
    if (!v || v === 'no_selection') continue;
    byCode.set(code, v);
  }

  for (const code of ['image', 'small_image', 'thumbnail'] as const) {
    const f = byCode.get(code)?.trim();
    if (f) return f;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// API fetch
// ---------------------------------------------------------------------------

// 500 items/page → 70 pages for a 34k-product catalog (safe balance between
// 200 (174 pages) and 1000 (503 rate-limit errors with parallel fetch)).
const PAGE_SIZE = 500;
// Keep concurrency low — Mobileland's Varnish rate-limits at higher values.
const PARALLEL_BATCH = 2;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;
// Per-request timeout — prevents hung connections from stalling the pre-warm.
const REQUEST_TIMEOUT_MS = 30_000;
// Delay between batches to avoid hammering the CDN.
const INTER_BATCH_DELAY_MS = 1000;

/** Sleep helper for retry backoff. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchProductPage(
  page: number,
  oauth: OAuthCredentials,
  baseUrl: string,
): Promise<MagentoProductsResponse> {
  // Include total_count at the top level so pagination math works correctly.
  // Without it, Magento strips it from the response → Math.ceil(undefined/500) = NaN
  // → Array.from({ length: NaN }) = [] → only page 1 is ever fetched.
  const queryParams: Record<string, string> = {
    'fields':
      'total_count,items[id,sku,media_gallery_entries[file],custom_attributes[attribute_code,value]]',
    'searchCriteria[currentPage]': String(page),
    'searchCriteria[pageSize]': String(PAGE_SIZE),
  };

  const url = `${baseUrl.replace(/\/$/, '')}/rest/V1/products`;
  const qs = new URLSearchParams(queryParams).toString();

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)); // 1s, 2s
    }
    // Re-sign each attempt — OAuth timestamps must be fresh.
    const authHeader = buildOAuthHeader('GET', url, queryParams, oauth);
    const res = await fetch(`${url}?${qs}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) {
      return res.json() as Promise<MagentoProductsResponse>;
    }
    const body = await res.text().catch(() => '');
    lastError = new Error(`Mobileland API ${res.status}: ${body.slice(0, 200)}`);
    // Only retry on 5xx (server errors / rate-limit); fail fast on 4xx.
    if (res.status < 500) throw lastError;
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Whether the Mobileland API credentials are present in ENV.
 */
export function isMobilelandApiConfigured(): boolean {
  return !!(
    ENV.mobilelandBaseUrl &&
    ENV.mobilelandConsumerKey &&
    ENV.mobilelandConsumerSecret &&
    ENV.mobilelandAccessToken &&
    ENV.mobilelandAccessTokenSecret
  );
}

/**
 * Return the current in-memory cache immediately (may be empty if not yet
 * warmed). Never blocks on a live API fetch — callers should poll.
 *
 * Background fetching is started by prewarmMobilelandCache() at server startup.
 * In-progress deduplication ensures only one fetch runs at a time.
 */
export function getMobilelandImageMap(): Record<string, string> {
  return cache?.data ?? {};
}

/**
 * Perform the full paginated fetch and populate the cache.
 * Uses a promise-lock so simultaneous callers share the same in-flight fetch.
 * Exposed for testing and for the startup pre-warm.
 */
export async function fetchFullImageMap(): Promise<Record<string, string>> {
  // Serve stale cache rather than re-fetching before TTL
  if (cache && cache.expires > Date.now()) return cache.data;

  // Deduplicate: if already fetching, wait for that result
  if (fetchInProgress) return fetchInProgress;

  fetchInProgress = (async () => {
    const oauth: OAuthCredentials = {
      consumerKey: ENV.mobilelandConsumerKey,
      consumerSecret: ENV.mobilelandConsumerSecret,
      token: ENV.mobilelandAccessToken,
      tokenSecret: ENV.mobilelandAccessTokenSecret,
    };
    const baseUrl = ENV.mobilelandBaseUrl;

    const map: Record<string, string> = {};

    function addToMap(item: MagentoProduct): void {
      const sku = String(item.sku ?? '').trim();
      const file = resolveProductImageFile(item);
      if (!sku || !file) return;
      const imageUrl = buildImageUrl(baseUrl, file);
      map[sku] = imageUrl;

      // STORY-156: Excel / ERP često šalje entity_id ili url_key umjesto Magento SKU
      if (typeof item.id === 'number' && item.id > 0) {
        map[String(item.id)] = imageUrl;
      }
      const urlKey = item.custom_attributes
        ?.find((a) => a.attribute_code === 'url_key' && a.value != null);
      if (urlKey != null) {
        const uk = String(urlKey.value).trim();
        if (uk && uk !== sku) map[uk] = imageUrl;
      }
    }

    const firstPage = await fetchProductPage(1, oauth, baseUrl);
    for (const item of firstPage.items) addToMap(item);

    const totalPages = Math.ceil((firstPage.total_count ?? 0) / PAGE_SIZE);
    console.log(`[Mobileland] total_count=${firstPage.total_count}, totalPages=${totalPages}, firstPageItems=${firstPage.items.length}`);

    // Fetch remaining pages in batches — skip pages that fail (partial catalog
    // is better than no catalog). Delay between batches to avoid CDN throttling.
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < remainingPages.length; i += PARALLEL_BATCH) {
      const batch = remainingPages.slice(i, i + PARALLEL_BATCH);
      const results = await Promise.allSettled(
        batch.map((page) => fetchProductPage(page, oauth, baseUrl)),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const item of result.value.items) addToMap(item);
        } else {
          console.warn('[Mobileland] Skipping page (will retry next warm-up):', result.reason?.message);
        }
      }
      // Update cache incrementally so partial results are served during warm-up.
      cache = { data: { ...map }, expires: Date.now() + 60_000 };
      if (i + PARALLEL_BATCH < remainingPages.length) {
        await sleep(INTER_BATCH_DELAY_MS);
      }
    }

    cache = { data: map, expires: Date.now() + CACHE_TTL_MS };
    console.log(`[Mobileland] Cache populated: ${Object.keys(map).length} SKUs with images`);
    return map;
  })().finally(() => {
    fetchInProgress = null;
  });

  return fetchInProgress;
}

/**
 * Pre-warm the image map cache in the background at server startup.
 * tRPC calls return {} immediately while this runs; the client polls
 * every 30s until the map is populated.
 */
export function prewarmMobilelandCache(): void {
  if (!isMobilelandApiConfigured()) return;
  fetchFullImageMap().catch((err) =>
    console.warn('[Mobileland] Pre-warm failed:', err),
  );
}
