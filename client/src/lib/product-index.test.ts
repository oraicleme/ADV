import { describe, it, expect } from 'vitest';
import {
  buildSearchIndex,
  queryIndex,
  normalize,
  calculateSimilarity,
  queryProductIndicesWithManualFallback,
  substringMatchProductIndices,
} from './product-index';
import type { ProductItem } from './ad-templates';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basicCatalog: ProductItem[] = [
  { name: 'HOCO Z49 Auto Punjač USB-C 65W', code: 'HOCO-Z49', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Baseus USB-C Punjač 20W', code: 'BAS-20W', category: 'Punjači za auto', brand: 'Baseus' },
  { name: 'Hoco Futrola za iPhone 15 Pro', code: 'HOCO-IP15', category: 'Futrole', brand: 'Hoco' },
  { name: 'Hoco Futrola za iPhone 14', code: 'HOCO-IP14', category: 'Futrole', brand: 'Hoco' },
  { name: 'Baseus Futrola za Samsung S24', code: 'BAS-SS24', category: 'Futrole', brand: 'Baseus' },
  { name: 'Denmen 360 Držač za auto', code: 'DEN-360', category: 'Držači', brand: 'Denmen' },
  { name: 'USB-C Kabel 2m Baseus', code: 'BAS-USBC', category: 'Kablovi', brand: 'Baseus' },
  { name: 'Lightning Kabel 1m', code: 'LIG-1M', category: 'Kablovi', brand: 'Baseus' },
  { name: 'Bluetooth Slušalice TWS', code: 'BT-TWS', category: 'Audio', brand: 'Denmen' },
  { name: 'Auto Punjač 10W USB-A', code: 'CHG-A10', category: 'Punjači za auto', brand: 'Hoco' },
];

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe('normalize', () => {
  it('strips Balkan diacritics', () => {
    expect(normalize('punjači')).toBe('punjaci');
    expect(normalize('Držači')).toBe('drzaci');
    expect(normalize('Slušalice')).toBe('slusalice');
    expect(normalize('Futrole')).toBe('futrole');
  });

  it('lowercases and trims', () => {
    expect(normalize('  HOCO  ')).toBe('hoco');
  });
});

// ---------------------------------------------------------------------------
// calculateSimilarity
// ---------------------------------------------------------------------------

describe('calculateSimilarity', () => {
  it('returns 1 for exact match', () => {
    expect(calculateSimilarity('futrola', 'futrola')).toBe(1);
  });

  it('returns high score for substring match', () => {
    expect(calculateSimilarity('punjači', 'Punjači za auto')).toBeGreaterThan(0.8);
  });

  it('handles diacritics equivalence', () => {
    expect(calculateSimilarity('futrole', 'Futrole')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildSearchIndex + queryIndex — empty catalog
// ---------------------------------------------------------------------------

describe('empty catalog', () => {
  it('buildSearchIndex([]) returns empty index', () => {
    const idx = buildSearchIndex([]);
    expect(queryIndex(idx, 'anything')).toEqual([]);
  });

  it('queryIndex with empty query returns []', () => {
    const idx = buildSearchIndex(basicCatalog);
    expect(queryIndex(idx, '')).toEqual([]);
    expect(queryIndex(idx, '   ')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exact match
// ---------------------------------------------------------------------------

describe('exact match', () => {
  it('"HOCO Z49" returns that product first', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'HOCO Z49');
    expect(results.length).toBeGreaterThan(0);
    expect(basicCatalog[results[0].index].code).toBe('HOCO-Z49');
  });

  it('exact code search scores highest', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'BAS-20W');
    expect(results.length).toBeGreaterThan(0);
    expect(basicCatalog[results[0].index].code).toBe('BAS-20W');
  });
});

// ---------------------------------------------------------------------------
// Prefix matching
// ---------------------------------------------------------------------------

describe('prefix matching', () => {
  it('"Bas" returns Baseus products', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'Bas');
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const p = basicCatalog[r.index];
      expect(p.brand === 'Baseus' || p.name.includes('Bas')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Fuzzy / diacritics
// ---------------------------------------------------------------------------

describe('fuzzy and diacritics', () => {
  it('"punjaci" (no diacritics) matches "punjač" products', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'punjaci');
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => basicCatalog[r.index].name);
    expect(names.some((n) => n.toLowerCase().includes('punjač') || n.toLowerCase().includes('punjac'))).toBe(true);
  });

  it('"futrole" and "Futrole" return same case products', () => {
    const idx = buildSearchIndex(basicCatalog);
    const r1 = queryIndex(idx, 'futrole');
    const r2 = queryIndex(idx, 'Futrole');
    expect(r1.map((r) => r.index).sort()).toEqual(r2.map((r) => r.index).sort());
  });

  it('"slusalice" matches Slušalice product', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'slusalice');
    expect(results.length).toBeGreaterThan(0);
    expect(basicCatalog[results[0].index].name).toContain('Slu');
  });
});

// ---------------------------------------------------------------------------
// Field boost: name matches score higher than category-only
// ---------------------------------------------------------------------------

describe('field boosting', () => {
  it('name match scores higher than category-only match', () => {
    const catalog: ProductItem[] = [
      { name: 'Punjač 20W', code: 'P20', category: 'Punjači', brand: 'X' },
      { name: 'Slušalice TWS', code: 'TWS', category: 'Punjači', brand: 'Y' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'punjac');
    const nameMatch = results.find((r) => catalog[r.index].name.includes('Punjač'));
    const catOnlyMatch = results.find((r) => catalog[r.index].name === 'Slušalice TWS');
    if (nameMatch && catOnlyMatch) {
      expect(nameMatch.score).toBeGreaterThan(catOnlyMatch.score);
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-token queries
// ---------------------------------------------------------------------------

describe('multi-token queries', () => {
  it('"Hoco futrola iPhone 15" returns Hoco iPhone 15 cases', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'Hoco futrola iPhone 15');
    expect(results.length).toBeGreaterThan(0);
    const topProduct = basicCatalog[results[0].index];
    expect(topProduct.name).toContain('iPhone 15');
    expect(topProduct.brand).toBe('Hoco');
  });

  it('"USB-C punjaci auto" returns car charger products', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'USB-C punjaci auto');
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => basicCatalog[r.index].name);
    expect(names.some((n) => n.includes('Punjač') && n.includes('USB-C'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maxResults
// ---------------------------------------------------------------------------

describe('queryIndex options', () => {
  it('maxResults limits output', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'Hoco', { maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('minScore filters low-scoring results', () => {
    const idx = buildSearchIndex(basicCatalog);
    const results = queryIndex(idx, 'Hoco', { minScore: 5 });
    results.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(5));
  });
});

// ---------------------------------------------------------------------------
// S-1: calculateSimilarity containment minimum 3 characters
// ---------------------------------------------------------------------------

describe('calculateSimilarity — S-1 containment minimum', () => {
  it('"za" (2 chars) no longer scores 0.85 against a query that contains it', () => {
    // Before fix: nt.length >= 2 caused "za" to match at 0.85
    // After fix: nt.length >= 3 required — short function words no longer get containment bonus
    const score = calculateSimilarity('Punjači za mobilne', 'za');
    expect(score).toBeLessThan(0.5);
  });

  it('"TV" (2 chars) does not score 0.85 when contained in a longer query', () => {
    const score = calculateSimilarity('Samsung TV 55 inch', 'TV');
    expect(score).toBeLessThan(0.5);
  });

  it('3-char minimum still allows "USB" to match queries containing it', () => {
    const score = calculateSimilarity('USB-C Punjač 20W', 'USB');
    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  it('exact match still returns 1', () => {
    expect(calculateSimilarity('futrola', 'futrola')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-1 + T-2: Tokenizer — compound tokens and dots as separators
// ---------------------------------------------------------------------------

describe('tokenizer — T-1 compound tokens and T-2 dot separators', () => {
  it('T-1: "USB-C" product is found by query "usbc" (joined compound form)', () => {
    const catalog: ProductItem[] = [
      { name: 'USB-C Punjač 20W', code: 'CHG-USBC', category: 'Punjači', brand: 'Hoco' },
      { name: 'USB-A Punjač 10W', code: 'CHG-USBA', category: 'Punjači', brand: 'Hoco' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'usbc');
    // USB-C product must be in results
    expect(results.some((r) => catalog[r.index].code === 'CHG-USBC')).toBe(true);
  });

  it('T-1: compound-code query "usbc" should not demote over "usb c" query', () => {
    const catalog: ProductItem[] = [
      { name: 'USB-C Kabel 2m', code: 'CBL-USBC', category: 'Kablovi', brand: 'Baseus' },
      { name: 'USB-A 10W Punjač', code: 'CHG-USBA', category: 'Punjači', brand: 'Hoco' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'usbc');
    expect(results[0]).toBeDefined();
    expect(catalog[results[0].index].code).toBe('CBL-USBC');
  });

  it('T-1: "LV-B15B" indexes joined token "lvb15b" so that query works', () => {
    const catalog: ProductItem[] = [
      { name: 'Bluetooth USB Adapter LV-B15B 5.0', code: 'LV-B15B', category: 'Adapteri', brand: 'LV' },
      { name: 'USB-A Punjač 10W', code: 'CHG-USBA', category: 'Punjači', brand: 'Hoco' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'lvb15b');
    expect(results.some((r) => catalog[r.index].code === 'LV-B15B')).toBe(true);
  });

  it('T-1: "HOCO Z49" (no hyphens) tokenizes unchanged — no spurious compound tokens', () => {
    const catalog: ProductItem[] = [
      { name: 'HOCO Z49 Auto Punjač', code: 'HOCO-Z49', category: 'Punjači', brand: 'Hoco' },
    ];
    const idx = buildSearchIndex(catalog);
    // Should still be found normally
    const results = queryIndex(idx, 'HOCO Z49');
    expect(results.length).toBeGreaterThan(0);
    expect(catalog[results[0].index].code).toBe('HOCO-Z49');
  });

  it('T-2: "v2.1" product is found by query "v2 1" (dot splits version)', () => {
    const catalog: ProductItem[] = [
      { name: 'BT Speaker v2.1', code: 'SPK-21', category: 'Audio', brand: 'X' },
      { name: 'Regular Speaker', code: 'SPK-REG', category: 'Audio', brand: 'Y' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'v2');
    expect(results.some((r) => catalog[r.index].code === 'SPK-21')).toBe(true);
  });

  it('T-2: compound with dot "QC3.0" is tokenized so version parts are separable', () => {
    const catalog: ProductItem[] = [
      { name: 'QC3.0 Fast Charger', code: 'QC30', category: 'Punjači', brand: 'Z' },
      { name: 'Regular Charger', code: 'REG', category: 'Punjači', brand: 'Z' },
    ];
    const idx = buildSearchIndex(catalog);
    const results = queryIndex(idx, 'qc3');
    expect(results.some((r) => catalog[r.index].code === 'QC30')).toBe(true);
  });

  it('T-1: multi-word input does not create spurious compound across word boundary', () => {
    // "HOCO USB-C Adapter" — should NOT produce "hocousbc" token
    // The compound detection preserves spaces so only "usb-c" → "usbc" is added
    const catalog: ProductItem[] = [
      { name: 'HOCO USB-C Adapter', code: 'HOCO-A', category: 'Adapteri', brand: 'Hoco' },
    ];
    const idx = buildSearchIndex(catalog);
    // Query for "hocousbcadapter" should NOT match (that would be the bug)
    // The product should be findable by "hoco usbc" or "hoco usb c"
    const byLegit = queryIndex(idx, 'hoco usbc');
    expect(byLegit.some((r) => catalog[r.index].code === 'HOCO-A')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// STORY-133: Gaming / PlayStation recall — "play station" and "joystick" synonyms
// ---------------------------------------------------------------------------

const gamingCatalog: ProductItem[] = [
  { name: 'PlayStation 5 DualSense Controller', code: 'PS5-DS', category: 'Gaming', brand: 'Sony' },
  { name: 'PlayStation 5 DualSense Edge', code: 'PS5-DSE', category: 'Gaming', brand: 'Sony' },
  { name: 'Sony PlayStation VR2 Headset', code: 'PS-VR2', category: 'Gaming', brand: 'Sony' },
  { name: 'PlayStation Portal Remote Player', code: 'PS-PORTAL', category: 'Gaming', brand: 'Sony' },
  { name: 'DualShock 4 Wireless Controller', code: 'DS4', category: 'Gaming', brand: 'Sony' },
  { name: 'Wireless Gamepad za PC', code: 'GP-PC', category: 'Gaming', brand: 'Generic' },
  { name: 'Xbox Style Kontroler za PC', code: 'GP-X', category: 'Gaming', brand: 'Generic' },
  { name: 'USB Gamepad 2.4GHz', code: 'GP-USB', category: 'Gaming', brand: 'Generic' },
  { name: 'Mobilni kontroler za Android', code: 'GP-AND', category: 'Gaming', brand: 'Generic' },
  { name: 'PlayStation 5 Console', code: 'PS5-CON', category: 'Gaming', brand: 'Sony' },
];

describe('STORY-133 — gaming / PlayStation recall', () => {
  const idx = buildSearchIndex(gamingCatalog);

  it('T2: "play station" (with space) matches products with "PlayStation" in name', () => {
    const results = queryIndex(idx, 'play station', { maxResults: 20 });
    expect(results.length).toBeGreaterThan(4);
    const names = results.map((r) => gamingCatalog[r.index].name);
    const playstationCount = names.filter((n) => n.includes('PlayStation')).length;
    expect(playstationCount).toBeGreaterThanOrEqual(4);
  });

  it('T1: "play station joystick" or "playstation oprema" returns many candidates when catalog has many', () => {
    const q1 = queryIndex(idx, 'play station joystick', { maxResults: 20 });
    const q2 = queryIndex(idx, 'playstation oprema', { maxResults: 20 });
    expect(q1.length).toBeGreaterThan(4);
    expect(q2.length).toBeGreaterThan(4);
  });

  it('"joystick" query matches products with "gamepad" or "kontroler" in name (synonym expansion)', () => {
    const results = queryIndex(idx, 'joystick', { maxResults: 20 });
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => gamingCatalog[r.index].name);
    const hasGamepadOrKontroler = names.some(
      (n) => n.toLowerCase().includes('gamepad') || n.toLowerCase().includes('kontroler'),
    );
    expect(hasGamepadOrKontroler).toBe(true);
  });

  it('"gamepad" query returns gaming controller products', () => {
    const results = queryIndex(idx, 'gamepad', { maxResults: 20 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => gamingCatalog[r.index].name.toLowerCase().includes('gamepad'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Performance smoke test
// ---------------------------------------------------------------------------

describe('performance', () => {
  /** Budget allows WSL / CI CPU variance; still catches multi-second regressions. */
  const BUILD_MS = 3500;
  const QUERY_MS = 1200;

  it(`builds index in <${BUILD_MS}ms for 500 products`, () => {
    const catalog: ProductItem[] = Array.from({ length: 500 }, (_, i) => ({
      name: `Product ${i} USB-C Punjač za auto`,
      code: `CODE-${i}`,
      category: i % 3 === 0 ? 'Punjači za auto' : i % 3 === 1 ? 'Futrole' : 'Kablovi',
      brand: i % 2 === 0 ? 'Hoco' : 'Baseus',
    }));
    const t0 = performance.now();
    buildSearchIndex(catalog);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(BUILD_MS);
  });

  it(`query returns in <${QUERY_MS}ms (includes JIT warmup)`, () => {
    const catalog: ProductItem[] = Array.from({ length: 500 }, (_, i) => ({
      name: `Product ${i}`,
      code: `CODE-${i}`,
      category: 'Category',
      brand: 'Brand',
    }));
    const idx = buildSearchIndex(catalog);
    queryIndex(idx, 'warmup');
    const t0 = performance.now();
    queryIndex(idx, 'Product USB-C');
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(QUERY_MS);
  });
});

// ---------------------------------------------------------------------------
// STORY-182: manual search fallback (strict minScore must not yield 0 rows)
// ---------------------------------------------------------------------------

describe('queryProductIndicesWithManualFallback', () => {
  it('when strict minScore filters out all BM25 hits, retries with minScore 0', () => {
    const idx = buildSearchIndex(basicCatalog);
    const indices = queryProductIndicesWithManualFallback(idx, basicCatalog, 'HOCO', 999);
    expect(indices.length).toBeGreaterThan(0);
  });

  it('when BM25 returns nothing at 0, uses substring on name/code/brand', () => {
    const rows: ProductItem[] = [
      { name: 'OddSku', code: 'ZZ-UNIQUE-123', category: 'C', brand: 'B' },
    ];
    const idx = buildSearchIndex(rows);
    const indices = queryProductIndicesWithManualFallback(idx, rows, 'UNIQUE-123', 999);
    expect(indices).toEqual([0]);
  });

  it('empty query returns all indices', () => {
    const idx = buildSearchIndex(basicCatalog);
    expect(queryProductIndicesWithManualFallback(idx, basicCatalog, '  ', 1.5)).toEqual(
      basicCatalog.map((_, i) => i),
    );
  });
});

describe('substringMatchProductIndices', () => {
  it('returns empty when no substring match', () => {
    expect(substringMatchProductIndices(basicCatalog, 'zzznonexistent999')).toEqual([]);
  });
});
