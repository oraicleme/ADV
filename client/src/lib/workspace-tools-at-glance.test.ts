import { describe, expect, it } from 'vitest';
import { designDefaultsSummaryLine } from './workspace-tools-at-glance';
import type { DesignDefaultsSnapshot } from './design-defaults-storage';

describe('designDefaultsSummaryLine (STORY-186)', () => {
  it('formats known format + layout ids', () => {
    const s: DesignDefaultsSnapshot = {
      formatId: 'instagram-square',
      layoutId: 'multi-grid',
      backgroundColor: '#ffffff',
      accentColor: '#f97316',
      fontFamily: 'sans-serif',
    };
    expect(designDefaultsSummaryLine(s)).toBe('Instagram Post · Multi grid');
  });

  it('falls back to raw id for unknown format id', () => {
    const s: DesignDefaultsSnapshot = {
      formatId: 'unknown-format',
      layoutId: 'single-hero',
      backgroundColor: '#ffffff',
      accentColor: '#f97316',
      fontFamily: 'sans-serif',
    };
    expect(designDefaultsSummaryLine(s)).toBe('unknown-format · Single hero');
  });
});
