import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedBrandLogos,
  saveBrandLogo,
  removeSavedBrandLogo,
  isSavedBrandLogosFull,
  updateBrandLogoTags,
  getAllBrandLogoTags,
  filterBrandLogosByTags,
  reorderBrandLogos,
  exportBrandLogos,
  importBrandLogos,
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

  it('saveBrandLogo accepts tags', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Apple', tags: ['electronics', 'tech'] });
    const logos = getSavedBrandLogos();
    expect(logos[0]?.tags).toEqual(['electronics', 'tech']);
  });

  it('updateBrandLogoTags updates tags for a logo', () => {
    const id = saveBrandLogo({ dataUri: DATA_URI, name: 'Brand', tags: ['old'] });
    updateBrandLogoTags(id!, ['new', 'tags']);
    const logos = getSavedBrandLogos();
    expect(logos[0]?.tags).toEqual(['new', 'tags']);
  });

  it('getAllBrandLogoTags returns all unique tags', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 1', tags: ['electronics', 'tech'] });
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 2', tags: ['sports', 'tech'] });
    const tags = getAllBrandLogoTags();
    expect(tags).toEqual(['electronics', 'sports', 'tech']);
  });

  it('filterBrandLogosByTags filters by tags', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 1', tags: ['electronics'] });
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 2', tags: ['sports'] });
    const filtered = filterBrandLogosByTags(['electronics']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('Logo 1');
  });

  it('reorderBrandLogos reorders logos', () => {
    const id1 = saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 1' });
    const id2 = saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 2' });
    reorderBrandLogos([id2!, id1!]);
    const logos = getSavedBrandLogos();
    expect(logos[0]?.name).toBe('Logo 2');
    expect(logos[1]?.name).toBe('Logo 1');
  });

  it('exportBrandLogos exports as JSON', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 1', tags: ['test'] });
    const exported = exportBrandLogos();
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]?.name).toBe('Logo 1');
  });

  it('importBrandLogos imports from JSON', () => {
    saveBrandLogo({ dataUri: DATA_URI, name: 'Logo 1' });
    const exported = exportBrandLogos();
    window.localStorage.clear();
    const count = importBrandLogos(exported);
    expect(count).toBe(1);
    const logos = getSavedBrandLogos();
    expect(logos[0]?.name).toBe('Logo 1');
  });

  it('importBrandLogos returns 0 for invalid JSON', () => {
    const count = importBrandLogos('invalid');
    expect(count).toBe(0);
  });
});
