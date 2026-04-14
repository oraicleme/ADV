import { describe, it, expect } from 'vitest';
import { buildSeedSearchQuery } from './product-swap-seed';

describe('buildSeedSearchQuery', () => {
  it('uses first words of product name', () => {
    expect(buildSeedSearchQuery('Kucni punjac Teracell Evolution TC-500')).toBe(
      'Kucni punjac Teracell Evolution TC-500',
    );
  });

  it('falls back to code when name empty', () => {
    expect(buildSeedSearchQuery('', '1071477')).toBe('1071477');
  });

  it('truncates very long single token names', () => {
    const long = 'a'.repeat(100);
    const out = buildSeedSearchQuery(long);
    expect(out.length).toBeLessThanOrEqual(73);
  });
});
