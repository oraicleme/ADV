/**
 * STORY-201: Lexical “retrieval” over search rules (PoC) — no server index, no embeddings.
 * Complements exact STORY-196 matching when RAG-lite is enabled in settings.
 */

import { normalizeSearchQueryForPipeline } from './normalize-search-query';
import type { SearchRule } from './search-rules-storage';

/** Minimum similarity [0,1] for a rule’s queryPattern to apply under RAG-lite. */
export const RAG_LITE_DEFAULT_MIN_SCORE = 0.45;

function normalizeQueryForMatch(q: string): string {
  return normalizeSearchQueryForPipeline(q).toLowerCase();
}

function tokenize(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Similarity between the current search query and a rule’s stored pattern.
 * Returns 1 for exact normalized equality; otherwise token Jaccard + small substring bonus.
 */
export function scoreRuleQueryMatch(query: string, rule: SearchRule): number {
  const cq = normalizeQueryForMatch(query);
  const rq = rule.queryPattern;
  if (!cq || !rq) return 0;
  if (cq === rq) return 1;

  const ta = new Set(tokenize(cq));
  const tb = new Set(tokenize(rq));
  const jac = jaccard(ta, tb);
  let bonus = 0;
  if (cq.includes(rq) || rq.includes(cq)) {
    bonus = 0.2;
  }
  return Math.min(1, jac + bonus);
}

/**
 * Rules whose pattern scores at or above `minScore` contribute product keys (exclude/downrank).
 */
export function activeRuleKeysFromSemanticMatch(
  query: string,
  rules: SearchRule[],
  minScore: number = RAG_LITE_DEFAULT_MIN_SCORE,
): { exclude: Set<string>; downrank: Set<string> } {
  const exclude = new Set<string>();
  const downrank = new Set<string>();
  const q = query.trim();
  if (!q || rules.length === 0) return { exclude, downrank };

  for (const r of rules) {
    if (scoreRuleQueryMatch(query, r) < minScore) continue;
    const k = r.productKey.trim().toLowerCase();
    if (!k) continue;
    if (r.action === 'exclude') exclude.add(k);
    else downrank.add(k);
  }
  for (const k of exclude) downrank.delete(k);
  return { exclude, downrank };
}

export function mergeRuleKeySets(
  a: { exclude: Set<string>; downrank: Set<string> },
  b: { exclude: Set<string>; downrank: Set<string> },
): { exclude: Set<string>; downrank: Set<string> } {
  const exclude = new Set([...a.exclude, ...b.exclude]);
  const downrank = new Set([...a.downrank, ...b.downrank]);
  for (const k of exclude) downrank.delete(k);
  return { exclude, downrank };
}
