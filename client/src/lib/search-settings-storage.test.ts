import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readSearchSettings,
  resetSearchSettingsToDefaults,
  SEARCH_SETTINGS_CHANGED_EVENT,
  SEARCH_SETTINGS_STORAGE_KEY,
  writeSearchSettings,
} from './search-settings-storage';

describe('search-settings-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty', () => {
    expect(readSearchSettings()).toEqual({ longTenths: 15, shortTenths: 0 });
  });

  it('writes partial updates and merges with existing', () => {
    writeSearchSettings({ longTenths: 20 });
    expect(readSearchSettings()).toEqual({ longTenths: 20, shortTenths: 0 });
    writeSearchSettings({ shortTenths: 5 });
    expect(readSearchSettings()).toEqual({ longTenths: 20, shortTenths: 5 });
  });

  it('clamps out-of-range values', () => {
    writeSearchSettings({ longTenths: 999, shortTenths: -5 });
    expect(readSearchSettings()).toEqual({ longTenths: 30, shortTenths: 0 });
  });

  it('normalizes missing keys in JSON to defaults', () => {
    localStorage.setItem(SEARCH_SETTINGS_STORAGE_KEY, '{}');
    expect(readSearchSettings()).toEqual({ longTenths: 15, shortTenths: 0 });
  });

  it('resetSearchSettingsToDefaults restores factory values', () => {
    writeSearchSettings({ longTenths: 5, shortTenths: 10 });
    resetSearchSettingsToDefaults();
    expect(readSearchSettings()).toEqual({ longTenths: 15, shortTenths: 0 });
  });

  it('dispatches SEARCH_SETTINGS_CHANGED_EVENT on write', () => {
    const spy = vi.fn();
    window.addEventListener(SEARCH_SETTINGS_CHANGED_EVENT, spy);
    writeSearchSettings({ longTenths: 10 });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(SEARCH_SETTINGS_CHANGED_EVENT, spy);
  });
});
