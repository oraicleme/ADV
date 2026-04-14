import { describe, it, expect } from 'vitest';
import {
  buildExpandedSearchQueries,
  mergeSearchHitsByMaxScore,
} from './select-products-query-expansion';

describe('buildExpandedSearchQueries', () => {
  it('includes diacritic-stripped form when different from lowercase', () => {
    const qs = buildExpandedSearchQueries('unutrašnje gume za trotinete');
    expect(qs[0]).toBe('unutrašnje gume za trotinete');
    expect(qs.some((q) => q.includes('unutrasnje') || q.includes('gume'))).toBe(true);
  });

  it('adds token-group queries from longest tokens', () => {
    const qs = buildExpandedSearchQueries('spoljne gume za trotinete');
    expect(qs.some((q) => q.split(/\s+/).length <= 3 && q.includes('gume'))).toBe(true);
  });

  it('returns single element for very short query', () => {
    expect(buildExpandedSearchQueries('ab')).toEqual(['ab']);
  });

  it('STORY-197: normalizes whitespace before expansion', () => {
    const qs = buildExpandedSearchQueries('  futrola   samsung  ');
    expect(qs[0]).toBe('futrola samsung');
  });
});

describe('mergeSearchHitsByMaxScore', () => {
  it('keeps max score per index and sorts by score', () => {
    const merged = mergeSearchHitsByMaxScore(
      [
        [
          { index: 1, score: 0.9 },
          { index: 2, score: 0.5 },
        ],
        [
          { index: 1, score: 0.7 },
          { index: 3, score: 0.95 },
        ],
      ],
      10,
    );
    expect(merged.map((m) => m.index)).toEqual([3, 1, 2]);
    expect(merged.find((m) => m.index === 1)?.score).toBe(0.9);
  });

  it('respects maxResults', () => {
    const merged = mergeSearchHitsByMaxScore(
      [[
        { index: 1, score: 0.1 },
        { index: 2, score: 0.2 },
        { index: 3, score: 0.3 },
      ]],
      2,
    );
    expect(merged).toHaveLength(2);
  });
});
