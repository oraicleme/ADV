/**
 * STORY-196: Pure post-processing — apply exclude / downrank rules after search.
 * STORY-197: Same pipeline normalization as MiniSearch / Meilisearch entry.
 * STORY-201: Optional RAG-lite merges lexical similarity with exact pattern match.
 */
import type { ProductItem } from './ad-constants';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';
import type { SearchRule } from './search-rules-storage';
import {
  activeRuleKeysFromSemanticMatch,
  mergeRuleKeySets,
} from './search-rules-rag-lite';
import { readSearchRulesRagLiteEnabled } from './search-rules-rag-lite-settings';

/** Normalize query for exact match with stored `queryPattern`. */
export function normalizeQueryForRuleMatch(q: string): string {
  return normalizeSearchQueryForPipeline(q).toLowerCase();
}

export function ruleAppliesToQuery(rule: SearchRule, currentQuery: string): boolean {
  const cq = normalizeQueryForRuleMatch(currentQuery);
  const rq = rule.queryPattern;
  if (!cq || !rq) return false;
  return cq === rq;
}

function productMatchesKey(p: ProductItem, keyLower: string): boolean {
  if (!keyLower) return false;
  const code = (p.code ?? '').trim().toLowerCase();
  if (code && code === keyLower) return true;
  const name = (p.name ?? '').trim().toLowerCase();
  if (name && name === keyLower) return true;
  return false;
}

/**
 * Collect exclude / downrank keys — exact queryPattern match (STORY-196).
 */
function activeRuleKeysExact(
  query: string,
  rules: SearchRule[],
): { exclude: Set<string>; downrank: Set<string> } {
  const exclude = new Set<string>();
  const downrank = new Set<string>();
  for (const r of rules) {
    if (!ruleAppliesToQuery(r, query)) continue;
    const k = r.productKey.trim().toLowerCase();
    if (!k) continue;
    if (r.action === 'exclude') exclude.add(k);
    else downrank.add(k);
  }
  for (const k of exclude) downrank.delete(k);
  return { exclude, downrank };
}

/**
 * Collect exclude / downrank keys that apply to this query.
 * When RAG-lite is enabled (Workspace → Search), merges exact match with lexical retrieval.
 */
export function activeRuleKeysForQuery(
  query: string,
  rules: SearchRule[],
): { exclude: Set<string>; downrank: Set<string> } {
  const exact = activeRuleKeysExact(query, rules);
  if (!readSearchRulesRagLiteEnabled()) return exact;
  const fuzzy = activeRuleKeysFromSemanticMatch(query, rules);
  return mergeRuleKeySets(exact, fuzzy);
}

/**
 * Manual search: ordered catalog indices → exclude + downrank (downranked to end, stable order).
 */
export function applySearchRulesToIndices(
  query: string,
  indices: number[],
  catalog: ProductItem[],
  rules: SearchRule[],
): number[] {
  const q = query.trim();
  if (!q || rules.length === 0) return indices;

  const { exclude, downrank } = activeRuleKeysForQuery(q, rules);
  if (exclude.size === 0 && downrank.size === 0) return indices;

  const kept: number[] = [];
  const low: number[] = [];
  for (const i of indices) {
    const p = catalog[i];
    if (!p) continue;
    let skip = false;
    for (const k of exclude) {
      if (productMatchesKey(p, k)) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    let isDown = false;
    for (const k of downrank) {
      if (productMatchesKey(p, k)) {
        isDown = true;
        break;
      }
    }
    if (isDown) low.push(i);
    else kept.push(i);
  }
  return [...kept, ...low];
}

export type Stage1Hit = { index: number; score: number };

/**
 * Agent Stage-1 Meilisearch hits: same semantics as indices (preserve score on kept rows).
 */
export function applySearchRulesToStage1Hits(
  query: string,
  hits: Stage1Hit[],
  catalog: ProductItem[],
  rules: SearchRule[],
): Stage1Hit[] {
  const q = query.trim();
  if (!q || rules.length === 0 || hits.length === 0) return hits;

  const indices = hits.map((h) => h.index);
  const ordered = applySearchRulesToIndices(q, indices, catalog, rules);
  const orderPos = new Map<number, number>();
  ordered.forEach((idx, pos) => orderPos.set(idx, pos));

  const filtered = hits.filter((h) => orderPos.has(h.index));
  filtered.sort((a, b) => (orderPos.get(a.index)! - orderPos.get(b.index)!));
  return filtered;
}
