import { describe, expect, it } from 'vitest';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';

describe('normalizeSearchQueryForPipeline (STORY-197)', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeSearchQueryForPipeline('  a   b\tc\n')).toBe('a b c');
  });

  it('removes zero-width characters', () => {
    expect(normalizeSearchQueryForPipeline('foo\u200Bbar')).toBe('foobar');
  });

  it('returns empty for whitespace-only', () => {
    expect(normalizeSearchQueryForPipeline('   \t')).toBe('');
  });

  it('is idempotent for already-normal strings', () => {
    const once = normalizeSearchQueryForPipeline('usb c punjač');
    expect(normalizeSearchQueryForPipeline(once)).toBe(once);
  });
});
