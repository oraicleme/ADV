/**
 * Catalog Health Monitor & Incremental Sync Service
 *
 * Apple-level philosophy:
 *   - The system should NEVER show an empty state
 *   - Sync should be INCREMENTAL — only process what changed
 *   - OpenAI embeddings are expensive — never recompute for unchanged products
 *   - Users can trigger manual resync; the system also self-heals automatically
 *
 * Incremental sync pipeline:
 *   1. Fetch products from source (Mobileland API / Custom API / Excel)
 *   2. Compute content hash per product (name+brand+code+category)
 *   3. Compare against stored hashes from last sync
 *   4. Only send NEW or CHANGED products to Meilisearch (triggers embedding only for those)
 *   5. DELETE products that disappeared from the source
 *   6. Update stored hashes
 *
 * This means: if 34,742 products exist and only 50 changed,
 * only 50 get re-indexed and only 50 get new OpenAI embeddings.
 */

import { ENV } from '../_core/env';
import {
  isMeilisearchConfigured,
  configureIndex,
  indexCatalog,
  deleteDocuments,
  getIndexStats,
  type MeiliProductDoc,
} from './meilisearch-service';
import { isMobilelandApiConfigured, buildOAuthHeader, type OAuthCredentials } from './mobileland-api';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CatalogSourceType = 'mobileland' | 'custom_api' | 'excel_cache' | 'none';

export interface CatalogHealthStatus {
  healthy: boolean;
  documentCount: number;
  activeSource: CatalogSourceType;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  autoResyncEnabled: boolean;
  /** Incremental sync stats from last run */
  lastSyncStats: SyncStats | null;
}

export interface SyncStats {
  totalFromSource: number;
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether this was a full or incremental sync */
  mode: 'full' | 'incremental';
}

interface SyncState {
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  documentCount: number;
  lastSyncStats: SyncStats | null;
  /** In-memory product cache for graceful degradation */
  cachedProducts: MeiliProductDoc[];
  /** Content hash map: productId → hash of content fields */
  contentHashes: Map<number, string>;
  /** SKU → productId map for deduplication across syncs */
  skuToId: Map<string, number>;
  /** Next available product ID (auto-increment) */
  nextId: number;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state: SyncState = {
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  documentCount: 0,
  lastSyncStats: null,
  cachedProducts: [],
  contentHashes: new Map(),
  skuToId: new Map(),
  nextId: 0,
};

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Content hashing
// ---------------------------------------------------------------------------

/**
 * Compute a content hash for a product document.
 * Only fields that affect search/display are included.
 * If the hash is the same, the product hasn't changed → skip re-indexing.
 */
function computeContentHash(doc: { name: string; brand: string; code: string; category: string }): string {
  const content = `${doc.name}|${doc.brand}|${doc.code}|${doc.category}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16); // 16 chars is enough for collision avoidance
}

// ---------------------------------------------------------------------------
// Data source detection
// ---------------------------------------------------------------------------

export function detectActiveSource(): CatalogSourceType {
  if (isMobilelandApiConfigured()) return 'mobileland';
  if (state.cachedProducts.length > 0) return 'excel_cache';
  return 'none';
}

// ---------------------------------------------------------------------------
// Mobileland product fetcher
// ---------------------------------------------------------------------------

async function fetchMobilelandProducts(): Promise<MeiliProductDoc[]> {
  if (!isMobilelandApiConfigured()) return [];

  const oauthCreds: OAuthCredentials = {
    consumerKey: ENV.mobilelandConsumerKey,
    consumerSecret: ENV.mobilelandConsumerSecret,
    token: ENV.mobilelandAccessToken,
    tokenSecret: ENV.mobilelandAccessTokenSecret,
  };

  const baseUrl = ENV.mobilelandBaseUrl;
  const products: MeiliProductDoc[] = [];
  const PAGE_SIZE = 500;
  const MAX_PAGES = 80;

  /**
   * Build query params for a given page.
   */
  function buildQueryParams(page: number): Record<string, string> {
    return {
      'searchCriteria[pageSize]': String(PAGE_SIZE),
      'searchCriteria[currentPage]': String(page),
      'fields': 'items[sku,name,price,custom_attributes],total_count',
    };
  }

  /**
   * Fetch a single page using the project's own OAuth 1.0 signing.
   */
  async function fetchPage(page: number) {
    const url = `${baseUrl}/rest/V1/products`;
    const queryParams = buildQueryParams(page);
    const qs = new URLSearchParams(queryParams).toString();
    const authHeader = buildOAuthHeader('GET', url, queryParams, oauthCreds);

    const res = await fetch(`${url}?${qs}`, {
      method: 'GET',
      headers: { Authorization: authHeader, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Mobileland API returned ${res.status}`);
    return res.json() as Promise<{
      items: Array<{
        sku: string;
        name: string;
        price?: number;
        custom_attributes?: Array<{ attribute_code: string; value: string }>;
      }>;
      total_count: number;
    }>;
  }

  let totalCount = 0;

  try {
    const firstData = await fetchPage(1);
    totalCount = firstData.total_count;
    const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES);

    for (const item of firstData.items) {
      const category = item.custom_attributes?.find(a => a.attribute_code === 'category_ids')?.value || '';
      const brand = item.custom_attributes?.find(a => a.attribute_code === 'manufacturer')?.value || '';
      products.push({
        id: resolveProductId(item.sku),
        name: item.name || item.sku,
        code: item.sku,
        brand,
        category,
      });
    }

    console.log(`[catalog-health] Mobileland: ${totalCount} total, fetching ${totalPages} pages...`);

    const CONCURRENCY = 3;
    for (let batch = 1; batch < totalPages; batch += CONCURRENCY) {
      const pagePromises = [];
      for (let i = 0; i < CONCURRENCY && batch + i < totalPages; i++) {
        const page = batch + i + 1;
        pagePromises.push(
          fetchPage(page)
            .then(data => data.items || [])
            .catch(() => [] as Array<{ sku: string; name: string; price?: number; custom_attributes?: Array<{ attribute_code: string; value: string }> }>)
        );
      }

      const results = await Promise.all(pagePromises);
      for (const items of results) {
        for (const item of items) {
          const category = item.custom_attributes?.find(a => a.attribute_code === 'category_ids')?.value || '';
          const brand = item.custom_attributes?.find(a => a.attribute_code === 'manufacturer')?.value || '';
          products.push({
            id: resolveProductId(item.sku),
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

/**
 * Resolve a stable product ID for a given SKU.
 * Same SKU always gets the same ID across syncs — prevents duplicate documents.
 */
function resolveProductId(sku: string): number {
  const existing = state.skuToId.get(sku);
  if (existing !== undefined) return existing;
  const id = state.nextId++;
  state.skuToId.set(sku, id);
  return id;
}

// ---------------------------------------------------------------------------
// Incremental sync engine
// ---------------------------------------------------------------------------

/**
 * Perform an INCREMENTAL catalog sync:
 *   1. Fetch all products from source
 *   2. Diff against stored content hashes
 *   3. Only index NEW + CHANGED products (saves OpenAI embedding costs)
 *   4. Delete REMOVED products from Meilisearch
 *   5. Update hash store
 *
 * Falls back to FULL sync when:
 *   - First sync (no hashes stored)
 *   - force=true parameter
 *   - Meilisearch index is empty (recovery scenario)
 */
export async function syncCatalog(force = false): Promise<{ ok: boolean; count: number; stats?: SyncStats; error?: string }> {
  if (state.syncing && !force) {
    return { ok: false, count: 0, error: 'Sync already in progress' };
  }

  if (!isMeilisearchConfigured()) {
    return { ok: false, count: 0, error: 'Meilisearch not configured' };
  }

  state.syncing = true;
  state.lastError = null;
  const startTime = Date.now();

  try {
    // Step 1: Configure index (idempotent)
    await configureIndex();

    // Step 2: Fetch products from source
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

    // Step 3: Determine sync mode
    const isFirstSync = state.contentHashes.size === 0;
    const indexEmpty = state.documentCount === 0;
    const doFullSync = force || isFirstSync || indexEmpty;

    let stats: SyncStats;

    if (doFullSync) {
      // FULL SYNC: index everything, rebuild hash store
      stats = await performFullSync(products);
    } else {
      // INCREMENTAL SYNC: only process changes
      stats = await performIncrementalSync(products);
    }

    // Step 4: Update state
    state.cachedProducts = products;
    state.documentCount = products.length;
    state.lastSyncAt = new Date().toISOString();
    state.lastSyncStats = stats;
    state.syncing = false;

    const mode = stats.mode === 'full' ? 'FULL' : 'INCREMENTAL';
    console.log(
      `[catalog-health] ${mode} sync complete: ${stats.totalFromSource} total, ` +
      `+${stats.added} added, ~${stats.updated} updated, -${stats.deleted} deleted, ` +
      `=${stats.unchanged} unchanged (${stats.durationMs}ms)`
    );

    return { ok: true, count: products.length, stats };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.lastError = msg;
    state.syncing = false;
    console.error(`[catalog-health] Sync failed: ${msg}`);
    return { ok: false, count: 0, error: msg };
  }
}

/**
 * Full sync: index all products, rebuild hash store from scratch.
 * Used on first sync, forced resync, or recovery from empty index.
 */
async function performFullSync(products: MeiliProductDoc[]): Promise<SyncStats> {
  const startTime = Date.now();

  // Index all products
  await indexCatalog(products);

  // Rebuild hash store
  state.contentHashes.clear();
  for (const p of products) {
    state.contentHashes.set(p.id, computeContentHash(p));
  }

  return {
    totalFromSource: products.length,
    added: products.length,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    durationMs: Date.now() - startTime,
    mode: 'full',
  };
}

/**
 * Incremental sync: diff against stored hashes, only process changes.
 * 
 * This is where the cost savings happen:
 *   - Unchanged products: 0 API calls, 0 OpenAI embedding calls
 *   - Changed products: 1 Meilisearch upsert → triggers 1 OpenAI embedding
 *   - Deleted products: 1 Meilisearch delete call
 */
async function performIncrementalSync(products: MeiliProductDoc[]): Promise<SyncStats> {
  const startTime = Date.now();

  const newHashes = new Map<number, string>();
  const toAdd: MeiliProductDoc[] = [];
  const toUpdate: MeiliProductDoc[] = [];
  const currentIds = new Set<number>();

  // Compute new hashes and detect changes
  for (const p of products) {
    const hash = computeContentHash(p);
    newHashes.set(p.id, hash);
    currentIds.add(p.id);

    const existingHash = state.contentHashes.get(p.id);
    if (!existingHash) {
      // New product — not in previous sync
      toAdd.push(p);
    } else if (existingHash !== hash) {
      // Changed product — content differs
      toUpdate.push(p);
    }
    // else: unchanged — skip entirely (no Meilisearch call, no OpenAI call)
  }

  // Detect deletions: products in old hash store but not in new source
  const toDelete: number[] = [];
  for (const [id] of state.contentHashes) {
    if (!currentIds.has(id)) {
      toDelete.push(id);
    }
  }

  // Apply changes to Meilisearch
  const docsToIndex = [...toAdd, ...toUpdate];
  if (docsToIndex.length > 0) {
    // addDocuments with same ID = upsert. Only these trigger new embeddings.
    await indexCatalog(docsToIndex);
    console.log(`[catalog-health] Incremental: indexed ${docsToIndex.length} changed docs (${toAdd.length} new, ${toUpdate.length} updated)`);
  }

  if (toDelete.length > 0) {
    await deleteDocuments(toDelete);
    console.log(`[catalog-health] Incremental: deleted ${toDelete.length} removed products`);
  }

  // Update hash store
  state.contentHashes = newHashes;

  // Clean up SKU map for deleted products
  for (const id of toDelete) {
    for (const [sku, skuId] of state.skuToId) {
      if (skuId === id) {
        state.skuToId.delete(sku);
        break;
      }
    }
  }

  const unchanged = products.length - toAdd.length - toUpdate.length;

  return {
    totalFromSource: products.length,
    added: toAdd.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    unchanged,
    durationMs: Date.now() - startTime,
    mode: 'incremental',
  };
}

// ---------------------------------------------------------------------------
// Excel cache (for user uploads)
// ---------------------------------------------------------------------------

/**
 * Cache products from an Excel upload for future auto-resync.
 * Also builds the hash store so subsequent syncs are incremental.
 */
export function cacheExcelProducts(products: MeiliProductDoc[]): void {
  state.cachedProducts = products;
  state.documentCount = products.length;
  state.lastSyncAt = new Date().toISOString();

  // Build hash store from Excel data
  state.contentHashes.clear();
  state.skuToId.clear();
  for (const p of products) {
    state.contentHashes.set(p.id, computeContentHash(p));
    state.skuToId.set(p.code, p.id);
  }
  if (products.length > 0) {
    state.nextId = Math.max(...products.map(p => p.id)) + 1;
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

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
    lastSyncStats: state.lastSyncStats,
  };
}

// ---------------------------------------------------------------------------
// Auto-healing startup & periodic check
// ---------------------------------------------------------------------------

/**
 * Initialize the self-healing catalog pipeline.
 * On startup: check Meilisearch health → auto-sync if empty → start periodic checks.
 */
export async function initCatalogHealth(): Promise<void> {
  if (!isMeilisearchConfigured()) {
    console.log('[catalog-health] Meilisearch not configured — skipping auto-heal');
    return;
  }

  console.log('[catalog-health] Initializing self-healing catalog pipeline...');

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

  // Auto-sync if needed (non-blocking)
  if (needsSync && detectActiveSource() !== 'none') {
    setTimeout(() => {
      syncCatalog(true).then((result) => {
        if (result.ok) {
          console.log(`[catalog-health] Auto-resync successful: ${result.count} products`);
          if (result.stats) {
            console.log(`[catalog-health] Stats: +${result.stats.added} added, ~${result.stats.updated} updated, -${result.stats.deleted} deleted`);
          }
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
        await syncCatalog(); // Will be incremental if hashes exist
      }
    } catch {
      // Silent
    }
  }, 5 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Public getters
// ---------------------------------------------------------------------------

export function getCachedProducts(): MeiliProductDoc[] {
  return state.cachedProducts;
}

export function getSyncState() {
  return {
    syncing: state.syncing,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    documentCount: state.documentCount,
    lastSyncStats: state.lastSyncStats,
    hashStoreSize: state.contentHashes.size,
  };
}
