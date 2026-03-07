import { describe, it, expect } from 'vitest';
import {
  buildAdCopyPrompt,
  parseAdCopyResponse,
  buildVisionPromptForProduct,
} from './ad-prompts';

describe('ad-prompts', () => {
  describe('buildAdCopyPrompt', () => {
    it('includes product list and layout', () => {
      const products = [
        { name: 'Shoes', code: 'SH1', price: '99', currency: 'EUR' },
        { name: 'Bag', price: '49' },
      ];
      const prompt = buildAdCopyPrompt(products, 'multi-grid', 'Summer sale');
      expect(prompt).toContain('Shoes');
      expect(prompt).toContain('SH1');
      expect(prompt).toContain('99');
      expect(prompt).toContain('multi-grid');
      expect(prompt).toContain('Summer sale');
      expect(prompt).toContain('product_descriptions');
      expect(prompt).toContain('headline');
    });

    it('uses default when userPrompt empty', () => {
      const prompt = buildAdCopyPrompt(
        [{ name: 'X', price: '1' }],
        'single-hero',
        ''
      );
      expect(prompt).toContain('Create a professional promotional ad');
    });
  });

  describe('parseAdCopyResponse', () => {
    it('parses raw JSON', () => {
      const json = '{"headline":"Big Sale","cta":"Shop Now","product_descriptions":["Nice shoes"]}';
      const out = parseAdCopyResponse(json);
      expect(out.headline).toBe('Big Sale');
      expect(out.cta).toBe('Shop Now');
      expect(out.product_descriptions).toEqual(['Nice shoes']);
    });

    it('strips markdown code fence', () => {
      const wrapped = '```json\n{"headline":"Hi"}\n```';
      const out = parseAdCopyResponse(wrapped);
      expect(out.headline).toBe('Hi');
    });
  });

  describe('buildVisionPromptForProduct', () => {
    it('includes product name and index', () => {
      const p = buildVisionPromptForProduct('Red Sneakers', 2);
      expect(p).toContain('product #3');
      expect(p).toContain('Red Sneakers');
      expect(p).toContain('short sentence');
    });
  });
});
