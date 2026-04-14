import { describe, it, expect } from 'vitest';
import { renderAdTemplate } from './ad-templates';
import type { AdTemplateData, ProductItem } from './ad-templates';
import { FORMAT_PRESETS } from './ad-templates';
import { escapeHtml } from './ad-layouts/shared';

const LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

function makeProducts(n: number): ProductItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Product ${i + 1}`,
    code: `P${i}`,
    price: '99',
    currency: 'EUR',
  }));
}

const fullTextData: Partial<AdTemplateData> = {
  companyLogoDataUri: LOGO_DATA_URI,
  title: 'Sale',
  ctaText: 'Shop now',
  badgeText: '50% OFF',
  disclaimerText: 'Terms apply',
  emojiOrIcon: '🔥',
};

describe('ad-performance (STORY-35 T3)', () => {
  it('T3.1 renderAdTemplate 100 products per layout < 200 ms each', () => {
    const products = makeProducts(100);
    const layouts = ['single-hero', 'multi-grid', 'category-group', 'sale-discount'] as const;
    for (const layout of layouts) {
      const data: AdTemplateData = {
        ...fullTextData,
        products: layout === 'category-group' ? products.map((p, i) => ({ ...p, category: `Cat ${i % 5}` })) : products,
        layout,
        format: FORMAT_PRESETS[0],
      } as AdTemplateData;
      const start = performance.now();
      const html = renderAdTemplate(data);
      const elapsed = performance.now() - start;
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(elapsed).toBeLessThan(200);
    }
  });

  it('T3.2 renderAdTemplate 10 products × 1000 calls < 2 s total', () => {
    const products = makeProducts(10);
    const data: AdTemplateData = {
      companyLogoDataUri: LOGO_DATA_URI,
      products,
      format: FORMAT_PRESETS[0],
    };
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      renderAdTemplate(data);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('T3.3 HTML size for 100 products (no images) < 500 KB', () => {
    const products = makeProducts(100);
    const data: AdTemplateData = {
      companyLogoDataUri: LOGO_DATA_URI,
      products,
      format: FORMAT_PRESETS[0],
    };
    const html = renderAdTemplate(data);
    const sizeBytes = new Blob([html]).size;
    expect(sizeBytes).toBeLessThan(500 * 1024);
  });

  it('T3.4 escapeHtml 100_000 calls on 200-char string with HTML chars (smoke budget)', () => {
    const str = '<script>alert(1)</script>"\'&'.repeat(10).slice(0, 200);
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      escapeHtml(str);
    }
    const elapsed = performance.now() - start;
    // 3500 ms ceiling: WSL2 under load can exceed 2s; still catches multi-second regressions
    expect(elapsed).toBeLessThan(3500);
  });
});
