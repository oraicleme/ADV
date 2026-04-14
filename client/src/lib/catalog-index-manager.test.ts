/**
 * STORY-139: Tests for catalog-index-manager.ts
 *
 * T1 — hashProduct: deterministic; any field change → different hash
 * T2 — getUniqueKey: code priority; name fallback; whitespace/case normalisation
 * T3 — computeCatalogDiff: new / changed / unchanged / deleted
 * T4 — computeCatalogDiff: empty stored state → all in toUpsert (first load)
 * T5 — loadIndexState / saveIndexState: round-trip via localStorage mock
 * T6 — buildIndexState: builds correct state; round-trip → zero diff
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashProduct,
  getUniqueKey,
  computeCatalogDiff,
  buildIndexState,
  loadIndexState,
  saveIndexState,
  type CatalogIndexState,
} from './catalog-index-manager';
import type { ProductItem } from './ad-constants';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const p1: ProductItem = { name: 'Auto punjač TC-06', brand: 'Teracell', code: 'TC-06', category: 'Punjači' };
const p2: ProductItem = { name: 'iPhone 15 Futrola', brand: 'Hoco', code: 'HC-F15', category: 'Futrole' };
const p3: ProductItem = { name: 'USB-C Kabl 1m', brand: 'Baseus', code: 'BAS-C1', category: 'Kablovi' };

/** Helper: build a stored state entry for a product at a given index position. */
function entry(p: ProductItem, indexId: number) {
  return { hash: hashProduct(p), indexId };
}

// ---------------------------------------------------------------------------
// T1 — hashProduct
// ---------------------------------------------------------------------------

describe('T1 — hashProduct', () => {
  it('returns a non-empty string', () => {
    expect(typeof hashProduct(p1)).toBe('string');
    expect(hashProduct(p1).length).toBeGreaterThan(0);
  });

  it('same input → same hash (deterministic)', () => {
    expect(hashProduct(p1)).toBe(hashProduct(p1));
    const x = { name: 'Test', brand: 'B', code: 'C', category: 'Cat' };
    expect(hashProduct(x)).toBe(hashProduct({ ...x }));
  });

  it('different name → different hash', () => {
    expect(hashProduct(p1)).not.toBe(hashProduct({ ...p1, name: 'Kućni punjač' }));
  });

  it('different brand → different hash', () => {
    expect(hashProduct(p1)).not.toBe(hashProduct({ ...p1, brand: 'Hoco' }));
  });

  it('different code → different hash', () => {
    expect(hashProduct(p1)).not.toBe(hashProduct({ ...p1, code: 'TC-99' }));
  });

  it('different category → different hash', () => {
    expect(hashProduct(p1)).not.toBe(hashProduct({ ...p1, category: 'Futrole' }));
  });

  it('handles undefined optional fields gracefully', () => {
    expect(() => hashProduct({ name: 'Test' })).not.toThrow();
    expect(hashProduct({ name: 'Test' })).toBe(
      hashProduct({ name: 'Test', brand: undefined, code: undefined, category: undefined }),
    );
  });
});

// ---------------------------------------------------------------------------
// T2 — getUniqueKey
// ---------------------------------------------------------------------------

describe('T2 — getUniqueKey', () => {
  it('returns lowercase trimmed code when present', () => {
    expect(getUniqueKey({ name: 'Test', code: 'TC-06' })).toBe('tc-06');
    expect(getUniqueKey({ name: 'Test', code: '  SKU-1  ' })).toBe('sku-1');
  });

  it('falls back to lowercase trimmed name when code is absent or empty', () => {
    expect(getUniqueKey({ name: 'Auto punjač' })).toBe('auto punjač');
    expect(getUniqueKey({ name: 'Test', code: '' })).toBe('test');
    expect(getUniqueKey({ name: 'Test', code: '   ' })).toBe('test');
  });

  it('handles empty name gracefully', () => {
    expect(() => getUniqueKey({ name: '' })).not.toThrow();
    expect(getUniqueKey({ name: '' })).toBe('');
  });
});

// ---------------------------------------------------------------------------
// T3 — computeCatalogDiff: incremental changes
// ---------------------------------------------------------------------------

describe('T3 — computeCatalogDiff: add / update / unchanged / delete', () => {
  it('new product (not in stored) → toUpsert, stats.added++', () => {
    const diff = computeCatalogDiff([p1], {});

    expect(diff.toUpsert).toHaveLength(1);
    expect(diff.toUpsert[0]!.product).toEqual(p1);
    expect(diff.toUpsert[0]!.indexId).toBe(0);
    expect(diff.stats.added).toBe(1);
    expect(diff.stats.updated).toBe(0);
    expect(diff.stats.unchanged).toBe(0);
    expect(diff.toDeleteIds).toHaveLength(0);
  });

  it('unchanged product (same hash) → NOT in toUpsert, stats.unchanged++', () => {
    const stored: CatalogIndexState = { [getUniqueKey(p1)]: entry(p1, 0) };
    const diff = computeCatalogDiff([p1], stored);

    expect(diff.toUpsert).toHaveLength(0);
    expect(diff.stats.unchanged).toBe(1);
    expect(diff.stats.added).toBe(0);
    expect(diff.stats.updated).toBe(0);
  });

  it('changed product (hash mismatch) → toUpsert, stats.updated++', () => {
    const stored: CatalogIndexState = {
      [getUniqueKey(p1)]: { hash: 'stale-hash', indexId: 0 },
    };
    const diff = computeCatalogDiff([p1], stored);

    expect(diff.toUpsert).toHaveLength(1);
    expect(diff.stats.updated).toBe(1);
    expect(diff.stats.added).toBe(0);
  });

  it('deleted product (in stored but not in current) → toDeleteIds contains stored indexId', () => {
    const stored: CatalogIndexState = {
      [getUniqueKey(p1)]: entry(p1, 0),
      [getUniqueKey(p2)]: entry(p2, 1),
    };
    const diff = computeCatalogDiff([p1], stored); // p2 removed

    expect(diff.toDeleteIds).toContain(1); // p2's indexId was 1
    expect(diff.stats.deleted).toBe(1);
    expect(diff.stats.unchanged).toBe(1);
  });

  it('mixed scenario: 1 new, 1 changed, 1 unchanged, 1 deleted', () => {
    const stored: CatalogIndexState = {
      [getUniqueKey(p1)]: entry(p1, 0),                        // unchanged
      [getUniqueKey(p2)]: { hash: 'stale', indexId: 1 },       // changed
      [getUniqueKey(p3)]: entry(p3, 2),                        // deleted
    };
    const p4: ProductItem = { name: 'Novo staklo', code: 'STK-1', category: 'Zaštite' };
    const diff = computeCatalogDiff([p1, p2, p4], stored); // p3 removed, p4 added

    expect(diff.stats.unchanged).toBe(1);
    expect(diff.stats.updated).toBe(1);
    expect(diff.stats.added).toBe(1);
    expect(diff.stats.deleted).toBe(1);
    expect(diff.toUpsert).toHaveLength(2);
    expect(diff.toDeleteIds).toContain(2); // p3's indexId
  });

  it('toUpsert indexId matches position in full current array', () => {
    const diff = computeCatalogDiff([p1, p2, p3], {});
    const ids = diff.toUpsert.map((u) => u.indexId).sort((a, b) => a - b);
    expect(ids).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Only novitete sent to index (OpenAI): no change → empty toUpsert
// ---------------------------------------------------------------------------

describe('Only new/changed products in toUpsert (nothing to API for unchanged)', () => {
  it('no change: same catalog as stored → toUpsert empty (nothing sent to OpenAI)', () => {
    const products = [p1, p2, p3];
    const stored = buildIndexState(products);
    const diff = computeCatalogDiff(products, stored);

    expect(diff.toUpsert).toHaveLength(0);
    expect(diff.stats.unchanged).toBe(3);
    expect(diff.stats.added).toBe(0);
    expect(diff.stats.updated).toBe(0);
  });

  it('one product name changed → only that product in toUpsert (1 call to API)', () => {
    const stored = buildIndexState([p1, p2, p3]);
    const changedP2 = { ...p2, name: 'iPhone 15 Futrola Pro' };
    const current = [p1, changedP2, p3];
    const diff = computeCatalogDiff(current, stored);

    expect(diff.toUpsert).toHaveLength(1);
    expect(diff.toUpsert[0]!.product).toEqual(changedP2);
    expect(diff.toUpsert[0]!.indexId).toBe(1);
    expect(diff.stats.updated).toBe(1);
    expect(diff.stats.unchanged).toBe(2);
  });

  it('two products changed → exactly two in toUpsert (only those sent to API)', () => {
    const stored = buildIndexState([p1, p2, p3]);
    const current = [
      { ...p1, category: 'Punjači USB' },
      p2,
      { ...p3, name: 'USB-C Kabl 2m' },
    ];
    const diff = computeCatalogDiff(current, stored);

    expect(diff.toUpsert).toHaveLength(2);
    const names = diff.toUpsert.map((u) => u.product.name).sort();
    expect(names).toEqual(['Auto punjač TC-06', 'USB-C Kabl 2m']);
    expect(diff.stats.updated).toBe(2);
    expect(diff.stats.unchanged).toBe(1);
  });

  it('one new product added → only the new one in toUpsert', () => {
    const stored = buildIndexState([p1, p2]);
    const pNew: ProductItem = { name: 'Novi proizvod', code: 'NP-1', category: 'Ostalo' };
    const current = [p1, p2, pNew];
    const diff = computeCatalogDiff(current, stored);

    expect(diff.toUpsert).toHaveLength(1);
    expect(diff.toUpsert[0]!.product).toEqual(pNew);
    expect(diff.stats.added).toBe(1);
    expect(diff.stats.unchanged).toBe(2);
  });

  it('toUpsert never contains unchanged products (only new or hash-changed)', () => {
    const stored: CatalogIndexState = {
      [getUniqueKey(p1)]: entry(p1, 0),
      [getUniqueKey(p2)]: entry(p2, 1),
      [getUniqueKey(p3)]: { hash: 'stale-hash', indexId: 2 }, // p3 "changed"
    };
    const current = [p1, p2, p3];
    const diff = computeCatalogDiff(current, stored);

    // p1, p2 unchanged → must not appear in toUpsert
    const toUpsertKeys = new Set(diff.toUpsert.map((u) => getUniqueKey(u.product)));
    expect(toUpsertKeys.has(getUniqueKey(p1))).toBe(false);
    expect(toUpsertKeys.has(getUniqueKey(p2))).toBe(false);
    // p3 has stale hash → must be in toUpsert
    expect(toUpsertKeys.has(getUniqueKey(p3))).toBe(true);
    expect(diff.toUpsert).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// T4 — computeCatalogDiff: empty stored state = first load
// ---------------------------------------------------------------------------

describe('T4 — computeCatalogDiff: empty stored state (first load)', () => {
  it('all products → toUpsert when stored is empty', () => {
    const diff = computeCatalogDiff([p1, p2, p3], {});

    expect(diff.toUpsert).toHaveLength(3);
    expect(diff.toDeleteIds).toHaveLength(0);
    expect(diff.stats.added).toBe(3);
    expect(diff.stats.unchanged).toBe(0);
  });

  it('empty current + empty stored → empty diff', () => {
    const diff = computeCatalogDiff([], {});
    expect(diff.toUpsert).toHaveLength(0);
    expect(diff.toDeleteIds).toHaveLength(0);
  });

  it('empty current + populated stored → all stored indexIds in toDeleteIds', () => {
    const stored: CatalogIndexState = {
      [getUniqueKey(p1)]: entry(p1, 0),
      [getUniqueKey(p2)]: entry(p2, 1),
    };
    const diff = computeCatalogDiff([], stored);

    expect(diff.toDeleteIds).toHaveLength(2);
    expect(diff.toDeleteIds).toContain(0);
    expect(diff.toDeleteIds).toContain(1);
    expect(diff.stats.deleted).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// T5 — loadIndexState / saveIndexState
// ---------------------------------------------------------------------------

describe('T5 — loadIndexState / saveIndexState round-trip', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    });
  });

  it('returns null when key is absent', () => {
    expect(loadIndexState('missing-key')).toBeNull();
  });

  it('saves and loads state round-trip', () => {
    const state: CatalogIndexState = {
      'tc-06': { hash: 'abc123', indexId: 0 },
      'hc-f15': { hash: 'def456', indexId: 1 },
    };
    saveIndexState('test-key', state);
    expect(loadIndexState('test-key')).toEqual(state);
  });

  it('returns null for corrupt JSON', () => {
    mockStorage['bad-key'] = 'not valid json {{{';
    expect(loadIndexState('bad-key')).toBeNull();
  });

  it('returns null when stored value is an array', () => {
    mockStorage['arr-key'] = JSON.stringify(['a', 'b']);
    expect(loadIndexState('arr-key')).toBeNull();
  });

  it('returns null when any entry is missing hash', () => {
    mockStorage['bad-entry'] = JSON.stringify({ key1: { indexId: 0 } }); // no hash
    expect(loadIndexState('bad-entry')).toBeNull();
  });

  it('returns null when any entry has non-numeric indexId', () => {
    mockStorage['bad-id'] = JSON.stringify({ key1: { hash: 'abc', indexId: 'zero' } });
    expect(loadIndexState('bad-id')).toBeNull();
  });

  it('returns null when old string-format state is encountered (migration)', () => {
    mockStorage['old-format'] = JSON.stringify({ 'tc-06': 'abc123' }); // old: string value
    expect(loadIndexState('old-format')).toBeNull();
  });

  it('saveIndexState is silent on quota errors', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
    });
    expect(() => saveIndexState('k', { 'a': { hash: 'x', indexId: 0 } })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T6 — buildIndexState
// ---------------------------------------------------------------------------

describe('T6 — buildIndexState', () => {
  it('builds state with correct keys, hashes, and indexIds', () => {
    const state = buildIndexState([p1, p2, p3]);

    expect(state[getUniqueKey(p1)]).toEqual({ hash: hashProduct(p1), indexId: 0 });
    expect(state[getUniqueKey(p2)]).toEqual({ hash: hashProduct(p2), indexId: 1 });
    expect(state[getUniqueKey(p3)]).toEqual({ hash: hashProduct(p3), indexId: 2 });
    expect(Object.keys(state)).toHaveLength(3);
  });

  it('round-trip: buildIndexState → computeCatalogDiff → zero diff', () => {
    const products = [p1, p2, p3];
    const state = buildIndexState(products);
    const diff = computeCatalogDiff(products, state);

    expect(diff.toUpsert).toHaveLength(0);
    expect(diff.toDeleteIds).toHaveLength(0);
    expect(diff.stats.unchanged).toBe(3);
  });

  it('empty product list → empty state', () => {
    expect(buildIndexState([])).toEqual({});
  });
});
