import { describe, expect, it } from 'vitest';
import type { ProductItem } from './ad-constants';
import { buildVocabularyHintsFromProducts, mergeStage1Subqueries } from './stage1-query-expansion';

describe('mergeStage1Subqueries (STORY-198)', () => {
  it('puts LLM suggestions first and dedupes', () => {
    const merged = mergeStage1Subqueries(
      ['usb punjač auto', '  USB punjač auto  '],
      ['usb punjač auto', 'type c'],
      8,
    );
    expect(merged[0]).toBe('usb punjač auto');
    expect(merged).toContain('type c');
    expect(merged.filter((x) => x === 'usb punjač auto')).toHaveLength(1);
  });

  it('respects maxTotal', () => {
    expect(mergeStage1Subqueries(['a', 'b'], ['c', 'd'], 2)).toHaveLength(2);
  });
});

describe('buildVocabularyHintsFromProducts', () => {
  it('returns unique names up to limit', () => {
    const rows: ProductItem[] = [
      { name: 'Alpha' },
      { name: 'alpha' },
      { name: 'Beta' },
    ];
    expect(buildVocabularyHintsFromProducts(rows, 10)).toEqual(['Alpha', 'Beta']);
  });
});
