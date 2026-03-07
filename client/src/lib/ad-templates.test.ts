import { describe, it, expect } from 'vitest';
import {
  renderAdTemplate,
  type AdTemplateData,
  type ProductItem,
  FORMAT_PRESETS,
} from './ad-templates';

const LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const BRAND_LOGO_URI = 'data:image/png;base64,YnJhbmRsb2dv';
const PRODUCT_IMAGE_URI = 'data:image/jpeg;base64,cHJvZHVjdA==';

const singleProduct: ProductItem = {
  name: 'Samsung Galaxy S24',
  code: 'SG-S24-BLK',
  price: '899.00',
  currency: 'EUR',
  imageDataUri: PRODUCT_IMAGE_URI,
};

const baseData: AdTemplateData = {
  companyLogoDataUri: LOGO_DATA_URI,
  products: [singleProduct],
};

describe('renderAdTemplate', () => {
  describe('structure', () => {
    it('returns valid HTML with doctype', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('sets viewport to 1080x1920 by default', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain('width=1080');
      expect(html).toContain('width: 1080px;');
      expect(html).toContain('min-height: 1920px;');
    });

    it('is self-contained with inline styles (no external CSS links)', () => {
      const html = renderAdTemplate(baseData);
      expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    });
  });

  describe('company logo', () => {
    it('includes the company logo as an img tag with the data URI', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain(LOGO_DATA_URI);
      expect(html).toMatch(/<img[^>]+src="data:image\/png;base64,/);
    });

    it('omits logo section when no company logo provided', () => {
      const html = renderAdTemplate({ ...baseData, companyLogoDataUri: undefined });
      expect(html).not.toContain('company-logo');
    });
  });

  describe('minimal template (zero products, company logo)', () => {
    it('returns non-empty HTML with company logo and placeholder when products are empty', () => {
      const html = renderAdTemplate({
        ...baseData,
        products: [],
        companyLogoDataUri: LOGO_DATA_URI,
      });
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain(LOGO_DATA_URI);
      expect(html).toContain('Add products to see your ad');
    });

    it('returns empty string when no logo, no products, and no text (STORY-35)', () => {
      const html = renderAdTemplate({
        ...baseData,
        products: [],
        companyLogoDataUri: undefined,
      });
      expect(html).toBe('');
    });
  });

  describe('brand logo', () => {
    it('includes brand logo when provided on a product', () => {
      const data: AdTemplateData = {
        ...baseData,
        products: [{ ...singleProduct, brandLogoDataUri: BRAND_LOGO_URI }],
      };
      const html = renderAdTemplate(data);
      expect(html).toContain(BRAND_LOGO_URI);
    });

    it('omits brand logo when not provided', () => {
      const html = renderAdTemplate(baseData);
      expect(html).not.toContain(BRAND_LOGO_URI);
    });
  });

  describe('single product', () => {
    it('displays the product name', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain('Samsung Galaxy S24');
    });

    it('displays the product code', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain('SG-S24-BLK');
    });

    it('displays the price with currency', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain('899.00');
      expect(html).toContain('EUR');
    });

    it('includes the product image', () => {
      const html = renderAdTemplate(baseData);
      expect(html).toContain(PRODUCT_IMAGE_URI);
    });
  });

  describe('no price', () => {
    it('omits price section when price is undefined', () => {
      const noPrice: ProductItem = { ...singleProduct, price: undefined, currency: undefined };
      const html = renderAdTemplate({ ...baseData, products: [noPrice] });
      expect(html).not.toContain('899.00');
      expect(html).not.toContain('EUR');
      expect(html).toContain('Samsung Galaxy S24');
    });
  });

  describe('multi product', () => {
    it('renders multiple products', () => {
      const products: ProductItem[] = [
        { name: 'Product A', code: 'A-001', price: '10.00', currency: 'EUR' },
        { name: 'Product B', code: 'B-002', price: '20.00', currency: 'EUR' },
        { name: 'Product C', code: 'C-003', price: '30.00', currency: 'EUR' },
      ];
      const html = renderAdTemplate({ ...baseData, products });
      expect(html).toContain('Product A');
      expect(html).toContain('Product B');
      expect(html).toContain('Product C');
      expect(html).toContain('A-001');
      expect(html).toContain('B-002');
      expect(html).toContain('C-003');
    });
  });

  describe('custom title', () => {
    it('uses custom title when provided', () => {
      const html = renderAdTemplate({ ...baseData, title: 'SUMMER SALE 2026' });
      expect(html).toContain('SUMMER SALE 2026');
    });
  });

  describe('ad options (CTA, badge, disclaimer, emoji)', () => {
    it('includes CTA text in the document body when set', () => {
      const html = renderAdTemplate({
        ...baseData,
        ctaText: 'Shop now',
      });
      expect(html).toContain('Shop now');
      expect(html).toMatch(/Shop now/);
    });

    it('includes badge text in the document body when set', () => {
      const html = renderAdTemplate({
        ...baseData,
        badgeText: '20% OFF',
      });
      expect(html).toContain('20% OFF');
    });

    it('includes disclaimer text in the document body when set', () => {
      const html = renderAdTemplate({
        ...baseData,
        disclaimerText: 'Terms apply',
      });
      expect(html).toContain('Terms apply');
    });

    it('includes emoji/icon in the document body when set', () => {
      const html = renderAdTemplate({
        ...baseData,
        title: 'Sale',
        emojiOrIcon: '🔥',
      });
      expect(html).toContain('🔥');
      expect(html).toContain('Sale');
    });

    it('produces HTML containing all options when all are set', () => {
      const html = renderAdTemplate({
        ...baseData,
        title: 'Headline',
        ctaText: 'Buy now',
        badgeText: '50% OFF',
        disclaimerText: 'Limited time',
        emojiOrIcon: '✨',
      });
      expect(html).toContain('Headline');
      expect(html).toContain('Buy now');
      expect(html).toContain('50% OFF');
      expect(html).toContain('Limited time');
      expect(html).toContain('✨');
    });
  });

  describe('no regression when ad options omitted or empty', () => {
    it('output shape unchanged when all new options omitted', () => {
      const htmlWithout = renderAdTemplate(baseData);
      const htmlWithEmpty = renderAdTemplate({
        ...baseData,
        ctaText: '',
        badgeText: '',
        disclaimerText: '',
        emojiOrIcon: '',
      });
      expect(htmlWithEmpty).toMatch(/<!DOCTYPE html>/i);
      expect(htmlWithEmpty).toContain('Samsung Galaxy S24');
      expect(htmlWithEmpty).toContain(LOGO_DATA_URI);
      // Same essential structure: no extra CTA/badge/disclaimer blocks when empty
      expect(htmlWithout).toContain('company-logo');
      expect(htmlWithEmpty).toContain('company-logo');
      // Empty options should not add "Shop now" or badge text
      expect(htmlWithEmpty).not.toContain('>Shop now<');
      expect(htmlWithEmpty).not.toContain('20% OFF');
    });

    it('output with no options matches baseline structure', () => {
      const baseline = renderAdTemplate({
        companyLogoDataUri: LOGO_DATA_URI,
        products: [singleProduct],
        layout: 'multi-grid',
      });
      expect(baseline).toMatch(/<!DOCTYPE html>/i);
      expect(baseline).toContain('<body>');
      expect(baseline).toContain('</body>');
      expect(baseline).toContain('Samsung Galaxy S24');
    });
  });

  describe('layout selection', () => {
    it('renders single-hero layout with prominent product block', () => {
      const html = renderAdTemplate({
        ...baseData,
        layout: 'single-hero',
        products: [{ ...singleProduct, name: 'Hero Device' }],
      });
      expect(html).toContain('Hero Device');
      expect(html).toContain('font-size:40px');
    });

    it('renders multi-grid layout with 4 products in two columns', () => {
      const products: ProductItem[] = [
        { name: 'A', price: '10', currency: 'EUR' },
        { name: 'B', price: '20', currency: 'EUR' },
        { name: 'C', price: '30', currency: 'EUR' },
        { name: 'D', price: '40', currency: 'EUR' },
      ];

      const html = renderAdTemplate({
        ...baseData,
        layout: 'multi-grid',
        products,
      });

      expect(html).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
      expect(html).toContain('A');
      expect(html).toContain('D');
    });

    it('renders category-group layout with category headers', () => {
      const products: ProductItem[] = [
        { name: 'Phone', category: 'Phones', price: '100' },
        { name: 'TV', category: 'TV', price: '500' },
      ];

      const html = renderAdTemplate({
        ...baseData,
        layout: 'category-group',
        products,
      });

      expect(html).toContain('Phones');
      expect(html).toContain('TV');
      expect(html).toContain('section');
    });

    it('renders sale-discount layout with strikethrough and discount badge', () => {
      const products: ProductItem[] = [
        {
          name: 'Promo Phone',
          originalPrice: '1000',
          discountPrice: '800',
          discountPercent: 20,
          currency: 'EUR',
        },
      ];

      const html = renderAdTemplate({
        ...baseData,
        layout: 'sale-discount',
        products,
      });

      expect(html).toContain('text-decoration:line-through');
      expect(html).toContain('-20%');
      expect(html).toContain('800 EUR');
    });
  });

  describe('format presets', () => {
    it('renders instagram-square dimensions', () => {
      const html = renderAdTemplate({
        ...baseData,
        format: FORMAT_PRESETS[1],
      });

      expect(html).toContain('width=1080');
      expect(html).toContain('width: 1080px;');
      expect(html).toContain('min-height: 1080px;');
    });

    it('renders facebook-landscape dimensions', () => {
      const html = renderAdTemplate({
        ...baseData,
        format: FORMAT_PRESETS[2],
      });

      expect(html).toContain('width=1200');
      expect(html).toContain('width: 1200px;');
      expect(html).toContain('min-height: 628px;');
    });
  });

  describe('STORY-35: scalability, XSS, long-text, text-only', () => {
    it('T1.1 scalability: 50 products + all text options completes in < 100 ms', () => {
      const products: ProductItem[] = Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i + 1}`,
        code: `P${i}`,
        price: '99',
        currency: 'EUR',
      }));
      const data: AdTemplateData = {
        companyLogoDataUri: LOGO_DATA_URI,
        products,
        title: 'Big Sale',
        ctaText: 'Shop now',
        badgeText: '50% OFF',
        disclaimerText: 'Terms apply',
        emojiOrIcon: '🔥',
        format: FORMAT_PRESETS[0],
      };
      const start = performance.now();
      const html = renderAdTemplate(data);
      const elapsed = performance.now() - start;
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(elapsed).toBeLessThan(100);
    });

    it('T1.2 XSS — headline: output does not contain raw <script when title is XSS payload', () => {
      const html = renderAdTemplate({
        ...baseData,
        title: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script');
      expect(html).toContain('&lt;script&gt;');
    });

    it('T1.3 XSS — CTA: output does not contain unescaped <img when ctaText is XSS payload', () => {
      const html = renderAdTemplate({
        ...baseData,
        ctaText: '"><img src=x onerror=alert(1)>',
      });
      // The angle brackets are escaped (&lt;img), so the tag cannot execute even if onerror= text remains
      expect(html).not.toContain('<img src=x');
    });

    it('T1.4 XSS — badge: output does not contain raw <script when badgeText is XSS payload', () => {
      const html = renderAdTemplate({
        ...baseData,
        badgeText: '<script>x</script>',
      });
      expect(html).not.toContain('<script');
    });

    it('T1.5 XSS — disclaimer: output does not contain raw <script when disclaimerText is XSS payload', () => {
      const html = renderAdTemplate({
        ...baseData,
        disclaimerText: '<script>y</script>',
      });
      expect(html).not.toContain('<script');
    });

    it('T1.6 long text truncation: 600-char title produces valid HTML and body has no single text node > 250 chars', () => {
      const longTitle = 'x'.repeat(600);
      const html = renderAdTemplate({
        ...baseData,
        title: longTitle,
      });
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain('<body>');
      // Truncation: we should not see 600 x's in a row; max 200
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      expect(bodyMatch).toBeTruthy();
      const body = bodyMatch![1];
      // No single run of more than 250 consecutive 'x' (truncation applied)
      expect(body).not.toMatch(/x{251,}/);
    });

    it('T1.7 no-products text-only: zero products, no logo, but title + ctaText produces non-empty HTML with Hello and Buy now', () => {
      const html = renderAdTemplate({
        companyLogoDataUri: undefined,
        products: [],
        title: 'Hello',
        ctaText: 'Buy now',
        format: FORMAT_PRESETS[0],
      });
      expect(html).not.toBe('');
      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain('Hello');
      expect(html).toContain('Buy now');
    });
  });

  describe('STORY-39: titleFontSize and ctaButtons', () => {
    it('T1: renderTitle uses titleFontSize when provided', () => {
      const html = renderAdTemplate({ ...baseData, title: 'Sale', titleFontSize: 48 });
      expect(html).toContain('font-size:48px');
    });

    it('T1 default: renderTitle falls back to 32px when titleFontSize is omitted', () => {
      const html = renderAdTemplate({ ...baseData, title: 'Sale' });
      expect(html).toContain('font-size:32px');
    });

    it('T2 clamp low: titleFontSize < 16 is clamped to 16', () => {
      const html = renderAdTemplate({ ...baseData, title: 'Sale', titleFontSize: 4 });
      expect(html).toContain('font-size:16px');
    });

    it('T2 clamp high: titleFontSize > 72 is clamped to 72', () => {
      const html = renderAdTemplate({ ...baseData, title: 'Sale', titleFontSize: 999 });
      expect(html).toContain('font-size:72px');
    });

    it('T3: renderCta renders all buttons from ctaButtons array', () => {
      const html = renderAdTemplate({ ...baseData, ctaButtons: ['Shop now', 'See offers'] });
      expect(html).toContain('Shop now');
      expect(html).toContain('See offers');
    });

    it('T4: renderCta falls back to ctaText when ctaButtons is absent', () => {
      const html = renderAdTemplate({ ...baseData, ctaText: 'Buy now' });
      expect(html).toContain('Buy now');
    });

    it('T4 backward compat: ctaText still works when ctaButtons is empty', () => {
      const html = renderAdTemplate({ ...baseData, ctaText: 'Get offer', ctaButtons: [] });
      expect(html).toContain('Get offer');
    });

    it('T5: empty strings in ctaButtons are filtered out', () => {
      const html = renderAdTemplate({ ...baseData, ctaButtons: ['  ', 'Shop now', ''] });
      expect(html).toContain('Shop now');
      // The empty/whitespace entries should not produce extra anchor tags
      const anchorCount = (html.match(/<a href="#"/g) ?? []).length;
      expect(anchorCount).toBe(1);
    });

    it('T5 XSS in ctaButtons: script tags escaped', () => {
      const html = renderAdTemplate({ ...baseData, ctaButtons: ['<script>alert(1)</script>'] });
      expect(html).not.toContain('<script');
    });

    it('text-only preview works with ctaButtons (no products, no logo)', () => {
      const html = renderAdTemplate({
        companyLogoDataUri: undefined,
        products: [],
        title: 'Flash',
        ctaButtons: ['Shop now', 'Learn more'],
      });
      expect(html).not.toBe('');
      expect(html).toContain('Flash');
      expect(html).toContain('Shop now');
      expect(html).toContain('Learn more');
    });
  });

  describe('STORY-40: elementOrder — drag-to-reorder', () => {
    it('T1: elementOrder [products, headline, ...] renders headline HTML after product grid', () => {
      const html = renderAdTemplate({
        ...baseData,
        title: 'FLASH SALE',
        elementOrder: ['products', 'headline', 'badge', 'cta', 'disclaimer'],
      });
      const productIdx = html.indexOf('Samsung Galaxy S24');
      const headlineIdx = html.indexOf('FLASH SALE');
      expect(productIdx).toBeGreaterThan(0);
      expect(headlineIdx).toBeGreaterThan(productIdx);
    });

    it('T2: default order (no elementOrder) renders headline before product grid', () => {
      const html = renderAdTemplate({ ...baseData, title: 'PROMO' });
      const headlineIdx = html.indexOf('PROMO');
      const productIdx = html.indexOf('Samsung Galaxy S24');
      expect(headlineIdx).toBeGreaterThan(0);
      expect(headlineIdx).toBeLessThan(productIdx);
    });

    it('T3: elementOrder [badge, headline, products, cta, disclaimer] renders badge before headline', () => {
      const html = renderAdTemplate({
        ...baseData,
        title: 'Summer',
        badgeText: 'HOT DEAL',
        elementOrder: ['badge', 'headline', 'products', 'cta', 'disclaimer'],
      });
      const badgeIdx = html.indexOf('HOT DEAL');
      const headlineIdx = html.indexOf('Summer');
      expect(badgeIdx).toBeGreaterThan(0);
      expect(badgeIdx).toBeLessThan(headlineIdx);
    });

    it('T3b: cta before products renders CTA anchor before product name', () => {
      const html = renderAdTemplate({
        ...baseData,
        ctaButtons: ['Buy now'],
        elementOrder: ['headline', 'cta', 'products', 'badge', 'disclaimer'],
      });
      const ctaIdx = html.indexOf('Buy now');
      const productIdx = html.indexOf('Samsung Galaxy S24');
      expect(ctaIdx).toBeGreaterThan(0);
      expect(ctaIdx).toBeLessThan(productIdx);
    });

    it('T6: all 4 layouts produce valid HTML with default order (regression)', () => {
      const layouts = ['multi-grid', 'single-hero', 'sale-discount', 'category-group'] as const;
      for (const layout of layouts) {
        const html = renderAdTemplate({ ...baseData, layout, title: 'Test' });
        expect(html).toMatch(/<!DOCTYPE html>/i);
        expect(html).toContain('Samsung Galaxy S24');
        expect(html).toContain('Test');
      }
    });
  });

  describe('style customization', () => {
    it('applies custom accent and background color', () => {
      const html = renderAdTemplate({
        ...baseData,
        style: { accentColor: '#123456', backgroundColor: '#fef3c7' },
      });

      expect(html).toContain('background: #fef3c7;');
      expect(html).toContain('color:#123456');
    });

    it('supports backward-compatible accentColor/backgroundColor fields', () => {
      const html = renderAdTemplate({
        ...baseData,
        accentColor: '#ff00ff',
        backgroundColor: '#ffffff',
      });

      expect(html).toContain('background: #ffffff;');
      expect(html).toContain('color:#ff00ff');
    });
  });

  describe('STORY-43: logo resize, alignment & companion', () => {
    const logoData: AdTemplateData = {
      ...baseData,
      companyLogoDataUri: LOGO_DATA_URI,
    };

    it('T1 default: no new fields → max-height:64px, text-align via flex center', () => {
      const html = renderAdTemplate(logoData);
      expect(html).toContain('max-height:64px');
      expect(html).toContain('justify-content:center');
    });

    it('T2 logoHeight: renders custom height', () => {
      const html = renderAdTemplate({ ...logoData, logoHeight: 96 });
      expect(html).toContain('max-height:96px');
    });

    it('T3 logoAlignment left: wrapper has justify-content:flex-start', () => {
      const html = renderAdTemplate({ ...logoData, logoAlignment: 'left' });
      expect(html).toContain('justify-content:flex-start');
    });

    it('T4 logoAlignment right: wrapper has justify-content:flex-end', () => {
      const html = renderAdTemplate({ ...logoData, logoAlignment: 'right' });
      expect(html).toContain('justify-content:flex-end');
    });

    it('T5 logoCompanion headline: both logo and headline text in same wrapper', () => {
      const html = renderAdTemplate({ ...logoData, logoCompanion: 'headline', title: 'Big Sale' });
      const logoIdx = html.indexOf(LOGO_DATA_URI);
      const textIdx = html.indexOf('Big Sale');
      expect(logoIdx).toBeGreaterThan(-1);
      expect(textIdx).toBeGreaterThan(-1);
      // They should be close together (within 500 chars of each other)
      expect(Math.abs(logoIdx - textIdx)).toBeLessThan(500);
    });

    it('T6 logoCompanion badge: badge text appears alongside logo', () => {
      const html = renderAdTemplate({ ...logoData, logoCompanion: 'badge', badgeText: '30% OFF' });
      const logoIdx = html.indexOf(LOGO_DATA_URI);
      const badgeIdx = html.indexOf('30% OFF');
      expect(logoIdx).toBeGreaterThan(-1);
      expect(badgeIdx).toBeGreaterThan(-1);
      expect(Math.abs(logoIdx - badgeIdx)).toBeLessThan(500);
    });

    it('T7 logoCompanion emoji: emoji appears alongside logo', () => {
      const html = renderAdTemplate({ ...logoData, logoCompanion: 'emoji', emojiOrIcon: '🔥' });
      expect(html).toContain('🔥');
      expect(html).toContain(LOGO_DATA_URI);
    });

    it('T8 height clamped: 999 → 160px, 5 → 24px', () => {
      const htmlHigh = renderAdTemplate({ ...logoData, logoHeight: 999 });
      expect(htmlHigh).toContain('max-height:160px');
      const htmlLow = renderAdTemplate({ ...logoData, logoHeight: 5 });
      expect(htmlLow).toContain('max-height:24px');
    });
  });

  describe('STORY-48: logo–background visual compatibility', () => {
    it('T1 company logo in rendered HTML has logo-compat wrapper and styles', () => {
      const html = renderAdTemplate({ ...baseData, companyLogoDataUri: LOGO_DATA_URI });
      expect(html).toContain('logo-compat');
      expect(html).toContain('border-radius: 8px');
      expect(html).toContain('box-shadow: 0 2px 10px');
    });

    it('T2 brand logo in rendered HTML has brand-logo-compat wrapper', () => {
      const html = renderAdTemplate({
        ...baseData,
        products: [{ ...baseData.products[0], brandLogoDataUri: 'data:image/png;base64,brand' }],
      });
      expect(html).toContain('brand-logo-compat');
    });
  });

  describe('STORY-47: header brand logos in ad template', () => {
    const BRAND_URI_1 = 'data:image/png;base64,brandA';
    const BRAND_URI_2 = 'data:image/png;base64,brandB';

    it('T1 header brand logos appear in rendered HTML with correct testid and URIs', () => {
      const html = renderAdTemplate({
        ...baseData,
        companyLogoDataUri: LOGO_DATA_URI,
        headerBrandLogoDataUris: [BRAND_URI_1, BRAND_URI_2],
      });
      expect(html).toContain('header-brand-logos');
      expect(html).toContain(BRAND_URI_1);
      expect(html).toContain(BRAND_URI_2);
    });

    it('T2 header brand logos are capped at 5 (max count)', () => {
      const uris = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((x) => `data:image/png;base64,${x}`);
      const html = renderAdTemplate({
        ...baseData,
        companyLogoDataUri: LOGO_DATA_URI,
        headerBrandLogoDataUris: uris,
      });
      // Only first 5 should appear
      expect(html).toContain(uris[0]);
      expect(html).toContain(uris[4]);
      expect(html).not.toContain(uris[5]);
    });

    it('T3 no header brand logos when headerBrandLogoDataUris is empty', () => {
      const html = renderAdTemplate({
        ...baseData,
        companyLogoDataUri: LOGO_DATA_URI,
        headerBrandLogoDataUris: [],
      });
      expect(html).not.toContain('header-brand-logos');
    });

    it('T4 no header brand logos when headerBrandLogoDataUris is omitted', () => {
      const html = renderAdTemplate({ ...baseData, companyLogoDataUri: LOGO_DATA_URI });
      expect(html).not.toContain('header-brand-logos');
    });
  });
});
