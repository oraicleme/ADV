/**
 * STORY-121: End-to-end pipeline tests
 *
 * Validates the complete two-stage search architecture:
 *   Stage 1 — buildSearchIndex + queryIndex (this file)
 *   Stage 2 — LLM rerank (catalog.selectProducts, not tested here — requires real API)
 *
 * Also covers agent-actions catalog_filter using the new searchIndex path.
 *
 * Key scenarios from the story:
 *   ✓ "USB-C punjači za kola"  → charger candidates returned
 *   ✓ "Hoco futrola za iPhone 15" → Hoco iPhone 15 case returned
 *   ✓ "HOCO Z49" → exact model match scores first
 *   ✓ nameContains path in agent-actions uses MiniSearch via searchIndex
 *   ✓ Old Levenshtein system is GONE (no import from product-search)
 */

import { describe, it, expect, vi } from 'vitest';
import { buildSearchIndex, queryIndex } from './product-index';
import { applyAgentActions, type AgentAction, type ExtendedCanvasSetters } from './agent-actions';
import type { ProductItem } from './ad-templates';

// ---------------------------------------------------------------------------
// Realistic catalog — simulates a Mobileland-style catalog slice
// ---------------------------------------------------------------------------

const realisticCatalog: ProductItem[] = [
  // Car chargers (Punjači za auto)
  { name: 'HOCO Z49 Level Single Port QC3.0 Car Charger', code: 'HOCO-Z49', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'HOCO Z52 Sight USB-C 20W Car Charger', code: 'HOCO-Z52', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Baseus USB-C PD 65W Car Charger', code: 'BAS-65W', category: 'Punjači za auto', brand: 'Baseus' },
  { name: 'Baseus Compact 30W Type-C Auto Punjač', code: 'BAS-30W', category: 'Punjači za auto', brand: 'Baseus' },
  { name: 'Denmen Car Charger 20W DC11', code: 'DEN-DC11', category: 'Punjači za auto', brand: 'Denmen' },
  { name: 'USB-A Auto Punjač 12W', code: 'USB-A-12', category: 'Punjači za auto', brand: 'Hoco' },

  // Phone cases (Futrole)
  { name: 'Hoco Futrola za iPhone 15 Pro Magnetic', code: 'HOCO-IP15P', category: 'Futrole', brand: 'Hoco' },
  { name: 'Hoco Futrola za iPhone 15 Clear Case', code: 'HOCO-IP15', category: 'Futrole', brand: 'Hoco' },
  { name: 'Hoco Futrola za iPhone 14 Pro', code: 'HOCO-IP14P', category: 'Futrole', brand: 'Hoco' },
  { name: 'Baseus Futrola za Samsung Galaxy S24', code: 'BAS-SS24', category: 'Futrole', brand: 'Baseus' },
  { name: 'Baseus Futrola za iPhone 15 Ultra Thin', code: 'BAS-IP15', category: 'Futrole', brand: 'Baseus' },

  // Cables (Kablovi)
  { name: 'Baseus USB-C Kabel 2m 60W', code: 'BAS-USBC2', category: 'Kablovi', brand: 'Baseus' },
  { name: 'Hoco Lightning Kabel 1.2m', code: 'HOCO-LIG', category: 'Kablovi', brand: 'Hoco' },
  { name: 'Micro USB Kabel 1m', code: 'MUSB-1M', category: 'Kablovi', brand: 'Denmen' },

  // Holders (Držači)
  { name: 'Denmen 360 Držač za auto', code: 'DEN-360', category: 'Držači', brand: 'Denmen' },
  { name: 'Hoco Magnetic Phone Holder Car', code: 'HOCO-MAG', category: 'Držači', brand: 'Hoco' },

  // Audio
  { name: 'Bluetooth Slušalice TWS Denmen', code: 'DEN-TWS', category: 'Audio', brand: 'Denmen' },

  // Adapters (unrelated — should NOT appear in charger searches)
  { name: 'Bluetooth USB Adapter LV-B15B 5.0', code: 'LV-B15B', category: 'Adapteri', brand: 'LV' },
  { name: 'Micro USB to LAN Adapter', code: 'MUSB-LAN', category: 'Adapteri', brand: 'Generic' },
];

// ---------------------------------------------------------------------------
// Stage 1: MiniSearch recall — the scenarios that failed with the old system
// ---------------------------------------------------------------------------

describe('Stage 1 — MiniSearch recall (was broken before)', () => {
  const idx = buildSearchIndex(realisticCatalog);

  it('"USB-C punjači za kola" → returns car charger candidates (OLD SYSTEM RETURNED 0)', () => {
    const results = queryIndex(idx, 'USB-C punjači za kola', { maxResults: 100 });
    expect(results.length).toBeGreaterThan(0);

    const names = results.map((r) => realisticCatalog[r.index].name);
    // Must include USB-C car chargers
    expect(names.some((n) => n.includes('USB-C') && n.toLowerCase().includes('punjač') || n.toLowerCase().includes('car'))).toBe(true);
    // The Bluetooth adapter should NOT be in top results
    const topNames = results.slice(0, 5).map((r) => realisticCatalog[r.index].name);
    expect(topNames).not.toContain('Bluetooth USB Adapter LV-B15B 5.0');
  });

  it('"Hoco futrola za iPhone 15" → returns Hoco iPhone 15 cases', () => {
    const results = queryIndex(idx, 'Hoco futrola za iPhone 15', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);

    const top = realisticCatalog[results[0].index];
    expect(top.brand).toBe('Hoco');
    expect(top.name).toContain('iPhone 15');
    expect(top.category).toBe('Futrole');
  });

  it('"HOCO Z49" → exact model match scores first', () => {
    const results = queryIndex(idx, 'HOCO Z49', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(realisticCatalog[results[0].index].code).toBe('HOCO-Z49');
  });

  it('"punjaci" (no diacritics) → finds "Punjač" products', () => {
    const results = queryIndex(idx, 'punjaci', { maxResults: 20 });
    expect(results.length).toBeGreaterThan(0);
    const hasCharger = results.some((r) =>
      realisticCatalog[r.index].name.toLowerCase().includes('punjač') ||
      realisticCatalog[r.index].category.toLowerCase().includes('punjač'),
    );
    expect(hasCharger).toBe(true);
  });

  it('"Bas" prefix → returns Baseus products', () => {
    const results = queryIndex(idx, 'Bas', { maxResults: 20 });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const p = realisticCatalog[r.index];
      expect(p.brand === 'Baseus' || p.name.includes('Bas') || p.code.includes('Bas')).toBe(true);
    });
  });

  it('"drzaci" (no diacritics) → finds "Držači" products', () => {
    const results = queryIndex(idx, 'drzaci', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);
    const hasHolder = results.some((r) => realisticCatalog[r.index].category === 'Držači');
    expect(hasHolder).toBe(true);
  });

  it('"slusalice" → finds Bluetooth headphones', () => {
    const results = queryIndex(idx, 'slusalice', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(realisticCatalog[results[0].index].name).toContain('Slu');
  });

  it('"slušalice" (with diacritic) → finds Bluetooth Slušalice (STORY-124)', () => {
    const results = queryIndex(idx, 'slušalice', { maxResults: 10 });
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => realisticCatalog[r.index].name);
    expect(names.some((n) => n.includes('Slušalice') || n.toLowerCase().includes('slusalice'))).toBe(true);
  });

  it('"slusalice denmen" / "slušalice brand demenn" → finds Denmen TWS (STORY-124 user scenario)', () => {
    const queries = ['slusalice denmen', 'slušalice brand demenn', 'slusalice brand denmen'];
    for (const q of queries) {
      const results = queryIndex(idx, q, { maxResults: 20 });
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => realisticCatalog[r.index].name);
      const hasDenmenTws = names.some(
        (n) => n.includes('Bluetooth') && n.includes('Denmen') && (n.includes('Slušalice') || n.includes('TWS')),
      );
      expect(hasDenmenTws).toBe(true);
    }
  });

  it('"Lightning kabel" → finds cables, NOT chargers', () => {
    const results = queryIndex(idx, 'Lightning kabel', { maxResults: 5 });
    expect(results.length).toBeGreaterThan(0);
    const topName = realisticCatalog[results[0].index].name;
    expect(topName).toContain('Lightning');
  });

  it('results are sorted by score descending', () => {
    const results = queryIndex(idx, 'Hoco iPhone 15 futrola', { maxResults: 10 });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('agent path (minScore 0) returns candidates for "slusalice" so LLM is not starved (STORY-124)', () => {
    const results = queryIndex(idx, 'slusalice', { maxResults: 100, minScore: 0 });
    expect(results.length).toBeGreaterThan(0);
    expect(realisticCatalog[results[0].index].name).toContain('Slu');
  });
});

// ---------------------------------------------------------------------------
// Stage 2 simulation: MiniSearch narrows → LLM would pick
// (We mock the LLM selection step by manually filtering top candidates)
// ---------------------------------------------------------------------------

describe('Two-stage pipeline simulation', () => {
  const idx = buildSearchIndex(realisticCatalog);

  it('"USB-C punjači za kola": top 100 candidates contain all USB-C car chargers', () => {
    const candidates = queryIndex(idx, 'USB-C punjači za kola', { maxResults: 100 });
    const candidateNames = candidates.map((r) => realisticCatalog[r.index].name);

    // All three USB-C car chargers must be in the candidate pool for the LLM
    expect(candidateNames).toContain('HOCO Z52 Sight USB-C 20W Car Charger');
    expect(candidateNames).toContain('Baseus USB-C PD 65W Car Charger');
    expect(candidateNames).toContain('Baseus Compact 30W Type-C Auto Punjač');
  });

  it('"Hoco futrola iPhone 15": candidate pool has both iPhone 15 Hoco cases', () => {
    const candidates = queryIndex(idx, 'Hoco futrola iPhone 15', { maxResults: 100 });
    const candidateNames = candidates.map((r) => realisticCatalog[r.index].name);

    expect(candidateNames).toContain('Hoco Futrola za iPhone 15 Pro Magnetic');
    expect(candidateNames).toContain('Hoco Futrola za iPhone 15 Clear Case');
  });

  it('LV-B15B adapter is NOT in top 10 charger candidates', () => {
    const candidates = queryIndex(idx, 'USB-C punjači za kola', { maxResults: 10 });
    const candidateNames = candidates.map((r) => realisticCatalog[r.index].name);
    expect(candidateNames).not.toContain('Bluetooth USB Adapter LV-B15B 5.0');
  });
});

// ---------------------------------------------------------------------------
// agent-actions: catalog_filter with searchIndex (STORY-121 nameToIndices path)
// ---------------------------------------------------------------------------

function makeFilter(payload: object): AgentAction {
  return { type: 'catalog_filter', payload };
}

function makeSetters(overrides?: Partial<ExtendedCanvasSetters>): ExtendedCanvasSetters {
  return {
    setHeadline: vi.fn(),
    setTitleFontSize: vi.fn(),
    setEmojiOrIcon: vi.fn(),
    setBadgeText: vi.fn(),
    setCtaButtons: vi.fn(),
    setDisclaimerText: vi.fn(),
    setLogoHeight: vi.fn(),
    setLogoAlignment: vi.fn(),
    setLogoCompanion: vi.fn(),
    setProductBlockOptions: vi.fn(),
    setLayout: vi.fn(),
    setStyle: vi.fn(),
    setElementOrder: vi.fn(),
    setFormat: vi.fn(),
    ...overrides,
  } as ExtendedCanvasSetters;
}

describe('agent-actions catalog_filter — MiniSearch nameToIndices path', () => {
  const idx = buildSearchIndex(realisticCatalog);

  it('nameContains "USB-C punjač" with searchIndex returns charger products', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      searchIndex: idx,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    applyAgentActions([makeFilter({ nameContains: 'USB-C punjač' })], setters);

    expect(selected.length).toBe(1);
    const names = [...selected[0]!].map((i) => realisticCatalog[i].name);
    // Charger products must be in the results
    expect(names.some((n) => n.includes('Punjač') || n.includes('Car Charger'))).toBe(true);
    // Note: without a category filter, BM25 may include the USB adapter because it contains "USB".
    // The LLM rerank stage (catalog.selectProducts) would eliminate it from final selection.
    // For a clean filter, combine with category: use the test below.
  });

  it('nameContains "USB-C punjač" + category "Punjači za auto" excludes adapters', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      searchIndex: idx,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    applyAgentActions([makeFilter({ nameContains: 'USB-C punjač', category: 'Punjači za auto' })], setters);

    expect(selected.length).toBe(1);
    const names = [...selected[0]!].map((i) => realisticCatalog[i].name);
    expect(names.some((n) => n.includes('Punjač') || n.includes('Car Charger'))).toBe(true);
    expect(names).not.toContain('Bluetooth USB Adapter LV-B15B 5.0');
    expect(names).not.toContain('Baseus Futrola za Samsung Galaxy S24');
  });

  it('nameContains "Hoco iPhone 15" + category "Futrole" returns Hoco iPhone 15 cases', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      searchIndex: idx,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    applyAgentActions([makeFilter({ nameContains: 'Hoco iPhone 15', category: 'Futrole' })], setters);

    expect(selected.length).toBe(1);
    const names = [...selected[0]!].map((i) => realisticCatalog[i].name);
    expect(names.some((n) => n.includes('iPhone 15') && n.includes('Hoco'))).toBe(true);
    names.forEach((n) => expect(realisticCatalog[[...selected[0]!].find(i => realisticCatalog[i].name === n)!]?.category).toBe('Futrole'));
  });

  it('resolvedIndices path bypasses searchIndex entirely', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      searchIndex: idx,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    // Pre-resolved indices: directly select the two car charger codes
    applyAgentActions([makeFilter({ resolvedIndices: [0, 1, 2], deselectOthers: true })], setters);

    expect(selected[0]).toEqual(new Set([0, 1, 2]));
  });

  it('nameContains without searchIndex still works (builds index on the fly)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      // No searchIndex provided — should build one internally
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    applyAgentActions([makeFilter({ nameContains: 'Denmen' })], setters);

    expect(selected.length).toBe(1);
    const indices = [...selected[0]!];
    expect(indices.length).toBeGreaterThan(0);
    indices.forEach((i) => {
      const p = realisticCatalog[i];
      expect(p.brand === 'Denmen' || p.name.includes('Denmen')).toBe(true);
    });
  });

  it('nameContains "slusalice" without searchIndex returns Audio product (STORY-124 fallback path)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: realisticCatalog,
      searchIndex: null as unknown as import('./product-index').ProductSearchIndex,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });

    applyAgentActions([makeFilter({ nameContains: 'slusalice' })], setters);

    expect(selected.length).toBe(1);
    const names = [...selected[0]!].map((i) => realisticCatalog[i].name);
    expect(names.some((n) => n.includes('Slušalice') || n.includes('Bluetooth'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Confirm old product-search.ts is GONE (no accidental imports)
// ---------------------------------------------------------------------------

describe('product-search.ts is deleted — no stale imports', () => {
  it('product-index exports normalize and calculateSimilarity (moved from product-search)', async () => {
    const module = await import('./product-index');
    expect(typeof module.normalize).toBe('function');
    expect(typeof module.calculateSimilarity).toBe('function');
    expect(typeof module.buildSearchIndex).toBe('function');
    expect(typeof module.queryIndex).toBe('function');
  });

  it('normalize strips Balkan diacritics correctly', async () => {
    const { normalize } = await import('./product-index');
    expect(normalize('punjači')).toBe('punjaci');
    expect(normalize('Futrole za iPhone')).toBe('futrole za iphone');
    expect(normalize('Držač')).toBe('drzac');
  });

  it('calculateSimilarity works for category matching', async () => {
    const { calculateSimilarity } = await import('./product-index');
    expect(calculateSimilarity('Punjači za auto', 'Punjači za auto')).toBe(1);
    expect(calculateSimilarity('punjaci', 'Punjači za auto')).toBeGreaterThan(0.5);
    expect(calculateSimilarity('futrole', 'Futrole')).toBe(1);
  });
});
