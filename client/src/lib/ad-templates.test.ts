/**
 * STORY-109 Phase 4 — Footer in exported HTML template tests.
 * Environment: node (vitest). No DOM required.
 */
import { describe, it, expect } from 'vitest';
import { renderAdTemplate } from './ad-templates';
import type { AdTemplateData } from './ad-constants';
import { getPages } from './canvas-pages';
import { PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN, PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX, FORMAT_PRESETS } from './ad-constants';

const BASE_DATA: AdTemplateData = {
  title: 'Weekend Sale',
  products: [{ name: 'Samsung TV', price: '599 KM' }],
  companyLogoDataUri: undefined,
};

describe('renderAdTemplate — footer', () => {
  it('output does not contain data-footer when footer is undefined', () => {
    const html = renderAdTemplate({ ...BASE_DATA });
    expect(html).not.toContain('data-footer');
  });

  it('output does not contain data-footer when footer.enabled is false', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: { enabled: false, options: [], companyName: 'Mobileland' },
    });
    expect(html).not.toContain('data-footer');
  });

  it('output contains company name and phone when footer is enabled', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: {
        enabled: true,
        options: ['contact'],
        companyName: 'Test Co',
        contact: { phone: '+1 555 0100' },
      },
    });
    expect(html).toContain('data-footer');
    expect(html).toContain('Test Co');
    expect(html).toContain('+1 555 0100');
  });

  it('footer follows ad background and has readable text (canvas → preview → export)', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      backgroundColor: '#f8fafc',
      footer: { enabled: true, options: [], companyName: 'ColorTest' },
    });
    expect(html).toContain('data-footer');
    expect(html).toContain('#f8fafc');
    expect(html).toContain('#111827'); // adaptive dark text on light bg
  });

  it('STORY-205: footer band uses margin-top:auto (dock-to-bottom, industry manner)', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: { enabled: true, options: [], companyName: 'DockTest' },
    });
    expect(html).toContain('data-footer');
    expect(html).toContain('margin-top:auto');
  });

  it('XSS: footer website with <script> is escaped in output', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: {
        enabled: true,
        options: ['contact'],
        contact: { website: '<script>alert(1)</script>' },
        companyName: 'XSSTest',
      },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('XSS: footer company name with HTML is escaped', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: {
        enabled: true,
        options: [],
        companyName: '<img src=x onerror=alert(1)>',
      },
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('footer is placed before </body> in the output', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: {
        enabled: true,
        options: [],
        companyName: 'BeforeBody',
      },
    });
    const footerIdx = html.indexOf('data-footer');
    const bodyCloseIdx = html.indexOf('</body>');
    expect(footerIdx).toBeGreaterThan(-1);
    expect(footerIdx).toBeLessThan(bodyCloseIdx);
  });

  it('STORY-131 T2: output contains exactly one data-footer and it appears before </body>', () => {
    const data: AdTemplateData = {
      ...BASE_DATA,
      footer: { enabled: true, options: [], companyName: 'OneFooter' },
    };
    const html = renderAdTemplate(data);
    const matches = html.match(/data-footer/g);
    expect(matches).toHaveLength(1);
    const footerIdx = html.indexOf('data-footer');
    const bodyCloseIdx = html.indexOf('</body>');
    expect(footerIdx).toBeGreaterThan(-1);
    expect(footerIdx).toBeLessThan(bodyCloseIdx);
  });

  it('T4 / STORY-127: footer band is included when enabled even with no content (mandatory slim placeholder)', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      footer: {
        enabled: true,
        options: [],
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
      },
    });
    expect(html).toContain('data-footer');
    expect(html).toContain('Company & contact');
  });

  it('STORY-145 A1: footer is docked to bottom via body flex + margin-top:auto', () => {
    const html = renderAdTemplate({
      ...BASE_DATA,
      backgroundColor: '#f8fafc',
      footer: { enabled: true, options: [], companyName: 'Docked' },
    });

    // WYSIWYG footer contract:
    // - HTML body acts as artboard (flex column)
    // - footer has margin-top:auto so it can push down to the artboard bottom.
    expect(html).toContain('display:flex');
    expect(html).toContain('flex-direction:column');

    const footerIdx = html.indexOf('data-footer');
    expect(footerIdx).toBeGreaterThanOrEqual(0);
    const footerSlice = html.slice(footerIdx, footerIdx + 450);
    expect(footerSlice).toContain('margin-top:auto');
    expect(footerSlice).toContain('flex-shrink:0');
  });

  it('STORY-145 A2: multi-page each page has docked footer (margin-top:auto)', () => {
    const format = FORMAT_PRESETS[0]!;
    const products = Array.from({ length: 13 }, (_, i) => ({
      name: `P${i + 1}`,
      price: '10 KM',
      category: 'Test',
    }));

    const pages = getPages(products.length, format);
    expect(pages.length).toBeGreaterThan(1);

    for (const page of pages) {
      const slice = page.productIndices.map((i) => products[i]!);
      const html = renderAdTemplate({
        ...BASE_DATA,
        title: 'Multi-page Dock Test',
        products: slice,
        layout: 'multi-grid',
        format,
        backgroundColor: '#f8fafc',
        accentColor: '#f97316',
        fontFamily: 'sans-serif',
        footer: { enabled: true, options: [], companyName: 'Docked' },
      });

      expect(html).toContain('flex-direction:column');
      const footerIdx = html.indexOf('data-footer');
      expect(footerIdx).toBeGreaterThanOrEqual(0);
      const footerSlice = html.slice(footerIdx, footerIdx + 450);
      expect(footerSlice).toContain('margin-top:auto');
    }
  });
});

describe('renderAdTemplate — STORY-132 preview image height', () => {
  it('T2: multi-grid with 6 products on story format yields product image height in [MIN, MAX]', () => {
    const data: AdTemplateData = {
      ...BASE_DATA,
      layout: 'multi-grid',
      format: { id: 'viber-story', label: 'Story', width: 1080, height: 1920 },
      productBlockOptions: {
        columns: 3,
        maxProducts: 0,
        imageHeight: 80,
        showFields: { image: true, code: true, name: true, description: true, originalPrice: true, price: true, discountBadge: true, brandLogo: true },
      },
      products: [
        { name: 'P1', price: '10' },
        { name: 'P2', price: '20' },
        { name: 'P3', price: '30' },
        { name: 'P4', price: '40' },
        { name: 'P5', price: '50' },
        { name: 'P6', price: '60' },
      ],
    };
    const html = renderAdTemplate(data);
    const heightMatches = html.match(/height:(\d+)px/g) ?? [];
    const productHeights = heightMatches
      .map((m) => parseInt(m.replace('height:', '').replace('px', ''), 10))
      .filter((px) => px >= 50 && px <= 600);
    expect(productHeights.length).toBeGreaterThan(0);
    productHeights.forEach((px) => {
      expect(px).toBeGreaterThanOrEqual(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN);
      // Tall formats may exceed PREVIEW_MAX to fill space (industry manner).
      expect(px).toBeLessThanOrEqual(600);
    });
  });
});
