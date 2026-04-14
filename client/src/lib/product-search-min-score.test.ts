import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCatalogMinScoreForQuery } from './product-search-min-score';
import { resetSearchSettingsToDefaults, writeSearchSettings } from './search-settings-storage';

describe('product-search-min-score', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns 0 for short manual queries like type-c (default short threshold)', () => {
    expect(getCatalogMinScoreForQuery('type-c', 'manual')).toBe(0);
    expect(getCatalogMinScoreForQuery('usb-c', 'manual')).toBe(0);
  });

  it('returns 1.5 for longer manual queries (default long threshold)', () => {
    expect(getCatalogMinScoreForQuery('iphone 15 punjač', 'manual')).toBe(1.5);
  });

  it('returns 0 for any AI search query', () => {
    expect(getCatalogMinScoreForQuery('iphone 15 punjač', 'ai')).toBe(0);
    expect(getCatalogMinScoreForQuery('type-c', 'ai')).toBe(0);
  });

  it('returns long threshold for empty query (defensive)', () => {
    expect(getCatalogMinScoreForQuery('', 'manual')).toBe(1.5);
  });

  it('uses workspace search settings when set (manual only)', () => {
    writeSearchSettings({ longTenths: 20, shortTenths: 8 });
    expect(getCatalogMinScoreForQuery('iphone 15 punjač', 'manual')).toBe(2);
    expect(getCatalogMinScoreForQuery('type-c', 'manual')).toBe(0.8);
    expect(getCatalogMinScoreForQuery('iphone 15 punjač', 'ai')).toBe(0);
  });

  it('resetSearchSettingsToDefaults restores legacy min-score behavior', () => {
    writeSearchSettings({ longTenths: 5, shortTenths: 3 });
    resetSearchSettingsToDefaults();
    expect(getCatalogMinScoreForQuery('iphone 15 punjač', 'manual')).toBe(1.5);
    expect(getCatalogMinScoreForQuery('usb-c', 'manual')).toBe(0);
  });
});

