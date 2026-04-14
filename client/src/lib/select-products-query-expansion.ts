/**
 * STORY-162: Multi-query expansion for Meilisearch Stage-1 of catalog_filter.
 * Improves recall when a single query vector/BM25 blend ranks wrong SKUs first or
 * misses diacritic / phrasing variants (any catalog, any language using Latin script).
 * STORY-197: Input passes through `normalizeSearchQueryForPipeline` (same as MiniSearch path).
 */

import { normalizeSearchQueryForPipeline } from './normalize-search-query';

export interface MeiliHit {
  index: number;
  score: number;
}

const DIACRITICS_MAP: Record<string, string> = {
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'd',
  ð: 'd',
  ß: 'ss',
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ý: 'y',
  ÿ: 'y',
  ñ: 'n',
};

function stripDiacritics(s: string): string {
  return s.replace(/[^\u0000-\u007E]/g, (ch) => DIACRITICS_MAP[ch] ?? ch);
}

/** Short function words — EN + common BCS/Serbo-Croatian particles (not product-specific). */
const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'has',
  'are',
  'not',
  'all',
  'any',
  'za',
  'i',
  'na',
  'od',
  'po',
  'u',
  'da',
  'je',
  'li',
  'su',
  'se',
  'koji',
  'koja',
  'koje',
  'kao',
  'pri',
  'ali',
  'jos',
  'još',
  'bez',
  'sa',
  'pre',
]);

const MAX_QUERIES = 5;

/**
 * Build alternate search strings: original, ASCII-folded (if different), and 1–2 shorter
 * token-group queries from the longest remaining tokens (helps “gume + trotinet” paths).
 */
export function buildExpandedSearchQueries(raw: string): string[] {
  const q = normalizeSearchQueryForPipeline(raw);
  if (!q) return [];

  const out: string[] = [q];
  const lower = q.toLowerCase();
  const folded = stripDiacritics(lower);
  if (folded !== lower) out.push(folded);

  const tokens = folded
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

  if (tokens.length >= 2) {
    const byLen = [...tokens].sort((a, b) => b.length - a.length);
    out.push(byLen.slice(0, 2).join(' '));
    if (byLen.length >= 3) out.push(byLen.slice(0, 3).join(' '));
  }

  return [...new Set(out.map((s) => s.trim()).filter(Boolean))].slice(0, MAX_QUERIES);
}

/** Merge several hit lists; same index keeps the maximum score (RRF-like without rank positions). */
export function mergeSearchHitsByMaxScore(
  hitLists: MeiliHit[][],
  maxResults: number,
): MeiliHit[] {
  const best = new Map<number, number>();
  for (const hits of hitLists) {
    for (const h of hits) {
      const prev = best.get(h.index) ?? 0;
      if (h.score > prev) best.set(h.index, h.score);
    }
  }
  return [...best.entries()]
    .map(([index, score]) => ({ index, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
