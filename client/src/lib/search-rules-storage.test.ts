import { describe, expect, it, beforeEach } from 'vitest';
import {
  addSearchRule,
  readSearchRules,
  removeSearchRule,
  SEARCH_RULES_STORAGE_KEY,
  clearSearchRules,
} from './search-rules-storage';

describe('search-rules-storage', () => {
  beforeEach(() => {
    localStorage.removeItem(SEARCH_RULES_STORAGE_KEY);
  });

  it('addSearchRule normalizes pattern and persists', () => {
    const r = addSearchRule({
      queryPattern: '  Hello  World ',
      productKey: ' ABC-1 ',
      action: 'exclude',
    });
    expect(r).not.toBeNull();
    const all = readSearchRules();
    expect(all).toHaveLength(1);
    expect(all[0]!.queryPattern).toBe('hello world');
    expect(all[0]!.productKey).toBe('ABC-1');
  });

  it('removeSearchRule drops one id', () => {
    const a = addSearchRule({ queryPattern: 'q1', productKey: 'A', action: 'exclude' });
    const b = addSearchRule({ queryPattern: 'q2', productKey: 'B', action: 'downrank' });
    expect(readSearchRules()).toHaveLength(2);
    removeSearchRule(a!.id);
    const rest = readSearchRules();
    expect(rest).toHaveLength(1);
    expect(rest[0]!.id).toBe(b!.id);
  });

  it('clearSearchRules empties', () => {
    addSearchRule({ queryPattern: 'q', productKey: 'x', action: 'exclude' });
    clearSearchRules();
    expect(readSearchRules()).toHaveLength(0);
  });
});
