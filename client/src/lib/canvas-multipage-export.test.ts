/**
 * STORY-127 T5: Integration test — multi-page canvas + export.
 * Given 13 products and Story format: getPages → 2 pages (first page full: 7, second: 6);
 * assert both pages contain footer and correct product distribution.
 */

import { describe, it, expect } from 'vitest';
import { getPages } from './canvas-pages';
import { renderAdTemplate } from './ad-templates';
import { getPreviewHtmlToShow } from './preview-html';
import { FORMAT_PRESETS, DEFAULT_PRODUCT_BLOCK_OPTIONS } from './ad-constants';
import type { ProductItem } from './ad-constants';
import { DEFAULT_FOOTER_FOR_NEW_CREATIVE } from './ad-config-schema';

const STORY_FORMAT = FORMAT_PRESETS[0]!;

function makeProducts(n: number): ProductItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Product ${i + 1}`,
    code: `P${i + 1}`,
    price: '10 KM',
    category: 'Test',
  }));
}

function buildTemplateData(productsSlice: ProductItem[]) {
  return {
    title: 'Test Ad',
    titleFontSize: 32,
    products: productsSlice,
    layout: 'multi-grid' as const,
    format: STORY_FORMAT,
    style: { backgroundColor: '#f8fafc', accentColor: '#f97316', fontFamily: 'sans-serif' },
    ctaButtons: ['Shop now'],
    elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'] as const,
    logoHeight: 64,
    logoAlignment: 'center' as const,
    logoCompanion: 'none' as const,
    productBlockOptions: { ...DEFAULT_PRODUCT_BLOCK_OPTIONS, maxProducts: 0 },
    footer: { ...DEFAULT_FOOTER_FOR_NEW_CREATIVE },
  };
}

describe('STORY-127 T5 — multi-page export integration', () => {
  const templateProducts = makeProducts(13);

  it('getPages(13, Story) returns 2 pages with 7 and 6 product indices (first page full)', () => {
    const pages = getPages(13, STORY_FORMAT);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.productIndices).toHaveLength(7);
    expect(pages[1]!.productIndices).toHaveLength(6);
    expect(pages[0]!.productIndices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pages[1]!.productIndices).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it('htmlPerPage: 2 full-document HTML strings, each with footer and correct product slice', () => {
    const pages = getPages(templateProducts.length, STORY_FORMAT);
    expect(pages.length).toBeGreaterThan(1);

    const htmlPerPage = pages.map((page) => {
      const productsForPage = page.productIndices.map((i) => templateProducts[i]!);
      return renderAdTemplate(buildTemplateData(productsForPage));
    });

    expect(htmlPerPage).toHaveLength(2);
    const [html1, html2] = htmlPerPage;

    // Both pages include footer band (mandatory)
    expect(html1).toContain('data-footer');
    expect(html2).toContain('data-footer');

    // Page 1: products 1–7 only
    expect(html1).toContain('Product 1');
    expect(html1).toContain('Product 7');
    expect(html1).not.toContain('Product 8');

    // Page 2: products 8–13 only
    expect(html2).toContain('Product 8');
    expect(html2).toContain('Product 13');
    expect(html2).not.toContain('Product 7');
  });

  it('each exported page is valid HTML (DOCTYPE, body, footer before </body>)', () => {
    const pages = getPages(templateProducts.length, STORY_FORMAT);
    const htmlPerPage = pages.map((page) => {
      const productsForPage = page.productIndices.map((i) => templateProducts[i]!);
      return renderAdTemplate(buildTemplateData(productsForPage));
    });

    for (const html of htmlPerPage) {
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      const footerIdx = html.indexOf('data-footer');
      const bodyCloseIdx = html.indexOf('</body>');
      expect(footerIdx).toBeGreaterThan(-1);
      expect(footerIdx).toBeLessThan(bodyCloseIdx);
    }
  });

  it('single page (8 products Story): getPages returns one page, no multi-page export', () => {
    const eight = makeProducts(8);
    const pages = getPages(eight.length, STORY_FORMAT);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.productIndices).toHaveLength(8);
    const htmlSingle = renderAdTemplate(buildTemplateData(eight));
    expect(htmlSingle).toContain('data-footer');
    expect(htmlSingle).toContain('Product 1');
    expect(htmlSingle).toContain('Product 8');
  });

  it('STORY-131 T3: multi-page — both pages have data-footer; preview HTML for current page equals export HTML for that page', () => {
    const pages = getPages(templateProducts.length, STORY_FORMAT);
    const htmlPerPage = pages.map((page) => {
      const productsForPage = page.productIndices.map((i) => templateProducts[i]!);
      return renderAdTemplate(buildTemplateData(productsForPage));
    });
    expect(htmlPerPage).toHaveLength(2);
    for (let i = 0; i < htmlPerPage.length; i++) {
      const previewHtml = getPreviewHtmlToShow(null, '', htmlPerPage, i);
      expect(previewHtml).toBe(htmlPerPage[i]);
      expect(previewHtml).toContain('data-footer');
    }
  });
});
