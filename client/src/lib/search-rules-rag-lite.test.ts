import { describe, expect, it } from 'vitest';
import type { SearchRule } from './search-rules-storage';
import {
  RAG_LITE_DEFAULT_MIN_SCORE,
  activeRuleKeysFromSemanticMatch,
  mergeRuleKeySets,
  scoreRuleQueryMatch,
} from './search-rules-rag-lite';

function R(partial: Omit<SearchRule, 'id' | 'createdAt'> & { id?: string }): SearchRule {
  return {
    id: partial.id ?? 'r1',
    queryPattern: partial.queryPattern,
    productKey: partial.productKey,
    action: partial.action,
    createdAt: partial.createdAt ?? 0,
  };
}

describe('scoreRuleQueryMatch', () => {
  it('returns 1 for exact normalized match', () => {
    const rule = R({ queryPattern: 'usb punjač', productKey: 'a', action: 'exclude' });
    expect(scoreRuleQueryMatch('  USB  punjač  ', rule)).toBe(1);
  });

  it('returns intermediate score for token overlap', () => {
    const rule = R({ queryPattern: 'usb punjač', productKey: 'a', action: 'exclude' });
    const s = scoreRuleQueryMatch('usb auto punjač', rule);
    expect(s).toBeGreaterThanOrEqual(RAG_LITE_DEFAULT_MIN_SCORE);
    expect(s).toBeLessThan(1);
  });

  it('returns low score for unrelated queries', () => {
    const rule = R({ queryPattern: 'iphone case', productKey: 'a', action: 'exclude' });
    expect(scoreRuleQueryMatch('samsung dock', rule)).toBeLessThan(0.3);
  });
});

describe('mergeRuleKeySets', () => {
  it('union excludes and drops downrank keys that are excluded', () => {
    const a = { exclude: new Set(['a']), downrank: new Set(['b']) };
    const b = { exclude: new Set(['b']), downrank: new Set(['c']) };
    const m = mergeRuleKeySets(a, b);
    expect([...m.exclude].sort()).toEqual(['a', 'b']);
    expect([...m.downrank].sort()).toEqual(['c']);
  });
});

describe('activeRuleKeysFromSemanticMatch', () => {
  it('includes keys when score meets threshold', () => {
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'usb punjač', productKey: 'SKU-X', action: 'exclude' }),
    ];
    const { exclude } = activeRuleKeysFromSemanticMatch('usb auto punjač', rules);
    expect([...exclude]).toEqual(['sku-x']);
  });
});
