/**
 * Saved footer config persistence (same pattern as saved logos).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedFooters,
  saveFooter,
  removeSavedFooter,
  isSavedFootersFull,
  MAX_SAVED_FOOTERS,
} from './saved-footer-config';
import type { FooterConfig } from './ad-config-schema';

const baseConfig: FooterConfig = {
  enabled: true,
  options: [],
  companyName: 'Test Co',
  backgroundColor: '#1a1a1a',
  textColor: '#ffffff',
  contact: { phone: '+1 234', website: 'test.com', address: 'Street 1' },
};

describe('saved-footer-config', () => {
  beforeEach(() => {
    window.localStorage.removeItem('retail-promo-saved-footers');
  });

  it('getSavedFooters returns empty when storage is empty', () => {
    expect(getSavedFooters()).toEqual([]);
  });

  it('saveFooter adds an entry and getSavedFooters returns it', () => {
    const id = saveFooter({ config: baseConfig });
    expect(id).toBeDefined();
    const list = getSavedFooters();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, name: 'Test Co', config: baseConfig });
  });

  it('saveFooter uses custom name when provided', () => {
    saveFooter({ config: baseConfig, name: 'My Footer' });
    const list = getSavedFooters();
    expect(list[0].name).toBe('My Footer');
  });

  it('removeSavedFooter removes the entry', () => {
    const id = saveFooter({ config: baseConfig });
    expect(getSavedFooters()).toHaveLength(1);
    removeSavedFooter(id);
    expect(getSavedFooters()).toHaveLength(0);
  });

  it('respects max count', () => {
    for (let i = 0; i < MAX_SAVED_FOOTERS + 2; i++) {
      saveFooter({ config: { ...baseConfig, companyName: `Co ${i}` } });
    }
    expect(getSavedFooters().length).toBe(MAX_SAVED_FOOTERS);
  });

  it('isSavedFootersFull returns true when at max', () => {
    for (let i = 0; i < MAX_SAVED_FOOTERS; i++) {
      saveFooter({ config: { ...baseConfig, companyName: `Co ${i}` } });
    }
    expect(isSavedFootersFull()).toBe(true);
  });
});
