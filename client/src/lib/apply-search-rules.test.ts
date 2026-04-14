import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./search-rules-rag-lite-settings', () => ({
  readSearchRulesRagLiteEnabled: vi.fn(() => false),
}));

import type { ProductItem } from './ad-constants';
import { readSearchRulesRagLiteEnabled } from './search-rules-rag-lite-settings';
import {
  activeRuleKeysForQuery,
  applySearchRulesToIndices,
  applySearchRulesToStage1Hits,
  normalizeQueryForRuleMatch,
  ruleAppliesToQuery,
} from './apply-search-rules';
import type { SearchRule } from './search-rules-storage';

beforeEach(() => {
  vi.mocked(readSearchRulesRagLiteEnabled).mockReturnValue(false);
});

const catalog: ProductItem[] = [
  { name: 'Alpha Cable', code: 'SKU-A' },
  { name: 'Beta Case', code: 'SKU-B' },
  { name: 'Gamma Dock', code: 'SKU-C' },
];

function R(partial: Omit<SearchRule, 'id' | 'createdAt'> & { id?: string }): SearchRule {
  return {
    id: partial.id ?? 'r1',
    queryPattern: partial.queryPattern,
    productKey: partial.productKey,
    action: partial.action,
    createdAt: partial.createdAt ?? 0,
  };
}

describe('normalizeQueryForRuleMatch', () => {
  it('trims, lowercases, collapses spaces', () => {
    expect(normalizeQueryForRuleMatch('  Foo   Bar  ')).toBe('foo bar');
  });
});

describe('ruleAppliesToQuery', () => {
  it('matches exact normalized query', () => {
    const rule = R({ queryPattern: 'usb cable', productKey: 'x', action: 'exclude' });
    expect(ruleAppliesToQuery(rule, '  USB  cable')).toBe(true);
    expect(ruleAppliesToQuery(rule, 'usb')).toBe(false);
  });
});

describe('applySearchRulesToIndices', () => {
  it('excludes matching SKU for this query', () => {
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'case', productKey: 'SKU-B', action: 'exclude' }),
    ];
    const start = [0, 1, 2];
    expect(applySearchRulesToIndices('case', start, catalog, rules)).toEqual([0, 2]);
  });

  it('downranks to end (stable among non-downranked)', () => {
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'dock', productKey: 'SKU-A', action: 'downrank' }),
    ];
    const start = [0, 1, 2];
    expect(applySearchRulesToIndices('dock', start, catalog, rules)).toEqual([1, 2, 0]);
  });

  it('exclude wins over downrank for same key', () => {
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'gamma', productKey: 'SKU-C', action: 'exclude' }),
      R({ id: '2', queryPattern: 'gamma', productKey: 'SKU-C', action: 'downrank' }),
    ];
    expect(applySearchRulesToIndices('gamma', [0, 1, 2], catalog, rules)).toEqual([0, 1]);
  });

  it('no-op when query empty or no rules', () => {
    expect(applySearchRulesToIndices('', [1], catalog, [R({ queryPattern: 'a', productKey: 'SKU-A', action: 'exclude' })])).toEqual([1]);
    expect(applySearchRulesToIndices('case', [1], catalog, [])).toEqual([1]);
  });
});

describe('activeRuleKeysForQuery', () => {
  it('splits exclude vs downrank', () => {
    const rules: SearchRule[] = [
      R({ queryPattern: 'q', productKey: 'SKU-A', action: 'exclude' }),
      R({ queryPattern: 'q', productKey: 'SKU-B', action: 'downrank' }),
    ];
    const { exclude, downrank } = activeRuleKeysForQuery('q', rules);
    expect([...exclude]).toEqual(['sku-a']);
    expect([...downrank]).toEqual(['sku-b']);
  });

  it('STORY-201: exact-only when RAG-lite off — similar query does not activate rule', () => {
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'usb punjač', productKey: 'SKU-B', action: 'exclude' }),
    ];
    const { exclude } = activeRuleKeysForQuery('usb auto punjač', rules);
    expect([...exclude]).toEqual([]);
  });

  it('STORY-201: merges semantic match when RAG-lite on', () => {
    vi.mocked(readSearchRulesRagLiteEnabled).mockReturnValue(true);
    const rules: SearchRule[] = [
      R({ id: '1', queryPattern: 'usb punjač', productKey: 'SKU-B', action: 'exclude' }),
    ];
    const { exclude } = activeRuleKeysForQuery('usb auto punjač', rules);
    expect([...exclude]).toEqual(['sku-b']);
  });
});

describe('applySearchRulesToStage1Hits', () => {
  it('reorders and filters hits like indices', () => {
    const hits = [
      { index: 0, score: 9 },
      { index: 1, score: 8 },
      { index: 2, score: 7 },
    ];
    const rules: SearchRule[] = [R({ queryPattern: 'x', productKey: 'SKU-B', action: 'exclude' })];
    const out = applySearchRulesToStage1Hits('x', hits, catalog, rules);
    expect(out.map((h) => h.index)).toEqual([0, 2]);
    expect(out[0]!.score).toBe(9);
  });
});
