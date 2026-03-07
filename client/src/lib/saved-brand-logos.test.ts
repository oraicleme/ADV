import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedBrandLogos,
  saveBrandLogo,
  removeSavedBrandLogo,
  isSavedBrandLogosFull,
  MAX_SAVED_BRAND_LOGOS,
} from './saved-brand-logos';

const DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('saved-brand-logos (STORY-49)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('getSavedBrandLogos returns empty array when storage is empty', () => {
    expect(getSavedBrandLogos()).toEqual([]);
  });

  it('saveBrandLogo adds an entry and getSavedBrandLogos returns it', () => {
    const id = saveBrandLogo({ dataUri: DATA_URI, name: 'My Brand' });
    expect(id).toBeDefined();
    const list = getSavedBrandLogos();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, dataUri: DATA_URI, name: 'My Brand' });
    expect(list[0].savedAt).toBeGreaterThan(0);
  });

  it('removeSavedBrandLogo removes the entry', () => {
    const id = saveBrandLogo({ dataUri: DATA_URI, name: 'Brand' });
    expect(getSavedBrandLogos()).toHaveLength(1);
    removeSavedBrandLogo(id!);
    expect(getSavedBrandLogos()).toHaveLength(0);
  });

  it('removeSavedBrandLogo is no-op when id not found', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Brand' });
    removeSavedBrandLogo('nonexistent');
    expect(getSavedBrandLogos()).toHaveLength(1);
  });

  it('respects max count when saving', () => {
    for (let i = 0; i < MAX_SAVED_BRAND_LOGOS + 2; i++) {
      saveBrandLogo({ dataUri: DATA_URI, name: `Brand ${i}` });
    }
    expect(getSavedBrandLogos().length).toBe(MAX_SAVED_BRAND_LOGOS);
  });

  it('isSavedBrandLogosFull returns true when at max', () => {
    for (let i = 0; i < MAX_SAVED_BRAND_LOGOS; i++) {
      saveBrandLogo({ dataUri: DATA_URI, name: `Brand ${i}` });
    }
    expect(isSavedBrandLogosFull()).toBe(true);
  });

  it('isSavedBrandLogosFull returns false when under max', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'One' });
    expect(isSavedBrandLogosFull()).toBe(false);
  });
});
