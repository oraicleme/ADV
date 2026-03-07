import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedLogos,
  saveLogo,
  removeSavedLogo,
  isSavedLogosFull,
  MAX_SAVED_LOGOS,
} from './saved-logos';

const DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('saved-logos', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('getSavedLogos returns empty array when storage is empty', () => {
    expect(getSavedLogos()).toEqual([]);
  });

  it('saveLogo adds an entry and getSavedLogos returns it', () => {
    const id = saveLogo({ dataUri: DATA_URI, name: 'My Logo' });
    expect(id).toBeDefined();
    const list = getSavedLogos();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, dataUri: DATA_URI, name: 'My Logo' });
    expect(list[0].savedAt).toBeGreaterThan(0);
  });

  it('removeSavedLogo removes the entry', () => {
    const id = saveLogo({ dataUri: DATA_URI, name: 'Logo' });
    expect(getSavedLogos()).toHaveLength(1);
    removeSavedLogo(id!);
    expect(getSavedLogos()).toHaveLength(0);
  });

  it('removeSavedLogo is no-op when id not found', () => {
    saveLogo({ dataUri: DATA_URI, name: 'Logo' });
    removeSavedLogo('nonexistent');
    expect(getSavedLogos()).toHaveLength(1);
  });

  it('respects max count when saving', () => {
    for (let i = 0; i < MAX_SAVED_LOGOS + 2; i++) {
      saveLogo({ dataUri: DATA_URI, name: `Logo ${i}` });
    }
    expect(getSavedLogos().length).toBe(MAX_SAVED_LOGOS);
  });

  it('isSavedLogosFull returns true when at max', () => {
    for (let i = 0; i < MAX_SAVED_LOGOS; i++) {
      saveLogo({ dataUri: DATA_URI, name: `Logo ${i}` });
    }
    expect(isSavedLogosFull()).toBe(true);
  });

  it('isSavedLogosFull returns false when under max', () => {
    saveLogo({ dataUri: DATA_URI, name: 'One' });
    expect(isSavedLogosFull()).toBe(false);
  });
});
