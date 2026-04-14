/**
 * STORY-109 Phase 2 — Footer config state logic tests.
 * STORY-127: Mandatory footer — default for new creatives is on.
 * Environment: node (vitest). No DOM required.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_FOOTER_FOR_NEW_CREATIVE, type FooterConfig } from './ad-config-schema';

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: false,
  options: [],
  backgroundColor: '#1a1a1a',
  textColor: '#ffffff',
};

describe('FooterConfig default state', () => {
  it('T3 / STORY-127: default for new creatives has footer enabled', () => {
    expect(DEFAULT_FOOTER_FOR_NEW_CREATIVE.enabled).toBe(true);
  });

  it('default config (legacy disabled) has enabled=false', () => {
    expect(DEFAULT_FOOTER_CONFIG.enabled).toBe(false);
  });

  it('default config has empty options array', () => {
    expect(DEFAULT_FOOTER_CONFIG.options).toEqual([]);
  });

  it('default background is #1a1a1a', () => {
    expect(DEFAULT_FOOTER_CONFIG.backgroundColor).toBe('#1a1a1a');
  });

  it('default text color is #ffffff', () => {
    expect(DEFAULT_FOOTER_CONFIG.textColor).toBe('#ffffff');
  });
});

describe('FooterConfig serialization', () => {
  it('full config serialises to expected JSON shape', () => {
    const config: FooterConfig = {
      enabled: true,
      options: ['contact'],
      backgroundColor: '#ff0000',
      textColor: '#000000',
      companyName: 'Mobileland',
      contact: {
        phone: '+387 61 100 200',
        website: 'https://mobileland.me',
        address: 'Str. 15, Sarajevo',
      },
    };
    const json = JSON.parse(JSON.stringify(config)) as FooterConfig;
    expect(json.enabled).toBe(true);
    expect(json.companyName).toBe('Mobileland');
    expect(json.contact?.phone).toBe('+387 61 100 200');
    expect(json.contact?.website).toBe('https://mobileland.me');
  });
});

describe('Footer prop to AdCanvasEditor', () => {
  function getFooterProp(enabled: boolean, config: FooterConfig): FooterConfig | undefined {
    return enabled ? config : undefined;
  }

  it('passes undefined to canvas when footer is disabled', () => {
    expect(getFooterProp(false, DEFAULT_FOOTER_CONFIG)).toBeUndefined();
  });

  it('passes config object to canvas when footer is enabled', () => {
    const config: FooterConfig = { ...DEFAULT_FOOTER_CONFIG, enabled: true };
    expect(getFooterProp(true, config)).toBe(config);
  });

  it('toggling enabled from true to false returns undefined prop', () => {
    const config: FooterConfig = { ...DEFAULT_FOOTER_CONFIG, enabled: true };
    expect(getFooterProp(false, config)).toBeUndefined();
    expect(getFooterProp(true, config)).toEqual(config);
  });
});
