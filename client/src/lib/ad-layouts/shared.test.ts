/**
 * STORY-132: Tests for computeEffectiveImageHeight (preview/export image resize).
 * STORY-151: Tests for renderImage blurred-background (aspect-ratio intelligence).
 * STORY-152: Premium placeholder + html2canvas inset compat.
 */
import { describe, it, expect } from 'vitest';
import { computeEffectiveImageHeight, renderImage } from './shared';
import {
  FORMAT_PRESETS,
  INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX,
  PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN,
  PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX,
} from '../ad-constants';
import type { ProductItem } from '../ad-templates';

const STORY = { id: 'viber-story', label: 'Story', width: 1080, height: 1920 };
const SQUARE = { id: 'instagram-square', label: 'Square', width: 1080, height: 1080 };

// ---------------------------------------------------------------------------
// STORY-151: renderImage — blurred background (aspect-ratio intelligence)
// ---------------------------------------------------------------------------

const productWithImage: ProductItem = {
  name: 'iPhone 15 Case',
  imageDataUri: 'data:image/png;base64,ABC123',
};

const productNoImage: ProductItem = {
  name: 'Generic Product',
};

describe('renderImage — blurred background (STORY-151)', () => {
  it('renders a position:relative container when imageDataUri is present', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('position:relative');
    expect(html).toContain('overflow:hidden');
  });

  it('background layer uses object-fit:cover with blur filter', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('blur(');
    expect(html).toContain('brightness(');
  });

  it('foreground layer uses object-fit:contain for crisp rendering', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('object-fit:contain');
  });

  it('background layer has aria-hidden="true" (accessibility)', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('aria-hidden="true"');
  });

  it('foreground image has the correct alt text', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('alt="iPhone 15 Case"');
  });

  it('renders the imageDataUri in both background and foreground layers', () => {
    const html = renderImage(productWithImage, 300);
    const matches = (html.match(/ABC123/g) ?? []).length;
    expect(matches).toBe(2); // background + foreground
  });

  it('container height matches the provided heightPx', () => {
    const html = renderImage(productWithImage, 240);
    expect(html).toContain('height:240px');
  });

  // STORY-152: html2canvas compat — no inset shorthand, explicit top/left/right/bottom
  it('uses explicit top/left/right/bottom instead of inset shorthand (html2canvas compat)', () => {
    const html = renderImage(productWithImage, 300);
    expect(html).toContain('top:0');
    expect(html).toContain('left:0');
    expect(html).toContain('right:0');
    expect(html).toContain('bottom:0');
    expect(html).not.toContain('inset:');
  });

  // STORY-152: premium placeholder when no imageDataUri
  it('renders premium gradient placeholder (no "No image" text) when imageDataUri is absent', () => {
    const html = renderImage(productNoImage, 300);
    expect(html).toContain('linear-gradient');
    expect(html).toContain('<svg');
    expect(html).not.toContain('No image');
    expect(html).not.toContain('background:#f3f4f6');
  });

  it('premium placeholder uses the provided accentColor hex in the gradient', () => {
    const html = renderImage(productNoImage, 300, '#22c55e');
    expect(html).toContain('22c55e');
  });

  it('premium placeholder scales SVG icon proportionally to heightPx', () => {
    const html = renderImage(productNoImage, 200);
    const expectedSize = Math.round(200 * 0.28);
    expect(html).toContain(`width="${expectedSize}"`);
    expect(html).toContain(`height="${expectedSize}"`);
  });
});

describe('computeEffectiveImageHeight', () => {
  it('T1: returns value within [MIN, effectiveMax] for given format and row count', () => {
    const h2 = computeEffectiveImageHeight(STORY, 2);
    expect(h2).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
    // Tall formats may exceed PREVIEW_MAX to fill space (industry manner).
    expect(h2).toBeLessThanOrEqual(600);

    const h1 = computeEffectiveImageHeight(STORY, 1);
    expect(h1).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
    expect(h1).toBeLessThanOrEqual(1000);
  });

  it('T1: is proportional to available space (more rows → smaller or equal height)', () => {
    const h1 = computeEffectiveImageHeight(STORY, 1);
    const h2 = computeEffectiveImageHeight(STORY, 2);
    const h4 = computeEffectiveImageHeight(STORY, 4);
    const h8 = computeEffectiveImageHeight(STORY, 8);
    expect(h1).toBeGreaterThanOrEqual(h2);
    expect(h2).toBeGreaterThanOrEqual(h4);
    expect(h4).toBeGreaterThanOrEqual(h8);
    expect(h8).toBeLessThan(h1);
  });

  it('T1: user imageHeight preference is treated as minimum (expanded when there is extra space)', () => {
    const preferred = 120;
    const base = computeEffectiveImageHeight(STORY, 3);
    const h = computeEffectiveImageHeight(STORY, 3, preferred);
    expect(h).toBe(Math.max(base, preferred));

    // On tall format, effective max can exceed PREVIEW_MAX to fill space.
    const overMax = computeEffectiveImageHeight(STORY, 1, 400);
    expect(overMax).toBeGreaterThanOrEqual(400);
    expect(overMax).toBeLessThanOrEqual(1000);

    const underMin = computeEffectiveImageHeight(STORY, 1, 50);
    const baseUnderMin = computeEffectiveImageHeight(STORY, 1);
    expect(underMin).toBe(Math.max(baseUnderMin, PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN));
  });

  it('T1: square format yields smaller effective height than story for same row count', () => {
    const storyH = computeEffectiveImageHeight(STORY, 2);
    const squareH = computeEffectiveImageHeight(SQUARE, 2);
    expect(squareH).toBeLessThan(storyH);
  });
});

// ---------------------------------------------------------------------------
// STORY-205: explicit industry contracts (chrome reserve + height band)
// ---------------------------------------------------------------------------

describe('STORY-205 — industry layout contracts', () => {
  it('vertical chrome reserve is the single documented constant (300px)', () => {
    expect(INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX).toBe(300);
  });

  it('effective image height stays within 0.6 × per-row band after reserve (all presets × row counts)', () => {
    for (const format of FORMAT_PRESETS) {
      for (const rows of [1, 2, 3, 4] as const) {
        const avail = Math.max(0, format.height - INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX);
        const perRow = avail / Math.max(1, rows);
        const computedRound = Math.round(perRow * 0.6);
        const h = computeEffectiveImageHeight(format, rows);
        const ceiling = Math.max(PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX, computedRound);
        expect(h, `${format.id} rows=${rows}`).toBeLessThanOrEqual(ceiling);
        expect(h).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
      }
    }
  });
});
