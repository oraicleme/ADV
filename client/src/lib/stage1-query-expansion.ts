/**
 * STORY-198: Merge LLM-suggested sub-queries with deterministic `buildExpandedSearchQueries` output.
 */
import type { ProductItem } from './ad-constants';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';

/** Dedupe by normalized form; LLM suggestions first (recall), then deterministic. */
export function mergeStage1Subqueries(
  llmSuggestions: string[],
  deterministic: string[],
  maxTotal: number,
): string[] {
  const norm = (s: string) => normalizeSearchQueryForPipeline(s).toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...llmSuggestions, ...deterministic]) {
    const n = norm(s);
    if (!n || n.length > 200) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(normalizeSearchQueryForPipeline(s));
    if (out.length >= maxTotal) break;
  }
  return out;
}

/** Unique product names for LLM vocabulary hints (no prices, codes optional — names only for brevity). */
export function buildVocabularyHintsFromProducts(products: ProductItem[], limit = 40): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    if (out.length >= limit) break;
    const n = (p.name ?? '').trim();
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}
