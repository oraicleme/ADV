/**
 * STORY-144: Hide product count / "more on next pages" lines — contract tests (no DOM).
 */
import { describe, expect, it } from 'vitest';
import type { ProductBlockOptions } from './ad-constants';
import { DEFAULT_PRODUCT_BLOCK_OPTIONS } from './ad-constants';
import type { SavedCreativeConfig } from './saved-creatives';

/** Mirrors AdCanvasEditor: both summary lines render only when this is true. */
function productCountLinesVisible(opts: ProductBlockOptions): boolean {
  return opts.showProductCount !== false;
}

describe('STORY-144 showProductCount', () => {
  it('T1: default options show count lines (backward compatible)', () => {
    expect(productCountLinesVisible(DEFAULT_PRODUCT_BLOCK_OPTIONS)).toBe(true);
  });

  it('T1: when showProductCount is false, count lines are hidden', () => {
    const off: ProductBlockOptions = {
      ...DEFAULT_PRODUCT_BLOCK_OPTIONS,
      showProductCount: false,
    };
    expect(productCountLinesVisible(off)).toBe(false);
  });

  it('T1: when showProductCount is true, count lines are shown', () => {
    const on: ProductBlockOptions = {
      ...DEFAULT_PRODUCT_BLOCK_OPTIONS,
      showProductCount: true,
    };
    expect(productCountLinesVisible(on)).toBe(true);
  });

  it('T1: when showProductCount is omitted, count lines are shown', () => {
    const { showProductCount: _, ...rest } = DEFAULT_PRODUCT_BLOCK_OPTIONS;
    const partial = rest as ProductBlockOptions;
    expect(productCountLinesVisible(partial)).toBe(true);
  });

  it('T2: saved creative config round-trip preserves showProductCount false', () => {
    const config: SavedCreativeConfig = {
      products: [],
      headline: '',
      titleFontSize: 24,
      ctaButtons: [],
      badgeText: '',
      disclaimerText: '',
      emojiOrIcon: '',
      elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'],
      layout: 'single-hero',
      formatId: 'viber-story',
      style: {},
      productBlockOptions: {
        ...DEFAULT_PRODUCT_BLOCK_OPTIONS,
        showProductCount: false,
      },
    };
    const parsed = JSON.parse(JSON.stringify(config)) as SavedCreativeConfig;
    expect(parsed.productBlockOptions?.showProductCount).toBe(false);
    expect(productCountLinesVisible(parsed.productBlockOptions!)).toBe(false);
  });
});
