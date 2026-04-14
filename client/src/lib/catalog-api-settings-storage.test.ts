import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CATALOG_API_SETTINGS_CHANGED_EVENT,
  CATALOG_API_SETTINGS_STORAGE_KEY,
  clearCatalogApiSettings,
  hasSavedCatalogApiConfig,
  readCatalogApiSettings,
  writeCatalogApiSettings,
} from './catalog-api-settings-storage';

const DEFAULTS = {
  baseUrl: '',
  authHeaderName: '',
  authHeaderValue: '',
  syncCadence: 'manual' as const,
  itemsPath: '',
  paginationMode: 'offset' as const,
  offsetParam: 'offset',
  limitParam: 'limit',
  pageParam: 'page',
  pageSizeParam: 'limit',
  pageSize: 100,
  firstPage: 0,
  startOffset: 0,
  maxPages: 50,
  maxProducts: 10000,
  mapName: 'name',
  mapCode: 'code',
  mapCategory: 'category',
  mapBrand: 'brand',
  mapPrice: 'price',
};

describe('catalog-api-settings-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns empty defaults when storage is empty', () => {
    expect(readCatalogApiSettings()).toEqual(DEFAULTS);
    expect(hasSavedCatalogApiConfig()).toBe(false);
  });

  it('writes partial updates and merges', () => {
    writeCatalogApiSettings({ baseUrl: 'https://a.example.com' });
    expect(readCatalogApiSettings()).toMatchObject({
      baseUrl: 'https://a.example.com',
      syncCadence: 'manual',
      mapName: 'name',
    });
    expect(hasSavedCatalogApiConfig()).toBe(true);
    writeCatalogApiSettings({ syncCadence: 'daily' });
    expect(readCatalogApiSettings().syncCadence).toBe('daily');
    expect(readCatalogApiSettings().baseUrl).toBe('https://a.example.com');
  });

  it('falls back syncCadence to manual when invalid', () => {
    localStorage.setItem(
      CATALOG_API_SETTINGS_STORAGE_KEY,
      JSON.stringify({ baseUrl: 'https://x.com', syncCadence: 'nope' }),
    );
    expect(readCatalogApiSettings().syncCadence).toBe('manual');
  });

  it('truncates oversized strings', () => {
    const longUrl = 'u'.repeat(5000);
    const longSecret = 's'.repeat(9000);
    writeCatalogApiSettings({ baseUrl: longUrl, authHeaderValue: longSecret });
    const s = readCatalogApiSettings();
    expect(s.baseUrl.length).toBe(2048);
    expect(s.authHeaderValue.length).toBe(8192);
  });

  it('persists STORY-178 mapping fields', () => {
    writeCatalogApiSettings({
      baseUrl: 'https://api.example.com/p',
      itemsPath: 'data.products',
      paginationMode: 'page',
      mapName: 'title',
    });
    const s = readCatalogApiSettings();
    expect(s.itemsPath).toBe('data.products');
    expect(s.paginationMode).toBe('page');
    expect(s.mapName).toBe('title');
    expect(s.offsetParam).toBe('offset');
  });

  it('clearCatalogApiSettings removes key', () => {
    writeCatalogApiSettings({ baseUrl: 'https://z.com' });
    clearCatalogApiSettings();
    expect(localStorage.getItem(CATALOG_API_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(hasSavedCatalogApiConfig()).toBe(false);
  });

  it('dispatches CATALOG_API_SETTINGS_CHANGED_EVENT on write', () => {
    const spy = vi.fn();
    window.addEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, spy);
    writeCatalogApiSettings({ baseUrl: 'https://b.example.com' });
    expect(spy).toHaveBeenCalled();
    window.removeEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, spy);
  });
});
