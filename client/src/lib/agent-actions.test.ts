/**
 * STORY-62: Tests for agent-actions.ts
 * Covers applyAgentActions() for all six action types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyAgentActions,
  extractLastCatalogFilterQueryText,
  resolveFormatId,
  resolveFontFamily,
  type AgentAction,
  type ExtendedCanvasSetters,
} from './agent-actions';
import { DEFAULT_STYLE, DEFAULT_PRODUCT_BLOCK_OPTIONS } from './ad-constants';

// ---- Helpers ----

function makeSetters(overrides?: Partial<ExtendedCanvasSetters>): ExtendedCanvasSetters & {
  calls: Record<string, unknown[][]>;
} {
  const calls: Record<string, unknown[][]> = {};
  const track =
    (name: string) =>
    (...args: unknown[]) => {
      calls[name] = [...(calls[name] ?? []), args];
    };

  return {
    setHeadline: vi.fn(track('setHeadline')),
    setTitleFontSize: vi.fn(track('setTitleFontSize')),
    setEmojiOrIcon: vi.fn(track('setEmojiOrIcon')),
    setBadgeText: vi.fn(track('setBadgeText')),
    setCtaButtons: vi.fn(track('setCtaButtons')),
    setDisclaimerText: vi.fn(track('setDisclaimerText')),
    setLogoHeight: vi.fn(track('setLogoHeight')),
    setLogoAlignment: vi.fn(track('setLogoAlignment')),
    setLogoCompanion: vi.fn(track('setLogoCompanion')),
    setProductBlockOptions: vi.fn(track('setProductBlockOptions')),
    setLayout: vi.fn(track('setLayout')),
    setStyle: vi.fn(track('setStyle')),
    setElementOrder: vi.fn(track('setElementOrder')),
    setFormat: vi.fn(track('setFormat')),
    setSelectedProductIndices: vi.fn(track('setSelectedProductIndices')),
    calls,
    ...overrides,
  } as ExtendedCanvasSetters & { calls: Record<string, unknown[][]> };
}

// ---- block_patch ----

describe('applyAgentActions — block_patch', () => {
  it('applies a single headline text patch', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'block_patch', payload: { blockType: 'headline', property: 'text', value: 'Hello' } }],
      setters,
    );
    expect(setters.setHeadline).toHaveBeenCalledWith('Hello');
  });

  it('applies a headline fontSize patch', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'block_patch', payload: { blockType: 'headline', property: 'fontSize', value: 48 } }],
      setters,
    );
    expect(setters.setTitleFontSize).toHaveBeenCalledWith(48);
  });

  it('applies a badge text patch', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'block_patch', payload: { blockType: 'badge', property: 'text', value: 'SALE' } }],
      setters,
    );
    expect(setters.setBadgeText).toHaveBeenCalledWith('SALE');
  });

  it('silently discards invalid block patches (out-of-range fontSize)', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'block_patch', payload: { blockType: 'headline', property: 'fontSize', value: 999 } }],
      setters,
    );
    expect(setters.setTitleFontSize).not.toHaveBeenCalled();
  });

  it('handles an array of patches in the payload', () => {
    const setters = makeSetters();
    applyAgentActions(
      [
        {
          type: 'block_patch',
          payload: [
            { blockType: 'headline', property: 'text', value: 'Hi' },
            { blockType: 'badge', property: 'text', value: 'NEW' },
          ],
        },
      ],
      setters,
    );
    expect(setters.setHeadline).toHaveBeenCalledWith('Hi');
    expect(setters.setBadgeText).toHaveBeenCalledWith('NEW');
  });
});

// ---- layout_change ----

describe('applyAgentActions — layout_change', () => {
  it('calls setLayout with a valid layout id', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'layout_change', payload: { layout: 'single-hero' } }],
      setters,
    );
    expect(setters.setLayout).toHaveBeenCalledWith('single-hero');
  });

  it('ignores invalid layout ids', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'layout_change', payload: { layout: 'not-a-layout' } }],
      setters,
    );
    expect(setters.setLayout).not.toHaveBeenCalled();
  });

  it('applies all four valid layout ids', () => {
    const layouts = ['multi-grid', 'single-hero', 'category-group', 'sale-discount'] as const;
    for (const layout of layouts) {
      const setters = makeSetters();
      applyAgentActions([{ type: 'layout_change', payload: { layout } }], setters);
      expect(setters.setLayout).toHaveBeenCalledWith(layout);
    }
  });
});

// ---- format_change ----

describe('applyAgentActions — format_change', () => {
  it('resolves "story" alias to viber-story', () => {
    const setters = makeSetters();
    applyAgentActions([{ type: 'format_change', payload: { format: 'story' } }], setters);
    expect(setters.setFormat).toHaveBeenCalledWith('viber-story');
  });

  it('resolves "post" alias to instagram-square', () => {
    const setters = makeSetters();
    applyAgentActions([{ type: 'format_change', payload: { format: 'post' } }], setters);
    expect(setters.setFormat).toHaveBeenCalledWith('instagram-square');
  });

  it('resolves "landscape" alias to facebook-landscape', () => {
    const setters = makeSetters();
    applyAgentActions([{ type: 'format_change', payload: { format: 'landscape' } }], setters);
    expect(setters.setFormat).toHaveBeenCalledWith('facebook-landscape');
  });

  it('passes through unknown format ids unchanged', () => {
    const setters = makeSetters();
    applyAgentActions([{ type: 'format_change', payload: { format: 'custom-format' } }], setters);
    expect(setters.setFormat).toHaveBeenCalledWith('custom-format');
  });

  it('does nothing if setFormat is not provided', () => {
    const setters = makeSetters({ setFormat: undefined });
    expect(() =>
      applyAgentActions([{ type: 'format_change', payload: { format: 'story' } }], setters),
    ).not.toThrow();
  });
});

// ---- style_change ----

describe('applyAgentActions — style_change', () => {
  it('updates backgroundColor when valid hex is provided', () => {
    const setters = makeSetters();
    let capturedStyle = { ...DEFAULT_STYLE };
    setters.setStyle = vi.fn((updater) => {
      capturedStyle = updater(capturedStyle);
    });
    applyAgentActions(
      [{ type: 'style_change', payload: { backgroundColor: '#1a1a2e' } }],
      setters,
    );
    expect(capturedStyle.backgroundColor).toBe('#1a1a2e');
  });

  it('updates accentColor when valid hex is provided', () => {
    const setters = makeSetters();
    let capturedStyle = { ...DEFAULT_STYLE };
    setters.setStyle = vi.fn((updater) => {
      capturedStyle = updater(capturedStyle);
    });
    applyAgentActions([{ type: 'style_change', payload: { accentColor: '#e94560' } }], setters);
    expect(capturedStyle.accentColor).toBe('#e94560');
  });

  it('ignores invalid hex colors', () => {
    const setters = makeSetters();
    let callCount = 0;
    let capturedStyle = { ...DEFAULT_STYLE };
    setters.setStyle = vi.fn((updater) => {
      callCount++;
      capturedStyle = updater(capturedStyle);
    });
    applyAgentActions(
      [{ type: 'style_change', payload: { backgroundColor: 'notacolor' } }],
      setters,
    );
    // setStyle is still called but backgroundColor is unchanged
    if (callCount > 0) {
      expect(capturedStyle.backgroundColor).toBe(DEFAULT_STYLE.backgroundColor);
    }
  });

  it('resolves font family alias "serif" to Georgia', () => {
    const setters = makeSetters();
    let capturedStyle = { ...DEFAULT_STYLE };
    setters.setStyle = vi.fn((updater) => {
      capturedStyle = updater(capturedStyle);
    });
    applyAgentActions([{ type: 'style_change', payload: { fontFamily: 'serif' } }], setters);
    expect(capturedStyle.fontFamily).toContain('Georgia');
  });

  it('resolves font alias "mono" to Courier', () => {
    const setters = makeSetters();
    let capturedStyle = { ...DEFAULT_STYLE };
    setters.setStyle = vi.fn((updater) => {
      capturedStyle = updater(capturedStyle);
    });
    applyAgentActions([{ type: 'style_change', payload: { fontFamily: 'mono' } }], setters);
    expect(capturedStyle.fontFamily).toContain('Courier');
  });
});

// ---- product_action ----

describe('applyAgentActions — product_action', () => {
  it('selects product indices', () => {
    const setters = makeSetters();
    let currentSet = new Set<number>([0, 1]);
    setters.setSelectedProductIndices = vi.fn((updater) => {
      currentSet = updater(currentSet);
    });
    applyAgentActions(
      [{ type: 'product_action', payload: { action: 'select', indices: [2, 3] } }],
      setters,
    );
    expect(currentSet).toEqual(new Set([0, 1, 2, 3]));
  });

  it('deselects product indices', () => {
    const setters = makeSetters();
    let currentSet = new Set<number>([0, 1, 2, 3]);
    setters.setSelectedProductIndices = vi.fn((updater) => {
      currentSet = updater(currentSet);
    });
    applyAgentActions(
      [{ type: 'product_action', payload: { action: 'deselect', indices: [2, 3] } }],
      setters,
    );
    expect(currentSet).toEqual(new Set([0, 1]));
  });

  it('reorders by replacing selection with new indices', () => {
    const setters = makeSetters();
    let currentSet = new Set<number>([0, 1, 2, 3]);
    setters.setSelectedProductIndices = vi.fn((updater) => {
      currentSet = updater(currentSet);
    });
    applyAgentActions(
      [{ type: 'product_action', payload: { action: 'reorder', indices: [2, 0] } }],
      setters,
    );
    expect(currentSet).toEqual(new Set([2, 0]));
  });

  it('ignores negative indices', () => {
    const setters = makeSetters();
    let currentSet = new Set<number>([0, 1]);
    setters.setSelectedProductIndices = vi.fn((updater) => {
      currentSet = updater(currentSet);
    });
    applyAgentActions(
      [{ type: 'product_action', payload: { action: 'select', indices: [-1, 2] } }],
      setters,
    );
    expect(currentSet).toEqual(new Set([0, 1, 2])); // -1 filtered out
  });
});

// ---- element_reorder ----

describe('applyAgentActions — element_reorder', () => {
  it('sets element order with valid keys', () => {
    const setters = makeSetters();
    applyAgentActions(
      [
        {
          type: 'element_reorder',
          payload: { order: ['badge', 'headline', 'products', 'cta', 'disclaimer'] },
        },
      ],
      setters,
    );
    expect(setters.setElementOrder).toHaveBeenCalledWith([
      'badge',
      'headline',
      'products',
      'cta',
      'disclaimer',
    ]);
  });

  it('filters out invalid element keys', () => {
    const setters = makeSetters();
    applyAgentActions(
      [
        {
          type: 'element_reorder',
          payload: { order: ['headline', 'invalid-key', 'products'] },
        },
      ],
      setters,
    );
    expect(setters.setElementOrder).toHaveBeenCalledWith(['headline', 'products']);
  });

  it('does nothing if order array is empty after filtering', () => {
    const setters = makeSetters();
    applyAgentActions(
      [{ type: 'element_reorder', payload: { order: ['bad1', 'bad2'] } }],
      setters,
    );
    expect(setters.setElementOrder).not.toHaveBeenCalled();
  });
});

// ---- error resilience ----

describe('applyAgentActions — error resilience', () => {
  it('never throws on completely malformed actions', () => {
    const setters = makeSetters();
    const malformed: AgentAction[] = [
      { type: 'block_patch', payload: null },
      { type: 'layout_change', payload: undefined },
      { type: 'style_change', payload: 'not-an-object' },
      { type: 'product_action', payload: { action: 'select', indices: 'not-array' } },
    ];
    expect(() => applyAgentActions(malformed, setters)).not.toThrow();
  });

  it('processes valid actions even when mixed with invalid ones', () => {
    const setters = makeSetters();
    applyAgentActions(
      [
        { type: 'layout_change', payload: null } as AgentAction, // invalid
        { type: 'layout_change', payload: { layout: 'multi-grid' } }, // valid
      ],
      setters,
    );
    expect(setters.setLayout).toHaveBeenCalledWith('multi-grid');
  });
});

// ---- Helper function tests ----

describe('extractLastCatalogFilterQueryText (STORY-194)', () => {
  it('returns empty when no catalog_filter', () => {
    expect(extractLastCatalogFilterQueryText([{ type: 'layout_change', payload: { layout: 'single-hero' } }])).toBe('');
  });

  it('prefers last non-empty query in order', () => {
    expect(
      extractLastCatalogFilterQueryText([
        { type: 'catalog_filter', payload: { query: 'first' } },
        { type: 'catalog_filter', payload: { query: 'USB-C punjači' } },
      ]),
    ).toBe('USB-C punjači');
  });

  it('falls back to nameContains when query missing', () => {
    expect(
      extractLastCatalogFilterQueryText([{ type: 'catalog_filter', payload: { nameContains: 'Denmen' } }]),
    ).toBe('Denmen');
  });

  it('query wins over nameContains in same payload', () => {
    expect(
      extractLastCatalogFilterQueryText([
        { type: 'catalog_filter', payload: { query: 'alpha', nameContains: 'beta' } },
      ]),
    ).toBe('alpha');
  });
});

// ---- catalog_filter (STORY-69) ----

describe('applyAgentActions — catalog_filter', () => {
  const products = [
    { name: 'Proizvod Alpha', category: 'Tip A', code: 'PA1' },
    { name: 'Proizvod Beta', category: 'Tip A', code: 'PB2' },
    { name: 'Proizvod Gamma', category: 'Tip B', code: 'PG3' },
    { name: 'Jedinica Delta', category: 'Tip B', code: 'JD4' },
    { name: 'Proizvod Epsilon', category: 'Tip B', code: 'PE5' },
  ];

  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  it('filters by nameContains with fuzzy match (product-agnostic)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'Proizvod' })], setters);
    expect(selected[0]).toEqual(new Set([0, 1, 2, 4]));
  });

  it('filters by category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ category: 'Tip B' })], setters);
    expect(selected[0]).toEqual(new Set([2, 3, 4]));
  });

  it('AND logic: nameContains + category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'Proizvod', category: 'Tip A' })], setters);
    expect(selected[0]).toEqual(new Set([0, 1]));
  });

  it('respects maxSelect to cap results', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', maxSelect: 2 })], setters);
    expect(selected[0]).toEqual(new Set([0, 1]));
  });

  it('STORY-163: empty nameContains + empty category + maxSelect 0 does not select all products', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', category: '' })], setters);
    expect(selected.length).toBe(0);
  });

  it('accepts categoryContains as alias for category (STORY-104)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'Proizvod', categoryContains: 'Tip B' })], setters);
    expect(selected[0]).toEqual(new Set([2, 4]));
  });

  it('catalog_filter category matches when user omits diacritics (Punjaci = Punjači)', () => {
    const withDiacritics = [
      { name: 'USB-C Punjač 20W', code: 'C1', category: 'Punjači za auto' },
      { name: 'Lightning Kabel', code: 'C2', category: 'Kablovi' },
    ];
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: withDiacritics,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: '', category: 'Punjaci za auto' })],
      setters,
    );
    expect(selected[0]).toEqual(new Set([0]));
  });

  it('does nothing when allProducts is not provided', () => {
    const setters = makeSetters();
    expect(() => applyAgentActions([makeFilter({ nameContains: 'test' })], setters)).not.toThrow();
    expect(setters.setSelectedProductIndices).not.toHaveBeenCalled();
  });
});

// ---- catalog_filter relevance (STORY-111): chargers vs adapters, connector/spec ----

const story111Catalog = [
  { name: 'USB-C Punjač 20W za Auto', code: 'CHG-USBC-20', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Punjač 65W Type-C za Auto', code: 'CHG-TC-65', category: 'Punjači za auto', brand: 'Baseus' },
  { name: 'Bluetooth USB Adapter LV-B15B 5.0', code: 'LV-B15B', category: 'Adapteri', brand: 'LV' },
  { name: 'Lightning na USB Kabel 1m', code: 'LIG-1M', category: 'Kablovi', brand: 'Baseus' },
  { name: 'Micro USB to LAN Adapter', code: 'MUSB-LAN', category: 'Adapteri', brand: 'Generic' },
  { name: 'USB-A Punjač 10W za Auto', code: 'CHG-USBA-10', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Denmen 360 Holder', code: 'DEN-360', category: 'Držači', brand: 'Denmen' },
];

describe('applyAgentActions — catalog_filter universal search', () => {
  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  it('nameContains "USB-C punjač" + category "Punjači za auto" returns only products in that category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: 'USB-C punjač', category: 'Punjači za auto' })],
      setters,
    );
    const indices = Array.from(selected[0]!);
    const names = indices.map((i) => story111Catalog[i].name);
    // Universal search: category is exact, so only Punjači za auto
    expect(names).not.toContain('Bluetooth USB Adapter LV-B15B 5.0');
    expect(names).not.toContain('Lightning na USB Kabel 1m');
    expect(names).not.toContain('Micro USB to LAN Adapter');
    expect(indices.some((i) => story111Catalog[i].name.includes('Punjač'))).toBe(true);
  });

  it('nameContains "Lightning" returns only products matching Lightning in name/code/brand', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'Lightning' })], setters);
    const names = Array.from(selected[0]!).map((i) => story111Catalog[i].name);
    expect(names).toContain('Lightning na USB Kabel 1m');
    expect(names).not.toContain('USB-C Punjač 20W za Auto');
    expect(names).not.toContain('Punjač 65W Type-C za Auto');
  });

  it('catalog_filter with category "Punjači za auto" + nameContains "USB-C" selects matching products', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: 'USB-C', category: 'Punjači za auto' })],
      setters,
    );
    expect(selected.length).toBe(1);
    expect(selected[0]).toBeDefined();
    expect(selected[0]!.size).toBeGreaterThan(0);
    const names = Array.from(selected[0]!).map((i) => story111Catalog[i].name);
    expect(names.some((n) => n.includes('USB-C') && n.includes('Punjač'))).toBe(true);
  });

  // Vocabulary mismatch resilience: nameContains finds 0 but category is valid → return category products
  it('catalog_filter: nameContains vocabulary mismatch with valid category returns all in category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    // "QC5" doesn't match any product name in catalog, but "Punjači za auto" IS valid
    // Without fallback this would return 0 — with fallback it returns the 3 chargers in that category
    applyAgentActions(
      [makeFilter({ nameContains: 'QC5', category: 'Punjači za auto' })],
      setters,
    );
    expect(selected.length).toBe(1);
    // Should return all "Punjači za auto" products (indices 0, 1, 5) — at least category is honored
    expect(selected[0]!.size).toBe(3);
    expect([...selected[0]!]).toEqual(expect.arrayContaining([0, 1, 5]));
  });

  // Vocabulary mismatch with NO category: nameContains finds 0 and no category → still 0 (no blind fallback)
  it('catalog_filter: nameContains vocabulary mismatch with no category yields 0 (no blind all-select)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: 'QC5', category: '' })],
      setters,
    );
    expect(selected.length).toBe(1);
    expect(selected[0]!.size).toBe(0);
  });

  // Universal search: no fallback — wrong category yields 0 selected
  it('catalog_filter with nonexistent category yields 0 selected (no first-token fallback)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: 'USB-C punjači za auto', category: 'Ne postoji kategorija' })],
      setters,
    );
    expect(selected.length).toBe(1);
    expect(selected[0]!.size).toBe(0);
  });

  // Universal search: no product-type relevance filter — wrong category = 0 selected
  it('catalog_filter with wrong category yields 0 selected', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: story111Catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions(
      [makeFilter({ nameContains: 'USB-C punjači za auto', category: 'Ne postoji' })],
      setters,
    );
    expect(selected[0]!.size).toBe(0);
  });
});

// ---- catalog_filter: STORY-119 resolvedIndices path ----

describe('applyAgentActions — catalog_filter resolvedIndices (STORY-119)', () => {
  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  const catalog = story111Catalog;

  it('applies pre-resolved indices directly, skipping string matching', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    // resolvedIndices=[0,1,5] = the three chargers — no vocabulary guessing needed
    applyAgentActions([makeFilter({ resolvedIndices: [0, 1, 5], deselectOthers: true })], setters);
    expect(selected.length).toBe(1);
    expect(selected[0]).toEqual(new Set([0, 1, 5]));
  });

  it('respects maxSelect on resolvedIndices', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [0, 1, 2, 3, 4, 5, 6], maxSelect: 3 })], setters);
    expect(selected[0]!.size).toBe(3);
    expect([...selected[0]!]).toEqual([0, 1, 2]);
  });

  it('filters out invalid (negative/non-integer) indices', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [0, -1, 1.5, 2] })], setters);
    expect(selected[0]).toEqual(new Set([0, 2]));
  });

  it('resolvedIndices path works without allProducts setter', () => {
    const selected: Set<number>[] = [];
    // allProducts is NOT provided — resolvedIndices path should still work
    const setters = makeSetters({
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [3, 6] })], setters);
    expect(selected[0]).toEqual(new Set([3, 6]));
  });

  it('empty resolvedIndices clears selection', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set([0, 1, 2]))); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [] })], setters);
    expect(selected[0]).toEqual(new Set([]));
  });

  it('resolvedIndices path takes priority over nameContains/category when both present', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    // resolvedIndices=[6] (Denmen Holder) despite nameContains="USB-C" and category="Punjači za auto"
    applyAgentActions([makeFilter({
      resolvedIndices: [6],
      nameContains: 'USB-C',
      category: 'Punjači za auto',
    })], setters);
    expect(selected[0]).toEqual(new Set([6]));
  });
});

// ---- catalog_filter: _debugReason (no-match) clears selection ----
describe('applyAgentActions — catalog_filter _debugReason no-match', () => {
  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  it('when _debugReason is set (LLM/MiniSearch found no match), selection is cleared', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: [{ name: 'A', category: 'X', code: '1' }],
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set([0]))); },
    });
    applyAgentActions([makeFilter({
      query: 'Denmen držači za kola',
      _debugReason: 'LLM found no matching products among 150 candidates for: "Denmen držači za kola"',
    })], setters);
    expect(selected.length).toBe(1);
    expect(selected[0]).toEqual(new Set());
  });
});

// ---- catalog_filter: legacy path uses query when nameContains missing ----
describe('applyAgentActions — catalog_filter query fallback in legacy path', () => {
  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  it('payload with query but no nameContains uses query for legacy search', () => {
    const catalog = [
      { name: 'USB-C punjač auto', category: 'Punjači', code: 'U1' },
      { name: 'Adapter', category: 'Adapteri', code: 'A1' },
    ];
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ query: 'USB-C punjač', maxSelect: 0 })], setters);
    expect(selected.length).toBe(1);
    expect(selected[0]).toEqual(new Set([0]));
  });
});

// ---- catalog_filter: STORY-122 hardening fixes ----

describe('applyAgentActions — catalog_filter STORY-122 hardening', () => {
  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  const smallCatalog = [
    { name: 'Product A', category: 'Cat A', code: 'PA' },
    { name: 'Product B', category: 'Cat A', code: 'PB' },
    { name: 'Product C', category: 'Cat B', code: 'PC' },
  ];

  // AA-1: Bounds check — out-of-range indices are silently dropped
  it('AA-1: resolvedIndices out-of-range index is silently dropped', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: smallCatalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    // Index 9999 is way out of range for a 3-product catalog
    applyAgentActions([makeFilter({ resolvedIndices: [0, 9999, 1] })], setters);
    expect(selected[0]).toEqual(new Set([0, 1]));
  });

  it('AA-1: all valid indices pass through when within bounds', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: smallCatalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [0, 1, 2] })], setters);
    expect(selected[0]).toEqual(new Set([0, 1, 2]));
  });

  it('AA-1: index equal to catalog length is dropped (off-by-one guard)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: smallCatalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    // Index 3 is exactly catalog.length — should be dropped
    applyAgentActions([makeFilter({ resolvedIndices: [0, 3] })], setters);
    expect(selected[0]).toEqual(new Set([0]));
  });

  it('AA-1: resolvedIndices without allProducts still work (Infinity fallback)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      // allProducts intentionally not provided
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ resolvedIndices: [3, 6] })], setters);
    expect(selected[0]).toEqual(new Set([3, 6]));
  });

  // AA-2: Category similarity threshold raised to 0.65
  it('AA-2: "Punjači za auto" does NOT match "Punjači za mobilne telefone" (2/4 tokens = 0.5 < 0.65)', () => {
    const catalog = [
      { name: 'USB-C Punjač 20W', category: 'Punjači za auto', code: 'P1' },
      { name: 'iPhone Punjač 20W', category: 'Punjači za mobilne telefone', code: 'P2' },
    ];
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', category: 'Punjači za auto' })], setters);
    const indices = Array.from(selected[0]!);
    // Only index 0 (auto charger) should match; index 1 (phone charger) should not
    expect(indices).toContain(0);
    expect(indices).not.toContain(1);
  });

  it('AA-2: "Punjači za auto" still matches "Auto punjači" (perfect token overlap = 1.0)', () => {
    const catalog = [
      { name: 'USB-C Punjač 20W', category: 'Auto punjači', code: 'P1' },
      { name: 'iPhone Punjač', category: 'Punjači za mobilne', code: 'P2' },
    ];
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', category: 'Punjači za auto' })], setters);
    const indices = Array.from(selected[0]!);
    expect(indices).toContain(0); // "Auto punjači" has same tokens as "Punjači za auto" → high similarity
  });

  it('AA-2: exact category match still works (bypasses fuzzy entirely)', () => {
    const catalog = [
      { name: 'Product X', category: 'Futrole', code: 'F1' },
      { name: 'Product Y', category: 'Kablovi', code: 'K1' },
    ];
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: catalog,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', category: 'Futrole' })], setters);
    expect(selected[0]).toEqual(new Set([0]));
  });
});

describe('resolveFormatId', () => {
  it('resolves story alias', () => expect(resolveFormatId('story')).toBe('viber-story'));
  it('resolves post alias', () => expect(resolveFormatId('post')).toBe('instagram-square'));
  it('resolves landscape alias', () => expect(resolveFormatId('landscape')).toBe('facebook-landscape'));
  it('resolves instagram alias', () => expect(resolveFormatId('instagram')).toBe('instagram-square'));
  it('passes through unknown ids', () => expect(resolveFormatId('custom-xyz')).toBe('custom-xyz'));
  it('is case insensitive', () => expect(resolveFormatId('STORY')).toBe('viber-story'));
});

describe('resolveFontFamily', () => {
  it('resolves sans alias', () =>
    expect(resolveFontFamily('sans')).toContain('BlinkMacSystemFont'));
  it('resolves serif alias', () =>
    expect(resolveFontFamily('serif')).toContain('Georgia'));
  it('resolves mono alias', () =>
    expect(resolveFontFamily('mono')).toContain('Courier'));
  it('resolves impact alias', () =>
    expect(resolveFontFamily('impact')).toContain('Impact'));
  it('resolves verdana alias', () =>
    expect(resolveFontFamily('verdana')).toContain('Verdana'));
  it('returns null for unknown short input', () =>
    expect(resolveFontFamily('xyz')).toBeNull());
  it('accepts valid full font-family string', () =>
    expect(resolveFontFamily("Georgia, 'Times New Roman', serif")).toContain('Georgia'));
});
