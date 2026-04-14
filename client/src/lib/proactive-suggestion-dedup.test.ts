import { describe, it, expect } from 'vitest';
import {
  proactiveSuggestionDedupKey,
  rememberDismissedSuggestionKey,
  shouldSkipProactiveSuggestionForRecentDismissals,
  hashProactiveSuggestionTipForAnalytics,
  PROACTIVE_SUGGESTION_RECENT_DISMISSALS_MAX,
} from './proactive-suggestion-dedup';

describe('proactiveSuggestionDedupKey', () => {
  it('normalizes case and punctuation', () => {
    expect(proactiveSuggestionDedupKey('  Hello, World!  ')).toBe('hello world');
  });

  it('treats equivalent unicode as same bucket', () => {
    expect(proactiveSuggestionDedupKey('café')).toBe('café');
  });
});

describe('rememberDismissedSuggestionKey', () => {
  it('prepends, dedupes, and caps', () => {
    let acc: string[] = [];
    for (let i = 0; i < 5; i++) {
      acc = rememberDismissedSuggestionKey(acc, `k${i}`, 3);
    }
    expect(acc).toEqual(['k4', 'k3', 'k2']);
  });

  it('moves duplicate key to front', () => {
    const acc = rememberDismissedSuggestionKey(['a', 'b'], 'a');
    expect(acc).toEqual(['a', 'b']);
  });
});

describe('hashProactiveSuggestionTipForAnalytics', () => {
  it('returns stable 8-char hex for same normalized text', () => {
    const a = hashProactiveSuggestionTipForAnalytics('Hello, World!');
    const b = hashProactiveSuggestionTipForAnalytics('hello world');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('differs for different tips', () => {
    expect(hashProactiveSuggestionTipForAnalytics('add badge')).not.toBe(
      hashProactiveSuggestionTipForAnalytics('bigger images'),
    );
  });
});

describe('shouldSkipProactiveSuggestionForRecentDismissals', () => {
  it('returns true when normalized message matches a recent key', () => {
    const recent = [proactiveSuggestionDedupKey('Add a headline!')];
    expect(shouldSkipProactiveSuggestionForRecentDismissals('add a headline', recent)).toBe(true);
  });

  it('returns false for unseen message', () => {
    expect(shouldSkipProactiveSuggestionForRecentDismissals('new tip', ['old tip'])).toBe(false);
  });
});
