/**
 * STORY-137 T3 + STORY-199: Unit tests for smart LLM routing (`shouldSkipSelectProductsLLM`).
 */

import { describe, it, expect } from 'vitest';
import {
  MIN_CANDIDATES_FOR_SMART_SKIP,
  shouldSkipSelectProductsLLM as shouldSkipLLM,
} from './meilisearch-smart-routing';

interface Hit {
  index: number;
  score: number;
  semanticScore?: number;
}

// ---------------------------------------------------------------------------
// T3 — Smart routing: skip selectProducts when all scores exceed threshold
// ---------------------------------------------------------------------------

describe('T3 — Smart routing: skip selectProducts when confidence is high', () => {
  const highConfidenceHits: Hit[] = [
    { index: 0, score: 0.95, semanticScore: 0.92 },
    { index: 1, score: 0.91, semanticScore: 0.88 },
    { index: 2, score: 0.87, semanticScore: 0.84 },
  ];

  const lowConfidenceHits: Hit[] = [
    { index: 0, score: 0.90, semanticScore: 0.87 },
    { index: 1, score: 0.72, semanticScore: 0.65 }, // below threshold
    { index: 2, score: 0.88, semanticScore: 0.85 },
  ];

  it('returns true when hybrid is on, provider is meilisearch, all scores >= threshold', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: highConfidenceHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(true);
  });

  it('returns false when any hit score is below threshold', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: lowConfidenceHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });

  it('returns false when hybrid is disabled (pure BM25 mode)', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: false,
        searchProvider: 'meilisearch',
        hits: highConfidenceHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });

  it('returns false when provider is minisearch (Meilisearch not configured)', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'minisearch',
        hits: highConfidenceHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });

  it('returns false when fewer than MIN_CANDIDATES_FOR_SMART_SKIP hits are returned', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: [{ index: 0, score: 0.99 }, { index: 1, score: 0.98 }], // only 2 hits
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
    expect(MIN_CANDIDATES_FOR_SMART_SKIP).toBe(3);
  });

  it('returns true exactly at threshold boundary (score === threshold)', () => {
    const exactThresholdHits: Hit[] = [
      { index: 0, score: 0.85 },
      { index: 1, score: 0.85 },
      { index: 2, score: 0.85 },
    ];
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: exactThresholdHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(true);
  });

  it('returns false when confidenceThreshold is set to 1.0 (always use LLM)', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: highConfidenceHits,
        confidenceThreshold: 1.0, // no real score can reach 1.0
      }),
    ).toBe(false);
  });

  it('returns true with exactly MIN_CANDIDATES_FOR_SMART_SKIP (3) high-confidence hits', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: [{ index: 0, score: 0.90 }, { index: 1, score: 0.92 }, { index: 2, score: 0.95 }],
        confidenceThreshold: 0.85,
      }),
    ).toBe(true);
  });

  it('handles large hit sets with all scores above threshold', () => {
    const manyHits: Hit[] = Array.from({ length: 50 }, (_, i) => ({
      index: i,
      score: 0.90 + (i % 5) * 0.01, // 0.90–0.94
    }));
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: manyHits,
        confidenceThreshold: 0.85,
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T3 continuation — LLM is called when confidence is mixed
// ---------------------------------------------------------------------------

describe('T3 — selectProducts is called when scores are below threshold', () => {
  it('returns false for empty hits (no candidates)', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: [],
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });

  it('returns false when scores are all zero (index not ready / no embeddings yet)', () => {
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: [{ index: 0, score: 0 }, { index: 1, score: 0 }, { index: 2, score: 0 }],
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });

  it('returns false when only one hit scores below threshold in a long list', () => {
    const hitsWithOneWeak: Hit[] = [
      ...Array.from({ length: 9 }, (_, i) => ({ index: i, score: 0.95 })),
      { index: 9, score: 0.70 }, // the weak one
    ];
    expect(
      shouldSkipLLM({
        hybridEnabled: true,
        searchProvider: 'meilisearch',
        hits: hitsWithOneWeak,
        confidenceThreshold: 0.85,
      }),
    ).toBe(false);
  });
});
