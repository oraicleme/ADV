import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedCreatives,
  saveCreative,
  removeCreative,
  clearSavedCreatives,
  autoName,
  MAX_SAVED_CREATIVES,
  type SavedCreativeConfig,
} from './saved-creatives';
import { DEFAULT_ELEMENT_ORDER } from './ad-constants';

const baseStyle = { backgroundColor: '#ffffff', accentColor: '#f97316', fontFamily: 'sans-serif' };

function makeConfig(overrides: Partial<SavedCreativeConfig> = {}): SavedCreativeConfig {
  return {
    products: [],
    headline: '',
    titleFontSize: 32,
    ctaButtons: [],
    badgeText: '',
    disclaimerText: '',
    emojiOrIcon: '',
    elementOrder: [...DEFAULT_ELEMENT_ORDER],
    layout: 'multi-grid',
    formatId: 'viber-story',
    style: baseStyle,
    ...overrides,
  };
}

describe('saved-creatives (STORY-37)', () => {
  beforeEach(() => {
    clearSavedCreatives();
  });

  describe('T1: getSavedCreatives returns [] when storage is empty', () => {
    it('returns empty array', () => {
      expect(getSavedCreatives()).toEqual([]);
    });
  });

  describe('T2: saveCreative stores entry and returns it', () => {
    it('saves and returns the creative with matching config', () => {
      const config = makeConfig({ headline: 'Summer Sale' });
      const saved = saveCreative(config);
      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('Summer Sale');
      expect(saved.savedAt).toBeGreaterThan(0);
      expect(saved.config.headline).toBe('Summer Sale');

      const list = getSavedCreatives();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(saved.id);
    });
  });

  describe('T3: getSavedCreatives returns entries newest first', () => {
    it('orders by savedAt descending', () => {
      saveCreative(makeConfig({ headline: 'First' }));
      saveCreative(makeConfig({ headline: 'Second' }));
      saveCreative(makeConfig({ headline: 'Third' }));

      const list = getSavedCreatives();
      expect(list[0].config.headline).toBe('Third');
      expect(list[1].config.headline).toBe('Second');
      expect(list[2].config.headline).toBe('First');
    });
  });

  describe('T4: removeCreative removes entry by id', () => {
    it('removes the targeted entry and keeps others', () => {
      const a = saveCreative(makeConfig({ headline: 'A' }));
      const b = saveCreative(makeConfig({ headline: 'B' }));
      removeCreative(a.id);

      const list = getSavedCreatives();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(b.id);
    });

    it('is a no-op for unknown id', () => {
      saveCreative(makeConfig({ headline: 'A' }));
      removeCreative('nonexistent-id');
      expect(getSavedCreatives()).toHaveLength(1);
    });
  });

  describe('T5: MAX_SAVED_CREATIVES limit evicts oldest', () => {
    it(`evicts the oldest when saving beyond ${MAX_SAVED_CREATIVES}`, () => {
      for (let i = 0; i < MAX_SAVED_CREATIVES; i++) {
        saveCreative(makeConfig({ headline: `Ad ${i}` }));
      }
      expect(getSavedCreatives()).toHaveLength(MAX_SAVED_CREATIVES);

      const overflow = saveCreative(makeConfig({ headline: 'Overflow Ad' }));
      const list = getSavedCreatives();
      expect(list).toHaveLength(MAX_SAVED_CREATIVES);
      expect(list[0].id).toBe(overflow.id);
      // The very first one saved (headline "Ad 0") should be evicted
      expect(list.some((e) => e.config.headline === 'Ad 0')).toBe(false);
    });
  });

  describe('T6: corrupt localStorage data is gracefully ignored', () => {
    it('returns [] when localStorage contains invalid JSON', () => {
      window.localStorage.setItem('retail-promo-saved-creatives', 'NOT_JSON{{{');
      expect(getSavedCreatives()).toEqual([]);
    });

    it('returns [] when localStorage contains non-array JSON', () => {
      window.localStorage.setItem('retail-promo-saved-creatives', JSON.stringify({ foo: 'bar' }));
      expect(getSavedCreatives()).toEqual([]);
    });

    it('filters out entries missing required fields', () => {
      window.localStorage.setItem(
        'retail-promo-saved-creatives',
        JSON.stringify([
          { id: 'valid', name: 'Valid', savedAt: 1000, config: { headline: 'ok' } },
          { name: 'Missing id', savedAt: 1001, config: {} },
          null,
          42,
        ]),
      );
      const list = getSavedCreatives();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('valid');
    });
  });

  describe('T7: autoName uses headline if set, otherwise product count', () => {
    it('uses headline when present', () => {
      expect(autoName({ headline: 'Summer Sale', products: [] })).toBe('Summer Sale');
    });

    it('truncates long headline at 32 chars', () => {
      const long = 'A'.repeat(40);
      const result = autoName({ headline: long, products: [] });
      expect(result).toBe(`${'A'.repeat(32)}…`);
    });

    it('uses product count when headline is empty', () => {
      expect(autoName({ headline: '', products: [{ name: 'P1' }, { name: 'P2' }] })).toBe('2 products');
    });

    it('uses singular "product" for count of 1', () => {
      expect(autoName({ headline: '', products: [{ name: 'P1' }] })).toBe('1 product');
    });

    it('falls back to "Saved creative" when no headline and no products', () => {
      expect(autoName({ headline: '', products: [] })).toBe('Saved creative');
    });
  });

  describe('saveCreative with custom name', () => {
    it('uses provided name over auto-name', () => {
      const saved = saveCreative(makeConfig({ headline: 'Headline' }), 'My Custom Name');
      expect(saved.name).toBe('My Custom Name');
    });
  });

  describe('config round-trip', () => {
    it('preserves all config fields', () => {
      const config = makeConfig({
        headline: 'Flash Sale',
        titleFontSize: 48,
        ctaButtons: ['Shop now', 'Learn more'],
        badgeText: '50% OFF',
        disclaimerText: 'Limited time',
        emojiOrIcon: '🔥',
        elementOrder: ['badge', 'headline', 'products', 'cta', 'disclaimer'],
        layout: 'sale-discount',
        formatId: 'instagram-square',
        style: { backgroundColor: '#111', accentColor: '#f00', fontFamily: 'serif' },
        products: [{ name: 'Widget', price: '19.99', category: 'Electronics' }],
      });
      const saved = saveCreative(config);
      const loaded = getSavedCreatives().find((e) => e.id === saved.id)!;
      expect(loaded.config).toEqual(config);
    });

    it('STORY-49: preserves savedBrandLogoIds', () => {
      const config = makeConfig({
        headline: 'Brand Ad',
        savedBrandLogoIds: ['saved-brand-1', 'saved-brand-2'],
      });
      const saved = saveCreative(config);
      const loaded = getSavedCreatives().find((e) => e.id === saved.id)!;
      expect(loaded.config.savedBrandLogoIds).toEqual(['saved-brand-1', 'saved-brand-2']);
    });
  });
});
