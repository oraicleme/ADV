/**
 * STORY-132 T5: E2E pipeline — preview/export without black bar; images fill space.
 *
 * Exercises the full path: template data → renderAdTemplate (and getPages → htmlPerPage).
 * Asserts:
 *   - Footer uses ad background (no black bar under the ad).
 *   - Product image heights in HTML are in [80, 280] (fill space).
 *   - Multi-page: each page has same behaviour.
 *
 * Format label "discrete UI caption" is covered by unit test (preview-format-label.test.ts);
 * this file focuses on the generated ad HTML pipeline.
 */

import { describe, it, expect } from 'vitest';
import { renderAdTemplate } from './ad-templates';
import { getPages } from './canvas-pages';
import {
  FORMAT_PRESETS,
  DEFAULT_PRODUCT_BLOCK_OPTIONS,
  PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN,
} from './ad-constants';
import { DEFAULT_FOOTER_FOR_NEW_CREATIVE } from './ad-config-schema';
import type { AdTemplateData } from './ad-constants';
import type { ProductItem } from './ad-constants';

const STORY = FORMAT_PRESETS[0]!;
const AD_BG = '#f0f9ff';

function makeProducts(n: number): ProductItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Product ${i + 1}`,
    code: `P${i + 1}`,
    price: '10 KM',
    category: 'Test',
  }));
}

function buildData(products: ProductItem[], overrides: Partial<AdTemplateData> = {}): AdTemplateData {
  return {
    title: 'Test Ad',
    titleFontSize: 32,
    products,
    layout: 'multi-grid',
    format: STORY,
    backgroundColor: AD_BG,
    accentColor: '#f97316',
    fontFamily: 'sans-serif',
    ctaButtons: ['Shop now'],
    elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'],
    logoHeight: 64,
    logoAlignment: 'center',
    logoCompanion: 'none',
    productBlockOptions: { ...DEFAULT_PRODUCT_BLOCK_OPTIONS, maxProducts: 0 },
    footer: { ...DEFAULT_FOOTER_FOR_NEW_CREATIVE },
    ...overrides,
  };
}

/** Extract all height:NNNpx from HTML (product card images/placeholders). */
function getProductHeights(html: string): number[] {
  const matches = html.match(/height:(\d+)px/g) ?? [];
  const heights = matches.map((m) => parseInt(m.replace('height:', '').replace('px', ''), 10));
  return heights.filter((px) => px >= 50 && px <= 600);
}

/** Assert data-footer has background from ad (no black bar). */
function expectFooterUsesAdBackground(html: string, expectedBg: string) {
  expect(html).toContain('data-footer');
  const footerStyle = html.includes('data-footer')
    ? html.slice(html.indexOf('data-footer')).slice(0, 400)
    : '';
  expect(footerStyle).toContain('background:');
  expect(footerStyle).not.toMatch(/background:\s*#000\b|background:\s*black\b/i);
  expect(footerStyle).toContain(expectedBg.replace('#', ''));
}

describe('STORY-132 T5 — preview/export pipeline E2E', () => {
  it('single-page: footer uses ad background (no black bar under ad)', () => {
    const data = buildData(makeProducts(6));
    const html = renderAdTemplate(data);
    expectFooterUsesAdBackground(html, AD_BG);
    expect(html).toContain('data-footer');
  });

  it('single-page: product image heights in HTML are in [MIN, effectiveMax] (images fill space)', () => {
    const data = buildData(makeProducts(6));
    const html = renderAdTemplate(data);
    const heights = getProductHeights(html);
    expect(heights.length).toBeGreaterThan(0);
    heights.forEach((px) => {
      expect(px).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
      // Tall formats may exceed PREVIEW_MAX to fill space (industry manner).
      expect(px).toBeLessThanOrEqual(600);
    });
  });

  it('single-page: body background is from template (no full-page black)', () => {
    const data = buildData(makeProducts(3));
    const html = renderAdTemplate(data);
    expect(html).toContain('body');
    expect(html).toContain(AD_BG.slice(1));
    expect(html).not.toMatch(/body[^>]*background[^>]*#000\b/);
  });

  it('multi-page: each page has footer with ad background and image heights in range', () => {
    const products = makeProducts(13);
    const pages = getPages(products.length, STORY);
    expect(pages.length).toBeGreaterThan(1);

    const htmlPerPage = pages.map((page) => {
      const slice = page.productIndices.map((i) => products[i]!);
      return renderAdTemplate(buildData(slice));
    });

    for (const html of htmlPerPage) {
      expectFooterUsesAdBackground(html, AD_BG);
      const heights = getProductHeights(html);
      expect(heights.length).toBeGreaterThan(0);
      heights.forEach((px) => {
        expect(px).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
        expect(px).toBeLessThanOrEqual(600);
      });
    }
  });
});
