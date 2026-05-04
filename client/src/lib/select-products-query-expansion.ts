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

const MAX_QUERIES = 8;

/**
 * STORY-210: Retail domain synonym groups for Balkan market.
 * When a query contains any term from a group, additional sub-queries are generated
 * with the synonym variants so Meilisearch BM25 can match regardless of catalog spelling.
 * Each group is a set of ASCII-folded terms that mean the same thing.
 */
const RETAIL_SYNONYM_GROUPS: string[][] = [
  // cables
  ['kabal', 'kabel', 'cable', 'kab'],
  // chargers
  ['punjac', 'charger', 'punjach'],
  // phone cases
  ['futrola', 'maska', 'case', 'cover', 'oklop', 'armor'],
  // headphones
  ['slusalice', 'earphones', 'headphones', 'handsfree', 'earbuds'],
  // screen protectors
  ['zastita', 'zastitno', 'tempered', 'protector', 'zastitna'],
  // batteries
  ['baterija', 'battery', 'akumulator'],
  // holders / mounts
  ['drzac', 'holder', 'mount', 'stalak', 'stand'],
  // adapters
  ['adapter', 'adaptor', 'pretvarac', 'konverter', 'converter'],
  // speakers
  ['zvucnik', 'speaker', 'bluetooth'],
  // power banks
  ['powerbank', 'power bank', 'eksterna baterija', 'prijenosna baterija'],
  // keyboards / mice
  ['tastatura', 'keyboard', 'tipkovnica'],
  ['mis', 'mouse', 'mish'],
  // tablets
  ['tablet', 'tab'],
  // watches
  ['sat', 'watch', 'smartwatch', 'pametni sat'],
];

/**
 * Given a folded query, find all synonym groups that match any token,
 * and return the additional variant terms not already in the query.
 */
function getSynonymExpansions(foldedQuery: string): string[] {
  const tokens = foldedQuery
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  const expansions: string[] = [];
  for (const group of RETAIL_SYNONYM_GROUPS) {
    const matched = group.some((syn) =>
      tokens.some((t) => t === syn || t.includes(syn) || syn.includes(t)),
    );
    if (matched) {
      for (const syn of group) {
        if (!tokens.includes(syn) && !foldedQuery.includes(syn)) {
          expansions.push(syn);
        }
      }
    }
  }
  return expansions;
}

/**
 * Build alternate search strings: original, ASCII-folded (if different), synonym-expanded,
 * and 1–2 shorter token-group queries from the longest remaining tokens.
 * STORY-210: Now includes retail domain synonym expansion for Balkan market.
 */
export function buildExpandedSearchQueries(raw: string): string[] {
  const q = normalizeSearchQueryForPipeline(raw);
  if (!q) return [];

  const out: string[] = [q];
  const lower = q.toLowerCase();
  const folded = stripDiacritics(lower);
  if (folded !== lower) out.push(folded);

  // STORY-210: Synonym expansion — generate additional sub-queries with variant terms
  const synonyms = getSynonymExpansions(folded);
  if (synonyms.length > 0) {
    // Add the original query augmented with all synonyms (single broad query)
    out.push(`${folded} ${synonyms.join(' ')}`);
    // Also add individual synonym terms paired with non-synonym tokens for precision
    const coreTokens = folded
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOP.has(t))
      .filter((t) => !RETAIL_SYNONYM_GROUPS.some((g) => g.includes(t)));
    if (coreTokens.length > 0) {
      for (const syn of synonyms.slice(0, 3)) {
        out.push(`${coreTokens.join(' ')} ${syn}`);
      }
    }
  }

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
