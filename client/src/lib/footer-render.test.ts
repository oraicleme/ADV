/**
 * STORY-109 Phase 3 — FooterBar render logic tests.
 * Environment: node (vitest). No DOM required.
 */
import { describe, it, expect } from 'vitest';
import type { FooterConfig } from './ad-config-schema';

/** Mirrors the field-visibility logic used inside renderFooter(). */
function renderFooterFields(config: FooterConfig): { key: string; value: string }[] {
  if (!config.enabled) return [];
  const fields: { key: string; value: string }[] = [];
  if (config.companyName?.trim()) fields.push({ key: 'companyName', value: config.companyName.trim() });
  if (config.contact?.phone?.trim()) fields.push({ key: 'phone', value: config.contact.phone.trim() });
  if (config.contact?.website?.trim()) fields.push({ key: 'website', value: config.contact.website.trim() });
  if (config.contact?.address?.trim()) fields.push({ key: 'address', value: config.contact.address.trim() });
  return fields;
}

/** Mirrors the null-guard in renderFooter(). */
function shouldRenderFooter(footer: FooterConfig | undefined): boolean {
  if (!footer?.enabled) return false;
  const hasAnyField =
    !!footer.companyName?.trim() ||
    !!footer.contact?.phone?.trim() ||
    !!footer.contact?.website?.trim() ||
    !!footer.contact?.address?.trim();
  return hasAnyField;
}

describe('renderFooterFields', () => {
  it('returns [] when no fields set', () => {
    const config: FooterConfig = { enabled: true, options: [] };
    expect(renderFooterFields(config)).toEqual([]);
  });

  it('returns correct fields when phone + website set', () => {
    const config: FooterConfig = {
      enabled: true,
      options: ['contact'],
      contact: { phone: '+387 61 100 200', website: 'https://mobileland.me' },
    };
    const fields = renderFooterFields(config);
    expect(fields.some((f) => f.key === 'phone' && f.value === '+387 61 100 200')).toBe(true);
    expect(fields.some((f) => f.key === 'website' && f.value === 'https://mobileland.me')).toBe(true);
  });

  it('skips empty string fields', () => {
    const config: FooterConfig = {
      enabled: true,
      options: [],
      companyName: '',
      contact: { phone: '', website: 'https://example.com', address: '' },
    };
    const fields = renderFooterFields(config);
    expect(fields.some((f) => f.key === 'companyName')).toBe(false);
    expect(fields.some((f) => f.key === 'phone')).toBe(false);
    expect(fields.some((f) => f.key === 'address')).toBe(false);
    expect(fields.some((f) => f.key === 'website')).toBe(true);
  });

  it('returns [] when enabled is false even if fields are set', () => {
    const config: FooterConfig = {
      enabled: false,
      options: [],
      companyName: 'Mobileland',
      contact: { phone: '+387 61 100 200' },
    };
    expect(renderFooterFields(config)).toEqual([]);
  });
});

describe('shouldRenderFooter (null guard)', () => {
  it('returns false when footer is undefined', () => {
    expect(shouldRenderFooter(undefined)).toBe(false);
  });

  it('returns false when footer.enabled is false', () => {
    expect(shouldRenderFooter({ enabled: false, options: [], companyName: 'Mobileland' })).toBe(false);
  });

  it('returns false when footer is enabled but all fields are empty', () => {
    expect(shouldRenderFooter({ enabled: true, options: [] })).toBe(false);
  });

  it('returns true when footer enabled + company name set', () => {
    expect(shouldRenderFooter({ enabled: true, options: [], companyName: 'Mobileland' })).toBe(true);
  });

  it('returns true when footer enabled + phone set', () => {
    expect(shouldRenderFooter({ enabled: true, options: ['contact'], contact: { phone: '+387 61 100 200' } })).toBe(true);
  });
});
