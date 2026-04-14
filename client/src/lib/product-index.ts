/**
 * STORY-121: MiniSearch — Two-Stage Product Search (Inverted Index + LLM Rerank)
 *
 * Replaces the Levenshtein token-scoring in product-search.ts with a proper
 * BM25 inverted index (MiniSearch). This is Stage 1 of the two-stage pipeline:
 *   Stage 1 — MiniSearch (this file): fast recall over full catalog, <5ms per query
 *   Stage 2 — LLM rerank (catalog.selectProducts): semantic understanding
 */

import MiniSearch from 'minisearch';
import type { ProductItem } from './ad-templates';
import {
  buildSearchVocabulary,
  type SearchVocabulary,
  type SpaceCompound,
} from './catalog-search-vocabulary';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';

// ---------------------------------------------------------------------------
// Diacritics normalization (shared with agent-actions category matching)
// ---------------------------------------------------------------------------

const DIACRITICS_MAP: Record<string, string> = {
  č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd', ð: 'd', ß: 'ss',
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  ñ: 'n',
};

function stripDiacritics(s: string): string {
  return s.replace(/[^\u0000-\u007E]/g, (ch) => DIACRITICS_MAP[ch] ?? ch);
}

/** Lowercase + strip diacritics + trim. Use for string comparison. */
export function normalize(s: string): string {
  return stripDiacritics(s.toLowerCase()).trim();
}

/**
 * Quick string similarity 0–1 for category fuzzy matching in agent-actions.
 * Not BM25 — just token overlap for simple string comparison.
 */
export function calculateSimilarity(query: string, target: string): number {
  const nq = normalize(query);
  const nt = normalize(target);
  if (nq === nt) return 1;
  if (nt.includes(nq)) return 0.95;
  if (nq.includes(nt) && nt.length >= 3) return 0.85; // S-1: min 3 chars avoids false matches on "TV", "PC", "za"

  const qTokens = miniTokenize(query);
  const tTokens = miniTokenize(target);
  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  const matched = qTokens.filter((qt) =>
    tTokens.some((tt) => tt.includes(qt) || qt.includes(tt)),
  );
  return matched.length / Math.max(qTokens.length, tTokens.length);
}

// ---------------------------------------------------------------------------
// MiniSearch tokenizer
// ---------------------------------------------------------------------------

/** STORY-133: Known two-word compounds (query "play station" should match "PlayStation"). */
const SPACE_COMPOUNDS: [string, string, string][] = [
  ['play', 'station', 'playstation'],
  ['dual', 'shock', 'dualshock'],
  ['dual', 'sense', 'dualsense'],
];

/**
 * Custom tokenizer for MiniSearch:
 *   - strip diacritics (ž→z, č→c, etc.)
 *   - lowercase
 *   - treat dots as word separators so "v2.1" → ["v2","1"] (T-2)
 *   - treat joiners (- – _ /) as word separators so "USB-C" → ["usb","c"]
 *   - emit the joined form for hyphenated compounds: "USB-C" → also "usbc" (T-1)
 *   - STORY-133/134: emit space-joined compounds so "play station" → "playstation" (uses spaceCompounds list)
 *   - strip remaining special chars
 */
function miniTokenize(text: string, spaceCompounds: SpaceCompound[] = SPACE_COMPOUNDS): string[] {
  const base = stripDiacritics(text.toLowerCase())
    .replace(/[.]/g, ' ')     // T-2: dots as separators ("v2.1" → "v2 1")
    .replace(/[-–_/]/g, ' ')  // split hyphenated compounds ("USB-C" → "usb c")
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // T-1: also emit the joined (hyphen-collapsed) form for compound codes
  const withCompounds: string[] = [...base];
  const hyphenated = stripDiacritics(text.toLowerCase())
    .replace(/[^a-z0-9\s\-–_/]/g, '')
    .split(/\s+/)
    .filter((t) => /[-–_/]/.test(t));

  for (const compound of hyphenated) {
    const joined = compound.replace(/[-–_/]/g, '').replace(/[^a-z0-9]/g, '');
    if (joined.length > 1 && !withCompounds.includes(joined)) {
      withCompounds.push(joined);
    }
  }

  // STORY-133/134: space-joined compounds (catalog-driven or default list)
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i]!;
    const b = base[i + 1]!;
    for (const [t1, t2, joined] of spaceCompounds) {
      if (a === t1 && b === t2 && !withCompounds.includes(joined)) {
        withCompounds.push(joined);
        break;
      }
    }
  }

  return withCompounds;
}

/** STORY-133: Gaming/peripheral synonym group — expand query so any term matches products with any other. */
const GAMING_SYNONYMS = ['joystick', 'gamepad', 'kontroler', 'dzojstik', 'gejmpad'];

/**
 * Expand search query: STORY-133 fallback (gaming terms). Catalog synonym groups
 * are built but not used for expansion yet (too noisy for broad categories).
 */
function expandSearchQuery(query: string, _vocabulary?: SearchVocabulary): string {
  const base = normalizeSearchQueryForPipeline(query);
  if (!base) return '';
  const folded = stripDiacritics(base.toLowerCase());
  if (!folded) return base;
  const tokens = folded.split(/\s+/).filter(Boolean);
  const hasGaming = GAMING_SYNONYMS.some((s) =>
    tokens.some((t) => t === s || t.includes(s) || s.includes(t)),
  );
  if (!hasGaming) return base;
  const toAdd = GAMING_SYNONYMS.filter((s) => !tokens.includes(s)).join(' ');
  return toAdd ? `${base} ${toAdd}` : base;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ProductSearchIndex = MiniSearch<{ id: number } & ProductItem> & {
  vocabulary?: SearchVocabulary;
};

export interface QueryOptions {
  /** Max results to return. Default 100. */
  maxResults?: number;
  /** Minimum BM25 score (0–∞). Default 0 (all matches). */
  minScore?: number;
}

// ---------------------------------------------------------------------------
// Index builder
// ---------------------------------------------------------------------------

/**
 * Build an inverted BM25 index from a product list.
 * Call once when products load; rebuild when the list changes.
 * Indexed fields: name (boost 3), brand (boost 2), code (boost 1.5), category (boost 1).
 *
 * INVARIANT: the returned index is only valid for the exact array instance it was built from.
 * Indices returned by queryIndex() are positions in that same array. If the array is replaced
 * (e.g. new catalog upload), rebuild the index before querying and discard any previously
 * resolved indices — they now refer to positions in the old array.
 */
export function buildSearchIndex(products: ProductItem[]): ProductSearchIndex {
  const t0 = performance.now();
  const vocabulary = buildSearchVocabulary(products);
  const tokenize = (text: string) => miniTokenize(text, vocabulary.spaceCompounds);

  const index = new MiniSearch<{ id: number } & ProductItem>({
    fields: ['name', 'brand', 'code', 'category'],
    idField: 'id',
    tokenize,
    searchOptions: {
      boost: { name: 3, brand: 2, code: 1.5, category: 1 },
      fuzzy: (term) => {
        if (term.length >= 8) return 2;
        if (term.length >= 5) return 1;
        return 0;
      },
      prefix: true,
    },
  });

  index.addAll(products.map((p, i) => ({ id: i, ...p })));

  const out = index as ProductSearchIndex;
  out.vocabulary = vocabulary;

  const elapsed = performance.now() - t0;
  console.info(`[ProductIndex] built index: ${products.length} products in ${elapsed.toFixed(1)}ms`);
  if (elapsed > 200) {
    console.warn(`[ProductIndex] index build exceeded 200ms threshold (${elapsed.toFixed(1)}ms)`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Query runner
// ---------------------------------------------------------------------------

/**
 * Query the index and return matching product indices sorted by relevance (best first).
 * Returns `Array<{ index: number; score: number }>` where `index` is the original
 * position in the products array passed to `buildSearchIndex`.
 */
export function queryIndex(
  index: ProductSearchIndex,
  query: string,
  options: QueryOptions = {},
): Array<{ index: number; score: number }> {
  const { maxResults = 100, minScore = 0 } = options;
  const qNorm = normalizeSearchQueryForPipeline(query);
  if (!qNorm) return [];

  const vocabulary = index.vocabulary;
  const expandedQuery = expandSearchQuery(qNorm, vocabulary);
  const t0 = performance.now();
  const results = index.search(expandedQuery);
  const elapsed = performance.now() - t0;

  if (elapsed > 10) {
    console.warn(`[ProductIndex] slow query (${elapsed.toFixed(1)}ms): "${qNorm}"`);
  }

  return results
    .filter((r) => r.score >= minScore)
    .slice(0, maxResults)
    .map((r) => ({ index: r.id as number, score: r.score }));
}

function normalizeForSubstring(s: string): string {
  return normalize(s).replace(/[-–_]/g, '');
}

/**
 * When MiniSearch returns no hits (or caller will apply a strict minScore), substring
 * fallback on name / code / brand — same contract as `agent-actions` nameToIndices.
 */
export function substringMatchProductIndices(products: ProductItem[], query: string): number[] {
  const nq = normalizeSearchQueryForPipeline(query);
  if (!nq) return products.map((_, i) => i);
  const norm = normalizeForSubstring(nq);
  return products
    .map((_, i) => i)
    .filter((i) => {
      const prod = products[i]!;
      const match = (field: string) => {
        const fn = normalizeForSubstring(field);
        return fn.includes(norm) || (norm.includes(fn) && fn.length >= 2);
      };
      return match(prod.name ?? '') || match(prod.code ?? '') || match(prod.brand ?? '');
    });
}

/**
 * Manual catalog UI (Add Products, Products tab): apply `minScore` from workspace settings,
 * then if BM25 yields nothing at that threshold, retry with `minScore: 0`, then substring
 * fallback. Prevents “0 results” when sliders are strict but text still matches products.
 */
export function queryProductIndicesWithManualFallback(
  index: ProductSearchIndex,
  products: ProductItem[],
  query: string,
  minScore: number,
): number[] {
  const q = normalizeSearchQueryForPipeline(query);
  if (!q) return products.map((_, i) => i);

  const strict = queryIndex(index, q, { maxResults: products.length, minScore });
  if (strict.length > 0) {
    return strict.map((h) => h.index);
  }

  const loose = queryIndex(index, q, { maxResults: products.length, minScore: 0 });
  if (loose.length > 0) {
    return loose.map((h) => h.index);
  }

  return substringMatchProductIndices(products, q);
}
