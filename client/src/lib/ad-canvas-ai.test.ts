import { describe, it, expect } from 'vitest';
import {
  parsePatchResponse,
  serializeCanvasState,
  buildCanvasEditPrompt,
  filterValidPatches,
  applyPatches,
  type AdCanvasState,
  type CanvasSetters,
} from './ad-canvas-ai';

const SAMPLE_STATE: AdCanvasState = {
  headline: 'Big Sale!',
  titleFontSize: 32,
  emojiOrIcon: '🔥',
  badgeText: '-20%',
  ctaButtons: ['Shop now'],
  disclaimerText: 'T&C apply',
  elementOrder: ['logo', 'headline', 'products', 'badge', 'cta', 'disclaimer'],
  layout: 'multi-grid',
  style: { accentColor: '#ff6600', backgroundColor: '#ffffff' },
  logoHeight: 48,
  logoAlignment: 'center',
  logoCompanion: 'none',
  productBlockOptions: {
    columns: 2 as 0 | 1 | 2 | 3 | 4,
    maxProducts: 6,
    imageHeight: 120,
    showFields: {
      image: true,
      code: false,
      name: true,
      description: false,
      originalPrice: true,
      price: true,
      discountBadge: true,
      brandLogo: false,
    },
  },
  productCount: 4,
  format: { id: 'viber-story', width: 1080, height: 1920 },
  dataQuality: {
    hasAllCapsNames: false,
    hasMissingPrices: false,
    hasOriginalPrices: true,
    hasDiscounts: true,
    avgDescriptionLength: 0,
    imageAnalysis: null,
  },
  catalogSummary: {
    totalProducts: 10,
    selectedCount: 4,
    categories: [{ name: 'Electronics', count: 10 }],
    sampleNames: ['Product A', 'Product B'],
  },
};

describe('parsePatchResponse', () => {
  it('parses a clean JSON array', () => {
    const raw = '[{"blockType":"headline","property":"fontSize","value":48}]';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
    expect(patches[0]).toEqual({ blockType: 'headline', property: 'fontSize', value: 48 });
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const raw = '```json\n[{"blockType":"badge","property":"text","value":"SALE"}]\n```';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
    expect(patches[0]!.blockType).toBe('badge');
  });

  it('parses JSON with surrounding prose', () => {
    const raw = 'Here are the changes:\n[{"blockType":"headline","property":"text","value":"New Title"}]\nHope that helps!';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
    expect(patches[0]!.value).toBe('New Title');
  });

  it('parses patches wrapped in an object with "patches" key', () => {
    const raw = '{"patches":[{"blockType":"logo","property":"height","value":80}]}';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
    expect(patches[0]!.blockType).toBe('logo');
  });

  it('parses patches wrapped in object with "changes" key', () => {
    const raw = '{"changes":[{"blockType":"cta","property":"buttons","value":"Buy now|Learn more"}]}';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
  });

  it('parses a single patch object (not in array)', () => {
    const raw = '{"blockType":"headline","property":"fontSize","value":56}';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
    expect(patches[0]!.value).toBe(56);
  });

  it('handles truncated JSON (missing closing bracket)', () => {
    const raw = '[{"blockType":"headline","property":"fontSize","value":48}';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(parsePatchResponse('')).toEqual([]);
    expect(parsePatchResponse('  ')).toEqual([]);
  });

  it('returns empty array for pure prose with no JSON', () => {
    expect(parsePatchResponse('I cannot help with that request.')).toEqual([]);
  });

  it('filters out malformed items in the array', () => {
    const raw = '[{"blockType":"headline","property":"fontSize","value":48},{"bad":"item"},{"blockType":"badge","property":"text","value":"OK"}]';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(2);
    expect(patches[0]!.blockType).toBe('headline');
    expect(patches[1]!.blockType).toBe('badge');
  });

  it('handles multiple patches', () => {
    const raw = '[{"blockType":"headline","property":"fontSize","value":56},{"blockType":"products","property":"showFields.code","value":true}]';
    const patches = parsePatchResponse(raw);
    expect(patches).toHaveLength(2);
  });
});

describe('serializeCanvasState', () => {
  it('serializes all blocks and meta', () => {
    const json = serializeCanvasState(SAMPLE_STATE);
    expect(json.blocks.headline.text).toBe('Big Sale!');
    expect(json.blocks.headline.fontSize).toBe(32);
    expect(json.blocks.products.columns).toBe(2);
    expect(json.blocks.products.showFields.code).toBe(false);
    expect(json.meta.layout).toBe('multi-grid');
    expect(json.meta.productCount).toBe(4);
  });

  it('includes dataQuality in meta', () => {
    const json = serializeCanvasState(SAMPLE_STATE);
    expect(json.meta.dataQuality).toBeDefined();
    expect(json.meta.dataQuality.hasOriginalPrices).toBe(true);
    expect(json.meta.dataQuality.hasDiscounts).toBe(true);
    expect(json.meta.dataQuality.hasAllCapsNames).toBe(false);
    expect(json.meta.dataQuality.hasMissingPrices).toBe(false);
    expect(json.meta.dataQuality.avgDescriptionLength).toBe(0);
  });

  it('includes format dimensions in meta', () => {
    const json = serializeCanvasState(SAMPLE_STATE);
    expect(json.meta.format).toEqual({ id: 'viber-story', width: 1080, height: 1920 });
  });

  it('STORY-69: includes catalogSummary in meta', () => {
    const json = serializeCanvasState(SAMPLE_STATE);
    expect(json.meta.catalogSummary).toBeDefined();
    expect(json.meta.catalogSummary.totalProducts).toBe(10);
    expect(json.meta.catalogSummary.selectedCount).toBe(4);
    expect(json.meta.catalogSummary.categories).toHaveLength(1);
    expect(json.meta.catalogSummary.categories[0]).toEqual({ name: 'Electronics', count: 10 });
    expect(json.meta.catalogSummary.sampleNames).toContain('Product A');
  });
});

describe('buildCanvasEditPrompt', () => {
  it('includes canvas state and user instruction', () => {
    const prompt = buildCanvasEditPrompt(SAMPLE_STATE, 'make headline larger');
    expect(prompt).toContain('Current canvas state:');
    expect(prompt).toContain('"make headline larger"');
    expect(prompt).toContain('"Big Sale!"');
  });
});

describe('filterValidPatches', () => {
  it('accepts valid patches', () => {
    const patches = [{ blockType: 'headline' as const, property: 'fontSize', value: 48 }];
    const valid = filterValidPatches(patches);
    expect(valid).toHaveLength(1);
  });

  it('rejects patches with unknown blockType', () => {
    const errors: string[] = [];
    const patches = [{ blockType: 'unknown' as never, property: 'text', value: 'x' }];
    const valid = filterValidPatches(patches, (_p, err) => errors.push(err));
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('rejects out-of-range numbers', () => {
    const errors: string[] = [];
    const patches = [{ blockType: 'headline' as const, property: 'fontSize', value: 999 }];
    const valid = filterValidPatches(patches, (_p, err) => errors.push(err));
    expect(valid).toHaveLength(0);
  });
});

describe('applyPatches', () => {
  it('calls the correct setters', () => {
    let headline = '';
    let fontSize = 0;
    const setters: CanvasSetters = {
      setHeadline: (v) => { headline = v; },
      setTitleFontSize: (v) => { fontSize = v; },
      setEmojiOrIcon: () => {},
      setBadgeText: () => {},
      setCtaButtons: () => {},
      setDisclaimerText: () => {},
      setLogoHeight: () => {},
      setLogoAlignment: () => {},
      setLogoCompanion: () => {},
      setProductBlockOptions: () => {},
    };

    applyPatches([
      { blockType: 'headline', property: 'text', value: 'New!' },
      { blockType: 'headline', property: 'fontSize', value: 56 },
    ], setters);

    expect(headline).toBe('New!');
    expect(fontSize).toBe(56);
  });
});
