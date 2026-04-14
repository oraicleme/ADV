/**
 * STORY-134: Catalog-driven search vocabulary.
 *
 * Builds search rules (space-compounds, synonym groups) from the product catalog
 * so that search adapts to the actual data instead of hardcoded term lists.
 * Used by product-index for tokenization and query expansion.
 * Uses local normalize to avoid circular dependency with product-index.
 */

import type { ProductItem } from './ad-templates';

const DIACRITICS_MAP: Record<string, string> = {
  č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd', ð: 'd', ß: 'ss',
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y', ñ: 'n',
};

function normalize(s: string): string {
  return s
    .replace(/[^\u0000-\u007E]/g, (ch) => DIACRITICS_MAP[ch] ?? ch)
    .toLowerCase()
    .trim();
}

/** One compound: when user types "word1 word2", also match token "joined". */
export type SpaceCompound = [word1: string, word2: string, joined: string];

/** Synonym group: when query contains any term, expand with all terms in the group. */
export type SynonymGroup = string[];

export interface SearchVocabulary {
  /** Space-separated compounds relevant to this catalog (joined form appears in catalog). */
  spaceCompounds: SpaceCompound[];
  /** Per-category term sets for query expansion. */
  synonymGroups: SynonymGroup[];
}

/** Base list of known compounds; only those whose joined form appears in catalog are used. */
const BASE_SPACE_COMPOUNDS: SpaceCompound[] = [
  ['play', 'station', 'playstation'],
  ['dual', 'shock', 'dualshock'],
  ['dual', 'sense', 'dualsense'],
];

const MIN_TOKEN_LENGTH = 3;
const MAX_SYNONYMS_PER_GROUP = 15;

/**
 * Tokenize text the same way as product-index base tokens (lowercase, no diacritics, split on non-alphanumeric).
 */
function getTokens(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const n = normalize(text);
  return n.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Collect all normalized tokens from catalog (name, brand, code, category).
 */
function extractCatalogTokens(products: ProductItem[]): Set<string> {
  const set = new Set<string>();
  for (const p of products) {
    for (const field of [p.name, p.brand, p.code, p.category] as (string | undefined)[]) {
      if (field) getTokens(field).forEach((t) => set.add(t));
    }
  }
  return set;
}

/**
 * Build space-compounds for this catalog: only compounds whose joined form appears in catalog tokens.
 */
function getSpaceCompoundsForCatalog(catalogTokens: Set<string>): SpaceCompound[] {
  return BASE_SPACE_COMPOUNDS.filter(([, , joined]) => catalogTokens.has(joined));
}

/**
 * Build synonym groups from catalog: per category, collect significant tokens from name and brand.
 * Only categories with at least 2 distinct tokens (length >= MIN_TOKEN_LENGTH) produce a group.
 */
function getSynonymGroupsFromCatalog(products: ProductItem[]): SynonymGroup[] {
  const byCategory = new Map<string, Set<string>>();

  for (const p of products) {
    const cat = (p.category && normalize(p.category.trim())) || '';
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, new Set());
    const tokens = byCategory.get(cat)!;
    for (const field of [p.name, p.brand] as (string | undefined)[]) {
      if (field) {
        getTokens(field).forEach((t) => {
          if (t.length >= MIN_TOKEN_LENGTH) tokens.add(t);
        });
      }
    }
  }

  const groups: SynonymGroup[] = [];
  for (const set of byCategory.values()) {
    if (set.size < 2) continue;
    const arr = Array.from(set).slice(0, MAX_SYNONYMS_PER_GROUP);
    groups.push(arr);
  }
  return groups;
}

/**
 * Build search vocabulary from the current product catalog.
 * Used when building the search index so tokenizer and query expansion match the data.
 */
export function buildSearchVocabulary(products: ProductItem[]): SearchVocabulary {
  const catalogTokens = extractCatalogTokens(products);
  const spaceCompounds = getSpaceCompoundsForCatalog(catalogTokens);
  const synonymGroups = getSynonymGroupsFromCatalog(products);
  return { spaceCompounds, synonymGroups };
}

/**
 * Expand a search query with synonym groups: if the query contains any term from a group, add the rest.
 */
export function expandQueryWithSynonyms(query: string, synonymGroups: SynonymGroup[]): string {
  const normalized = normalize(query.trim());
  if (!normalized) return query;
  const queryTokens = new Set(normalized.split(/\s+/).filter(Boolean));
  const toAdd = new Set<string>();

  for (const group of synonymGroups) {
    const hasAny = group.some((term) =>
      Array.from(queryTokens).some((qt) => qt === term || qt.includes(term) || term.includes(qt)),
    );
    if (hasAny) {
      for (const term of group) {
        if (!queryTokens.has(term)) toAdd.add(term);
      }
    }
  }

  if (toAdd.size === 0) return query;
  return `${query} ${Array.from(toAdd).join(' ')}`;
}
