/**
 * Catalog Health Monitor & Auto-Resync Service
 * 
 * Apple-level philosophy: The system should NEVER show an empty state.
 * If Meilisearch is empty or unhealthy, automatically recover by re-syncing
 * from the configured data source (Mobileland API, custom API, or cached data).
 * 
 * Self-healing pipeline:
 *   1. On startup → check Meilisearch health + document count
 *   2. If empty/unhealthy → trigger auto-resync from primary data source
 *   3. During operation → periodic health checks (every 5 min)
 *   4. On failure → graceful degradation (serve from cache, show helpful state)
 *   5. On recovery → silent re-index without user intervention
 */

import { ENV } from '../_core/env';
import {
  isMeilisearchConfigured,
  configureIndex,
  indexCatalog,
  getIndexStats,
  type MeiliProductDoc,
} from './meilisearch-service';
import { isMobilelandApiConfigured } from './mobileland-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogSourceType = 'mobileland' | 'custom_api' | 'excel_cache' | 'none';

export interface CatalogHealthStatus {
  /** Whether Meilisearch is reachable and has documents */
  healthy: boolean;
  /** Number of indexed documents */
  documentCount: number;
  /** The active data source */
  activeSource: CatalogSourceType;
  /** Whether a sync is currently in progress */
  syncing: boolean;
  /** Last successful sync timestamp (ISO) */
  lastSyncAt: string | null;
  /** Last error message (null if healthy) */
  lastError: string | null;
  /** Whether auto-resync is enabled */
  autoResyncEnabled: boolean;
}

interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  documentCount: number;
  /** In-memory product cache for graceful degradation */
  cachedProducts: MeiliProductDoc[];
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state: SyncState = {
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  documentCount: 0,
  cachedProducts: [],
};

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Data source detection
// ---------------------------------------------------------------------------

/**
 * Determine the primary data source based on environment configuration.
 * Priority: Mobileland API > Custom API > Excel cache > None
 */
export function detectActiveSource(): CatalogSourceType {
  if (isMobilelandApiConfigured()) return 'mobileland';
  // Future: check for custom API configs in database
  if (state.cachedProducts.length > 0) return 'excel_cache';
  return 'none';
}

// ---------------------------------------------------------------------------
// Mobileland product fetcher (for auto-resync)
// ---------------------------------------------------------------------------

/**
 * Fetch products from Mobileland API and transform to MeiliProductDoc format.
 * Uses the same OAuth-signed requests as the image cache warmer.
 */
async function fetchMobilelandProducts(): Promise<MeiliProductDoc[]> {
  if (!isMobilelandApiConfigured()) return [];

  const OAuth = (await import('oauth-1.0a')).default;
  const crypto = await import('crypto');

  const oauth = new OAuth({
    consumer: {
      key: ENV.mobilelandConsumerKey,
      secret: ENV.mobilelandConsumerSecret,
    },
    signature_method: 'HMAC-SHA256',
    hash_function(baseString: string, key: string) {
      return crypto.createHmac('sha256', key).update(baseString).digest('base64');
    },
  });

  const token = {
    key: ENV.mobilelandAccessToken,
    secret: ENV.mobilelandAccessTokenSecret,
  };

  const baseUrl = ENV.mobilelandBaseUrl;
  const products: MeiliProductDoc[] = [];
  const PAGE_SIZE = 500;
  const MAX_PAGES = 80; // Safety limit: 40,000 products max

  // First page to get total count
  const firstUrl = `${baseUrl}/rest/V1/products?searchCriteria[pageSize]=${PAGE_SIZE}&searchCriteria[currentPage]=1&fields=items[sku,name,price,custom_attributes],total_count`;

  const firstAuth = oauth.authorize({ url: firstUrl, method: 'GET' }, token);
  const firstHeaders = oauth.toHeader(firstAuth) as Record<string, string>;

  let totalCount = 0;

  try {
    const firstRes = await fetch(firstUrl, {
      headers: { ...firstHeaders, Accept: 'application/json' },
    });

    if (!firstRes.ok) {
      throw new Error(`Mobileland API returned ${firstRes.status}`);
    }

    const firstData = (await firstRes.json()) as {
      items: Array<{
        sku: string;
        name: string;
        price?: number;
        custom_attributes?: Array<{ attribute_code: string; value: string }>;
      }>;
      total_count: number;
    };

    totalCount = firstData.total_count;
    const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES);

    // Process first page
    for (const item of firstData.items) {
      const category = item.custom_attributes?.find(a => a.attribute_code === 'category_ids')?.value || '';
      const brand = item.custom_attributes?.find(a => a.attribute_code === 'manufacturer')?.value || '';
      products.push({
        id: products.length,
        name: item.name || item.sku,
        code: item.sku,
        brand,
        category,
      });
    }

    console.log(`[catalog-health] Mobileland: ${totalCount} total products, fetching ${totalPages} pages...`);

    // Fetch remaining pages (concurrency limited to 3)
    const CONCURRENCY = 3;
    for (let batch = 1; batch < totalPages; batch += CONCURRENCY) {
      const pagePromises = [];
      for (let i = 0; i < CONCURRENCY && batch + i < totalPages; i++) {
        const page = batch + i + 1; // 1-indexed
        const url = `${baseUrl}/rest/V1/products?searchCriteria[pageSize]=${PAGE_SIZE}&searchCriteria[currentPage]=${page}&fields=items[sku,name,price,custom_attributes],total_count`;
        const auth = oauth.authorize({ url, method: 'GET' }, token);
        const headers = oauth.toHeader(auth) as Record<string, string>;

        pagePromises.push(
          fetch(url, { headers: { ...headers, Accept: 'application/json' } })
            .then(async (res) => {
              if (!res.ok) return [];
              const data = (await res.json()) as { items: Array<{ sku: string; name: string; price?: number; custom_attributes?: Array<{ attribute_code: string; value: string }> }> };
              return data.items || [];
            })
            .catch(() => [] as Array<{ sku: string; name: string; price?: number; custom_attributes?: Array<{ attribute_code: string; value: string }> }>)
        );
      }

      const results = await Promise.all(pagePromises);
      for (const items of results) {
        for (const item of items) {
          const category = item.custom_attributes?.find(a => a.attribute_code === 'category_ids')?.value || '';
          const brand = item.custom_attributes?.find(a => a.attribute_code === 'manufacturer')?.value || '';
          products.push({
            id: products.length,
            name: item.name || item.sku,
            code: item.sku,
            brand,
            category,
          });
        }
      }
    }

    console.log(`[catalog-health] Mobileland: fetched ${products.length} products`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[catalog-health] Mobileland fetch failed: ${msg}`);
    throw err;
  }

  return products;
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

/**
 * Perform a full catalog sync: fetch from source → index into Meilisearch.
 * Idempotent and safe to call multiple times.
 */
export async function syncCatalog(force = false): Promise<{ ok: boolean; count: number; error?: string }> {
  if (state.syncing && !force) {
    return { ok: false, count: 0, error: 'Sync already in progress' };
  }

  if (!isMeilisearchConfigured()) {
    return { ok: false, count: 0, error: 'Meilisearch not configured' };
  }

  state.syncing = true;
  state.lastError = null;

  try {
    // Step 1: Configure index (idempotent — sets up embedder)
    await configureIndex();

    // Step 2: Fetch products from the active source
    const source = detectActiveSource();
    let products: MeiliProductDoc[] = [];

    switch (source) {
      case 'mobileland':
        products = await fetchMobilelandProducts();
        break;
      case 'excel_cache':
        products = state.cachedProducts;
        break;
      case 'custom_api':
        // Future: fetch from stored custom API config
        break;
      case 'none':
        state.syncing = false;
        return { ok: false, count: 0, error: 'No data source configured' };
    }

    if (products.length === 0) {
      state.syncing = false;
      return { ok: false, count: 0, error: `Source "${source}" returned 0 products` };
    }

    // Step 3: Index into Meilisearch
    await indexCatalog(products);

    // Step 4: Update state
    state.cachedProducts = products;
    state.documentCount = products.length;
    state.lastSyncAt = new Date().toISOString();
    state.syncing = false;

    console.log(`[catalog-health] Sync complete: ${products.length} products indexed from ${source}`);
    return { ok: true, count: products.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.lastError = msg;
    state.syncing = false;
    console.error(`[catalog-health] Sync failed: ${msg}`);
    return { ok: false, count: 0, error: msg };
  }
}

/**
 * Cache products from an Excel upload for future auto-resync.
 * Called when user uploads Excel — stores in memory for recovery.
 */
export function cacheExcelProducts(products: MeiliProductDoc[]): void {
  state.cachedProducts = products;
  state.documentCount = products.length;
  state.lastSyncAt = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Get current catalog health status.
 */
export async function getCatalogHealth(): Promise<CatalogHealthStatus> {
  let healthy = false;
  let documentCount = 0;

  if (isMeilisearchConfigured()) {
    try {
      const stats = await getIndexStats();
      documentCount = stats.documentCount;
      healthy = documentCount > 0;
      state.documentCount = documentCount;
    } catch {
      healthy = false;
    }
  }

  return {
    healthy,
    documentCount,
    activeSource: detectActiveSource(),
    syncing: state.syncing,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    autoResyncEnabled: isMeilisearchConfigured() && detectActiveSource() !== 'none',
  };
}

// ---------------------------------------------------------------------------
// Auto-healing startup & periodic check
// ---------------------------------------------------------------------------

/**
 * Initialize the self-healing catalog pipeline.
 * Call this at server startup AFTER Meilisearch is configured.
 * 
 * Behavior:
 *   1. Check if Meilisearch has documents
 *   2. If empty AND a data source is configured → auto-sync
 *   3. Start periodic health checks (every 5 minutes)
 */
export async function initCatalogHealth(): Promise<void> {
  if (!isMeilisearchConfigured()) {
    console.log('[catalog-health] Meilisearch not configured — skipping auto-heal');
    return;
  }

  console.log('[catalog-health] Initializing self-healing catalog pipeline...');

  // Check current state
  let needsSync = false;
  try {
    const stats = await getIndexStats();
    state.documentCount = stats.documentCount;
    if (stats.documentCount === 0) {
      console.log('[catalog-health] Index is empty — will attempt auto-resync');
      needsSync = true;
    } else {
      console.log(`[catalog-health] Index healthy: ${stats.documentCount} documents`);
    }
  } catch {
    console.log('[catalog-health] Cannot reach Meilisearch index — will attempt auto-resync');
    needsSync = true;
  }

  // Auto-sync if needed (non-blocking — runs in background)
  if (needsSync && detectActiveSource() !== 'none') {
    // Small delay to let other startup tasks complete
    setTimeout(() => {
      syncCatalog().then((result) => {
        if (result.ok) {
          console.log(`[catalog-health] Auto-resync successful: ${result.count} products`);
        } else {
          console.warn(`[catalog-health] Auto-resync failed: ${result.error}`);
        }
      });
    }, 3000);
  }

  // Periodic health check every 5 minutes
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  healthCheckInterval = setInterval(async () => {
    try {
      const health = await getCatalogHealth();
      if (!health.healthy && health.activeSource !== 'none' && !health.syncing) {
        console.log('[catalog-health] Periodic check: index unhealthy, triggering resync...');
        await syncCatalog();
      }
    } catch {
      // Silent — don't crash on health check failure
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Get cached products for graceful degradation when Meilisearch is down.
 */
export function getCachedProducts(): MeiliProductDoc[] {
  return state.cachedProducts;
}

/**
 * Get sync state (for API responses).
 */
export function getSyncState(): Pick<SyncState, 'syncing' | 'lastSyncAt' | 'lastError' | 'documentCount'> {
  return {
    syncing: state.syncing,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    documentCount: state.documentCount,
  };
}
