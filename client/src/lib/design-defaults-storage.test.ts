import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, FORMAT_PRESETS } from './ad-constants';
import {
  DESIGN_DEFAULTS_STORAGE_KEY,
  readDesignDefaultsSnapshot,
  resetDesignDefaultsToFactory,
  resolveWorkspaceDesignDefaults,
  writeDesignDefaults,
} from './design-defaults-storage';

describe('design-defaults-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns factory defaults when storage empty', () => {
    const s = readDesignDefaultsSnapshot();
    expect(s.formatId).toBe(FORMAT_PRESETS[0]!.id);
    expect(s.layoutId).toBe('multi-grid');
    expect(s.backgroundColor).toBe(DEFAULT_STYLE.backgroundColor);
    expect(resolveWorkspaceDesignDefaults().format.id).toBe(FORMAT_PRESETS[0]!.id);
  });

  it('persists and resolves custom defaults', () => {
    writeDesignDefaults({
      formatId: 'instagram-square',
      layoutId: 'single-hero',
      backgroundColor: '#111111',
      accentColor: '#222222',
      fontFamily: 'Georgia, serif',
    });
    const r = resolveWorkspaceDesignDefaults();
    expect(r.format.id).toBe('instagram-square');
    expect(r.layout).toBe('single-hero');
    expect(r.style.backgroundColor).toBe('#111111');
    expect(r.style.accentColor).toBe('#222222');
    expect(r.style.fontFamily).toBe('Georgia, serif');
  });

  it('rejects invalid hex and falls back', () => {
    localStorage.setItem(
      DESIGN_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        formatId: 'viber-story',
        layoutId: 'multi-grid',
        backgroundColor: 'not-a-color',
        accentColor: '#ff00ff',
        fontFamily: DEFAULT_STYLE.fontFamily,
      }),
    );
    const s = readDesignDefaultsSnapshot();
    expect(s.backgroundColor).toBe(DEFAULT_STYLE.backgroundColor);
    expect(s.accentColor).toBe('#ff00ff');
  });

  it('resetDesignDefaultsToFactory clears to factory snapshot', () => {
    writeDesignDefaults({ formatId: 'facebook-landscape' });
    resetDesignDefaultsToFactory();
    expect(readDesignDefaultsSnapshot().formatId).toBe(FORMAT_PRESETS[0]!.id);
  });
});
