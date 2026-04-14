/**
 * STORY-196: Browser-local search rules (exclude / downrank) keyed by query pattern + product SKU/name.
 * STORY-197: Query patterns use `normalizeSearchQueryForPipeline` + lowercase.
 */

import { nanoid } from 'nanoid';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';

export const SEARCH_RULES_STORAGE_KEY = 'oraicle-search-rules-v1';

/** Dispatched after rules change so list UIs recompute visible rows. */
export const SEARCH_RULES_CHANGED_EVENT = 'oraicle-search-rules-changed';

export const MAX_SEARCH_RULES = 50;

export type SearchRuleAction = 'exclude' | 'downrank';

export type SearchRule = {
  id: string;
  /** Normalized at write: trim + lowercase single-line (exact match against current query). */
  queryPattern: string;
  /** Match against `product.code` or exact `product.name` (case-insensitive). */
  productKey: string;
  action: SearchRuleAction;
  createdAt: number;
};

function normalizePattern(raw: string): string {
  return normalizeSearchQueryForPipeline(raw).toLowerCase();
}

function parseRules(raw: unknown): SearchRule[] {
  if (!Array.isArray(raw)) return [];
  const out: SearchRule[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : '';
    const queryPattern = typeof o.queryPattern === 'string' ? normalizePattern(o.queryPattern) : '';
    const productKey = typeof o.productKey === 'string' ? o.productKey.trim() : '';
    const action = o.action === 'exclude' || o.action === 'downrank' ? o.action : null;
    const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now();
    if (!id || !queryPattern || !productKey || !action) continue;
    out.push({ id, queryPattern, productKey, action, createdAt });
  }
  return out.slice(0, MAX_SEARCH_RULES);
}

export function readSearchRules(): SearchRule[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEARCH_RULES_STORAGE_KEY);
    if (!raw?.trim()) return [];
    return parseRules(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeRules(rules: SearchRule[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SEARCH_RULES_STORAGE_KEY, JSON.stringify(rules));
    dispatchSearchRulesChanged();
  } catch {
    /* quota */
  }
}

function dispatchSearchRulesChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SEARCH_RULES_CHANGED_EVENT));
}

export function addSearchRule(partial: Omit<SearchRule, 'id' | 'createdAt'>): SearchRule | null {
  const queryPattern = normalizePattern(partial.queryPattern);
  const productKey = partial.productKey.trim();
  if (!queryPattern || !productKey) return null;
  const cur = readSearchRules();
  if (cur.length >= MAX_SEARCH_RULES) return null;
  const rule: SearchRule = {
    id: nanoid(10),
    queryPattern,
    productKey,
    action: partial.action,
    createdAt: Date.now(),
  };
  writeRules([rule, ...cur]);
  return rule;
}

export function removeSearchRule(id: string): void {
  const cur = readSearchRules().filter((r) => r.id !== id);
  writeRules(cur);
}

export function clearSearchRules(): void {
  writeRules([]);
}
