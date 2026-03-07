/**
 * STORY-62: Tests for agent-actions.ts
 * Covers applyAgentActions() for all six action types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyAgentActions,
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

// ---- catalog_filter (STORY-69) ----

describe('applyAgentActions — catalog_filter', () => {
  const products = [
    { name: 'Futrola za iPhone 15 Pro Max - Crna', category: 'Futrola za mob. tel.', code: 'F001' },
    { name: 'Futrola za iPhone 15 Pro Max - Bijela', category: 'Futrola za mob. tel.', code: 'F002' },
    { name: 'Futrola za Samsung A54', category: 'Futrola za mob. tel.', code: 'F003' },
    { name: 'Samsung Galaxy S24', category: 'Mobilni telefon', code: 'M001' },
    { name: 'iPhone 15 Pro', category: 'Mobilni telefon', code: 'M002' },
  ];

  function makeFilter(payload: object): AgentAction {
    return { type: 'catalog_filter', payload };
  }

  it('filters by nameContains (case-insensitive)', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'iPhone 15 Pro Max' })], setters);
    expect(selected[0]).toEqual(new Set([0, 1]));
  });

  it('filters by category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ category: 'Mobilni telefon' })], setters);
    expect(selected[0]).toEqual(new Set([3, 4]));
  });

  it('AND logic: nameContains + category', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: 'iPhone 15 Pro Max', category: 'Futrola za mob. tel.' })], setters);
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

  it('empty nameContains + empty category selects all products', () => {
    const selected: Set<number>[] = [];
    const setters = makeSetters({
      allProducts: products,
      setSelectedProductIndices: (updater) => { selected.push(updater(new Set())); },
    });
    applyAgentActions([makeFilter({ nameContains: '', category: '' })], setters);
    expect(selected[0]).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('does nothing when allProducts is not provided', () => {
    const setters = makeSetters();
    expect(() => applyAgentActions([makeFilter({ nameContains: 'test' })], setters)).not.toThrow();
    expect(setters.setSelectedProductIndices).not.toHaveBeenCalled();
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
