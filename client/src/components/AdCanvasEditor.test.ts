/**
 * STORY-109 Phase 1 — Font size preset chip logic tests.
 * Environment: node (vitest). No DOM required.
 */
import { describe, it, expect } from 'vitest';
import {
  TITLE_FONT_SIZE_PRESETS,
  MIN_TITLE_FONT_SIZE,
  MAX_TITLE_FONT_SIZE,
} from '../lib/ad-constants';

describe('TITLE_FONT_SIZE_PRESETS', () => {
  it('contains exactly [16, 20, 24, 32, 48, 64]', () => {
    expect([...TITLE_FONT_SIZE_PRESETS]).toEqual([16, 20, 24, 32, 48, 64]);
  });

  it('is sorted ascending', () => {
    const sorted = [...TITLE_FONT_SIZE_PRESETS].sort((a, b) => a - b);
    expect([...TITLE_FONT_SIZE_PRESETS]).toEqual(sorted);
  });

  it('all values are within [MIN_TITLE_FONT_SIZE, MAX_TITLE_FONT_SIZE]', () => {
    for (const v of TITLE_FONT_SIZE_PRESETS) {
      expect(v).toBeGreaterThanOrEqual(MIN_TITLE_FONT_SIZE);
      expect(v).toBeLessThanOrEqual(MAX_TITLE_FONT_SIZE);
    }
  });
});

describe('font-size chip active logic', () => {
  function isChipActive(titleFontSize: number, preset: number) {
    return titleFontSize === preset;
  }

  it('chip 32 is active when titleFontSize is 32', () => {
    expect(isChipActive(32, 32)).toBe(true);
  });

  it('chip 16 is not active when titleFontSize is 32', () => {
    expect(isChipActive(32, 16)).toBe(false);
  });

  it('chip 64 is active when titleFontSize is 64', () => {
    expect(isChipActive(64, 64)).toBe(true);
  });
});

describe('font-size number input clamping logic', () => {
  function clamp(raw: number): number {
    return Math.min(MAX_TITLE_FONT_SIZE, Math.max(MIN_TITLE_FONT_SIZE, raw || MIN_TITLE_FONT_SIZE));
  }

  it('clamps values below MIN to MIN', () => {
    expect(clamp(8)).toBe(MIN_TITLE_FONT_SIZE);
  });

  it('clamps values above MAX to MAX', () => {
    expect(clamp(200)).toBe(MAX_TITLE_FONT_SIZE);
  });

  it('passes through a valid value unchanged', () => {
    expect(clamp(40)).toBe(40);
  });

  it('falls back to MIN when input is 0 (NaN-like)', () => {
    expect(clamp(0)).toBe(MIN_TITLE_FONT_SIZE);
  });
});
