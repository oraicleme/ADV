/**
 * STORY-139: Catalog Index Manager — Incremental Meilisearch Indexing.
 *
 * Tracks which products are already indexed in Meilisearch by storing a
 * per-product entry (hash + indexId) in localStorage. On each catalog load,
 * computes a diff and only sends new/changed products to Meilisearch (and
 * OpenAI for embeddings). Removed products are deleted by their stored indexId.
 *
 * Internal module — only used by AgentChat.tsx.
 */

import type { ProductItem } from './ad-constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Per-product entry in the persisted index state.
 * hash    — djb2 hash of name|brand|code|category; change → re-embed
 * indexId — position in the full products array; used as Meilisearch document ID
 */
export interface CatalogIndexEntry {
  hash: string;
  indexId: number;
}

/**
 * Persisted index state: maps uniqueKey → CatalogIndexEntry.
 * Stored in localStorage as JSON.
 */
export type CatalogIndexState = Record<string, CatalogIndexEntry>;

export interface CatalogDiff {
  /** Products to add or update in Meilisearch, with their full-catalog indexId. */
  toUpsert: Array<{ product: ProductItem; indexId: number }>;
  /** Meilisearch document IDs to delete (numeric indexIds from stored state). */
  toDeleteIds: number[];
  stats: {
    added: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * djb2 string hash — fast, deterministic, no crypto dependency.
 * Returns a 32-bit unsigned integer as a hex string.
 */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/**
 * Deterministic hash of a product's indexable fields.
 * Any field change (name, brand, code, category) produces a different hash.
 */
export function hashProduct(p: ProductItem): string {
  const s = [p.name ?? '', p.brand ?? '', p.code ?? '', p.category ?? ''].join('|');
  return djb2(s);
}

// ---------------------------------------------------------------------------
// Unique key
// ---------------------------------------------------------------------------

/**
 * Derive a stable unique key for a product.
 * Uses `code` (SKU) when present and non-empty; falls back to `name`.
 * Normalized to lowercase + trimmed.
 */
export function getUniqueKey(p: ProductItem): string {
  const code = p.code?.trim();
  if (code) return code.toLowerCase();
  return (p.name ?? '').trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/**
 * Compute the difference between the current product list and the stored index state.
 *
 * Collision handling (M5): if two products share the same unique key (same code or
 * same name), they get disambiguated with a `_1`, `_2` suffix. A warning is logged.
 *
 * @param current  Latest product array from Excel / API
 * @param stored   Previously persisted index state; empty object = first load
 */
export function computeCatalogDiff(
  current: ProductItem[],
  stored: CatalogIndexState,
): CatalogDiff {
  const keySeen = new Map<string, number>();
  const currentMap = new Map<string, { product: ProductItem; indexId: number; hash: string }>();

  for (let i = 0; i < current.length; i++) {
    const p = current[i]!;
    const rawKey = getUniqueKey(p);
    const count = keySeen.get(rawKey) ?? 0;
    keySeen.set(rawKey, count + 1);

    const key = count === 0 ? rawKey : `${rawKey}_${count}`;
    if (count === 1) {
      // First collision: rename the already-inserted first occurrence to _0
      const existing = currentMap.get(rawKey);
      if (existing) {
        currentMap.delete(rawKey);
        currentMap.set(`${rawKey}_0`, existing);
        console.warn(`[CatalogIndexManager] Duplicate unique key "${rawKey}" — disambiguating`);
      }
    }
    currentMap.set(key, { product: p, indexId: i, hash: hashProduct(p) });
  }

  const toUpsert: CatalogDiff['toUpsert'] = [];
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const [key, { product, indexId, hash }] of currentMap) {
    const entry = stored[key];
    if (entry === undefined) {
      toUpsert.push({ product, indexId });
      added++;
    } else if (entry.hash !== hash) {
      toUpsert.push({ product, indexId });
      updated++;
    } else {
      unchanged++;
    }
  }

  // Keys in stored that are no longer in current → delete from Meilisearch
  const currentKeys = new Set(currentMap.keys());
  const deletedKeys = Object.keys(stored).filter((k) => !currentKeys.has(k));
  const toDeleteIds = deletedKeys.map((k) => stored[k]!.indexId);

  return {
    toUpsert,
    toDeleteIds,
    stats: { added, updated, deleted: deletedKeys.length, unchanged },
  };
}

// ---------------------------------------------------------------------------
// State builders
// ---------------------------------------------------------------------------

/**
 * Build a fresh CatalogIndexState from the current product list.
 * Used after a full re-index to persist the baseline.
 */
export function buildIndexState(products: ProductItem[]): CatalogIndexState {
  const keySeen = new Map<string, number>();
  const state: CatalogIndexState = {};

  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    const rawKey = getUniqueKey(p);
    const count = keySeen.get(rawKey) ?? 0;
    keySeen.set(rawKey, count + 1);
    const key = count === 0 ? rawKey : `${rawKey}_${count}`;
    if (count === 1 && state[rawKey] !== undefined) {
      state[`${rawKey}_0`] = state[rawKey]!;
      delete state[rawKey];
    }
    state[key] = { hash: hashProduct(p), indexId: i };
  }

  return state;
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

function isValidEntry(v: unknown): v is CatalogIndexEntry {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>)['hash'] === 'string' &&
    typeof (v as Record<string, unknown>)['indexId'] === 'number'
  );
}

/**
 * Load previously saved CatalogIndexState from localStorage.
 * Returns null if key is absent or the stored value is corrupt.
 */
export function loadIndexState(storageKey: string): CatalogIndexState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    for (const v of Object.values(parsed as Record<string, unknown>)) {
      if (!isValidEntry(v)) return null;
    }
    return parsed as CatalogIndexState;
  } catch {
    return null;
  }
}

/**
 * Persist CatalogIndexState to localStorage.
 * Silent on write errors (e.g. storage quota exceeded).
 */
export function saveIndexState(storageKey: string, state: CatalogIndexState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    console.warn('[CatalogIndexManager] Failed to save index state to localStorage');
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key for the default catalog index state. */
export const CATALOG_INDEX_STORAGE_KEY = 'oraicle:catalog-index-state';
