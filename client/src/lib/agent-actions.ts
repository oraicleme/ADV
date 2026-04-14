/**
 * STORY-62: AI Agent Chat — Extended Action Types (Phase 1)
 *
 * Defines AgentAction union types for all canvas modifications beyond BlockPatch:
 * layout changes, format changes, style changes, product select/deselect, and element reorder.
 * Provides applyAgentActions() to safely apply any mix of action types to canvas state.
 */

import type { AdElementKey, ProductItem } from './ad-constants';
import type { LayoutId, StyleOptions } from './ad-layouts/types';
import { filterValidPatches, applyPatches, type CanvasSetters } from './ad-canvas-ai';
import type { BlockPatch } from './ad-block-schema';
import { buildSearchIndex, queryIndex, calculateSimilarity, normalize } from './product-index';

// ------- Action types -------

export type AgentActionType =
  | 'block_patch'
  | 'layout_change'
  | 'format_change'
  | 'style_change'
  | 'product_action'
  | 'element_reorder'
  | 'catalog_filter';

export interface AgentAction {
  type: AgentActionType;
  payload: unknown;
}

export interface LayoutChangePayload {
  layout: LayoutId;
}

export interface FormatChangePayload {
  /** Format preset id or short alias (e.g. 'story', 'post', 'landscape'). */
  format: string;
}

export interface StyleChangePayload {
  backgroundColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface ProductActionPayload {
  action: 'select' | 'deselect' | 'reorder';
  /** Product indices to act upon. */
  indices: number[];
}

export interface ElementReorderPayload {
  order: AdElementKey[];
}

/**
 * STORY-69 / STORY-119: Filters the full product catalog and updates selectedProductIndices.
 *
 * Two execution paths:
 *  1. STORY-119 async path (preferred): `query` field present → AgentChat resolves via
 *     catalog.selectProducts before calling applyAgentActions; result arrives as `resolvedIndices`.
 *  2. Legacy sync path: `nameContains` + `category` → client-side fuzzy matching (kept for
 *     backward compat and sidebar AI search).
 */
export interface CatalogFilterPayload {
  // --- STORY-119: AI-driven query path ---
  /** Natural-language description of what the user wants. AgentChat resolves this server-side. */
  query?: string;
  /** Rough pre-filter: exact category names from catalogSummary (client-side pre-selection before server call). */
  hintCategories?: string[];
  /** Pre-resolved product indices returned by catalog.selectProducts — set by AgentChat, not by LLM. */
  resolvedIndices?: number[];

  // --- Legacy sync path (backward compat) ---
  /** Case-insensitive fuzzy match on product name + code + brand. Empty = match all. */
  nameContains?: string;
  /** Category: exact name from catalogSummary.categories. Empty = all categories. */
  category?: string;
  /** Alias for category when model returns categoryContains; same meaning, both accepted. */
  categoryContains?: string;

  // --- Shared ---
  /** Max products to select (0 = all matching). Default: 0. */
  maxSelect?: number;
  /** If true (default), deselect all non-matching products first. */
  deselectOthers?: boolean;
}

/**
 * STORY-194: Human-readable filter text from agent `catalog_filter` actions **before** async resolve
 * (resolved payloads often drop `query`). Uses the last non-empty `query` or `nameContains` in order.
 */
export function extractLastCatalogFilterQueryText(actions: AgentAction[]): string {
  let last = '';
  for (const a of actions) {
    if (a.type !== 'catalog_filter') continue;
    const p = a.payload as Partial<CatalogFilterPayload>;
    const t = (p.query ?? p.nameContains ?? '').trim();
    if (t) last = t;
  }
  return last;
}

// ------- Extended setters -------

/** All canvas setters needed by the conversational AI agent (extends existing CanvasSetters). */
export interface ExtendedCanvasSetters extends CanvasSetters {
  setLayout: (v: LayoutId) => void;
  /** Functional update for style — receives previous StyleOptions, returns new one. */
  setStyle: (updater: (prev: StyleOptions) => StyleOptions) => void;
  setElementOrder: (order: AdElementKey[]) => void;
  /** Receives a resolved preset id (e.g. 'viber-story'). */
  setFormat?: (id: string) => void;
  /** Functional update for selected product indices. */
  setSelectedProductIndices?: (updater: (prev: Set<number>) => Set<number>) => void;
  /** STORY-69: Full product list for catalog_filter operations. */
  allProducts?: ProductItem[];
  /** STORY-121: Pre-built MiniSearch index for fast name matching (optional, falls back to substring). */
  searchIndex?: import('./product-index').ProductSearchIndex | null;
}

// ------- Validators / helpers -------

const VALID_LAYOUT_IDS = new Set<string>([
  'multi-grid',
  'single-hero',
  'category-group',
  'sale-discount',
]);

const VALID_ELEMENT_KEYS = new Set<string>([
  'headline',
  'products',
  'badge',
  'cta',
  'disclaimer',
]);

/** Maps user-friendly format aliases to canonical preset ids. */
const FORMAT_ALIAS_MAP: Record<string, string> = {
  story: 'viber-story',
  'viber-story': 'viber-story',
  viber: 'viber-story',
  'ig-story': 'viber-story',
  'instagram-story': 'viber-story',
  post: 'instagram-square',
  square: 'instagram-square',
  instagram: 'instagram-square',
  'instagram-post': 'instagram-square',
  'instagram-square': 'instagram-square',
  landscape: 'facebook-landscape',
  facebook: 'facebook-landscape',
  'facebook-ad': 'facebook-landscape',
  'facebook-landscape': 'facebook-landscape',
};

/** Maps short font aliases to full CSS font-family strings. */
const FONT_ALIAS_MAP: Record<string, string> = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'system-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'sans-serif': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  georgia: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
  monospace: "'Courier New', Courier, monospace",
  courier: "'Courier New', Courier, monospace",
  impact: "Impact, 'Arial Black', sans-serif",
  bold: "Impact, 'Arial Black', sans-serif",
  'impact-bold': "Impact, 'Arial Black', sans-serif",
  verdana: 'Verdana, Geneva, sans-serif',
  clean: 'Verdana, Geneva, sans-serif',
};

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);
}

export function resolveFormatId(input: string): string {
  return FORMAT_ALIAS_MAP[input.toLowerCase().trim()] ?? input;
}

export function resolveFontFamily(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const alias = FONT_ALIAS_MAP[lower];
  if (alias) return alias;
  // Accept any CSS-looking font-family string
  if (input.length >= 5 && (input.includes(',') || /serif|sans|mono/i.test(input))) {
    return input;
  }
  return null;
}

/**
 * Applies a list of AgentActions to the canvas state via the provided setters.
 * Invalid or malformed actions are silently skipped — the UI never crashes.
 */
export function applyAgentActions(
  actions: AgentAction[],
  setters: ExtendedCanvasSetters,
): void {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'block_patch': {
          const raw = action.payload as BlockPatch | BlockPatch[];
          const patches = Array.isArray(raw) ? raw : [raw];
          const valid = filterValidPatches(patches);
          applyPatches(valid, setters);
          break;
        }

        case 'layout_change': {
          const p = action.payload as Partial<LayoutChangePayload>;
          if (p?.layout && VALID_LAYOUT_IDS.has(p.layout)) {
            setters.setLayout(p.layout as LayoutId);
          }
          break;
        }

        case 'format_change': {
          const p = action.payload as Partial<FormatChangePayload>;
          if (p?.format && setters.setFormat) {
            setters.setFormat(resolveFormatId(String(p.format)));
          }
          break;
        }

        case 'style_change': {
          const p = action.payload as Partial<StyleChangePayload>;
          if (!p) break;
          setters.setStyle((prev) => {
            const next = { ...prev };
            if (isHexColor(p.backgroundColor)) next.backgroundColor = p.backgroundColor;
            if (isHexColor(p.accentColor)) next.accentColor = p.accentColor;
            if (typeof p.fontFamily === 'string') {
              const resolved = resolveFontFamily(p.fontFamily);
              if (resolved) next.fontFamily = resolved;
            }
            return next;
          });
          break;
        }

        case 'product_action': {
          const p = action.payload as Partial<ProductActionPayload>;
          if (!p || !setters.setSelectedProductIndices) break;
          if (!Array.isArray(p.indices)) break;
          const indices = p.indices.filter(
            (i): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0,
          );
          if (p.action === 'select') {
            setters.setSelectedProductIndices((prev) => {
              const next = new Set(prev);
              for (const i of indices) next.add(i);
              return next;
            });
          } else if (p.action === 'deselect') {
            setters.setSelectedProductIndices((prev) => {
              const next = new Set(prev);
              for (const i of indices) next.delete(i);
              return next;
            });
          } else if (p.action === 'reorder') {
            setters.setSelectedProductIndices(() => new Set(indices));
          }
          break;
        }

        case 'element_reorder': {
          const p = action.payload as Partial<ElementReorderPayload>;
          if (!p?.order || !Array.isArray(p.order)) break;
          const order = p.order.filter((k): k is AdElementKey =>
            VALID_ELEMENT_KEYS.has(k as string),
          );
          if (order.length > 0) {
            setters.setElementOrder(order);
          }
          break;
        }

        case 'catalog_filter': {
          const p = action.payload as Partial<CatalogFilterPayload> & { _debugReason?: string };

          // STORY-119: pre-resolved path — AgentChat called catalog.selectProducts before
          // applyAgentActions; indices are already known, no string matching needed.
          if (p?.resolvedIndices && setters.setSelectedProductIndices) {
            let resolved = p.resolvedIndices.filter(
              (i): i is number =>
                typeof i === 'number' &&
                Number.isInteger(i) &&
                i >= 0 &&
                // AA-1: upper-bound guard — rejects hallucinated out-of-range indices.
                // Fallback to Infinity (not 0) when allProducts is unavailable because
                // the resolvedIndices path intentionally works without allProducts present
                // (see test: "resolvedIndices path works without allProducts setter").
                i < (setters.allProducts?.length ?? Infinity),
            );
            const maxResolved = typeof p.maxSelect === 'number' && p.maxSelect > 0 ? p.maxSelect : 0;
            if (maxResolved > 0) resolved = resolved.slice(0, maxResolved);
            setters.setSelectedProductIndices(() => new Set(resolved));
            break;
          }

          // When AgentChat annotated "no match" (MiniSearch 0 candidates or LLM 0 results),
          // do NOT run legacy path — it would treat empty nameContains as "all products".
          // Clear selection so the user sees 0 products and the chat shows _debugReason.
          if (p?._debugReason && setters.setSelectedProductIndices) {
            setters.setSelectedProductIndices(() => new Set());
            break;
          }

          if (!setters.allProducts || !setters.setSelectedProductIndices) break;
          // Legacy path: agent sends query/hintCategories; use them when nameContains/category missing.
          const nameQ = (p?.nameContains ?? p?.query ?? '').trim();
          const catQ = normalize(
            (p?.category ?? p?.categoryContains ?? p?.hintCategories?.[0] ?? '').trim(),
          );
          const maxSelect = typeof p?.maxSelect === 'number' ? p.maxSelect : 0;
          const hasFilter = nameQ.length > 0 || catQ.length > 0;

          // STORY-163: Malformed or empty legacy catalog_filter (no name/query, no category, maxSelect=0)
          // used to run nameToIndices('') → all indices → entire catalog selected. That breaks
          // second-turn flows and "second ad" when the agent omits query fields. Safe default: no-op.
          if (!hasFilter && maxSelect === 0) {
            break;
          }

          const allProducts = setters.allProducts;

          const normalizeForSubstring = (s: string): string =>
            normalize(s).replace(/[-–_]/g, '');

          function nameToIndices(nameQuery: string): number[] {
            if (!nameQuery.trim()) return allProducts.map((_, i) => i);
            const nq = nameQuery.trim();

            // Use pre-built MiniSearch index when available (STORY-121)
            const idx = setters.searchIndex ?? buildSearchIndex(allProducts);
            const hits = queryIndex(idx, nq, { maxResults: allProducts.length });
            if (hits.length > 0) return hits.map((h) => h.index);

            // Substring fallback when MiniSearch returns nothing
            const norm = normalizeForSubstring(nq);
            return allProducts.map((_, i) => i).filter((i) => {
              const prod = allProducts[i];
              const match = (field: string) => {
                const fn = normalizeForSubstring(field);
                return fn.includes(norm) || (norm.includes(fn) && fn.length >= 2);
              };
              return match(prod.name ?? '') || match(prod.code ?? '') || match(prod.brand ?? '');
            });
          }

          function applyCategoryFilter(indices: number[]): number[] {
            if (catQ.length === 0) return indices;
            const exact = indices.filter((i) => {
              const c = normalize(allProducts[i].category ?? '');
              return c === catQ;
            });
            if (exact.length > 0) return exact;
            const fuzzy = indices.filter((i) => {
              const c = normalize(allProducts[i].category ?? '');
              return c.includes(catQ) || catQ.includes(c) || calculateSimilarity(catQ, c) >= 0.65; // AA-2: raised from 0.5
            });
            // Universal: when category was specified but no match, return none (don't fall back to name-only)
            if (fuzzy.length === 0) {
              // AA-3: log the failing category so debugging is easier
              console.debug(`[AgentActions] applyCategoryFilter: no products matched category "${catQ}" — 0 results`);
            }
            return fuzzy.length > 0 ? fuzzy : [];
          }

          const byName = nameToIndices(nameQ);

          // Vocabulary-mismatch resilience: if nameContains was specified but matched nothing
          // (e.g. user says "USB-C" but catalog uses "Type-C"), fall back to ALL products
          // before applying category filter. This ensures the user gets at minimum the
          // requested category instead of 0 results. Category-only requests still work
          // as before (nameQ is empty → byName = all products from the start).
          const byNameForCategory =
            nameQ.length > 0 && byName.length === 0 && catQ.length > 0
              ? allProducts.map((_, i) => i)
              : byName;

          let limited = applyCategoryFilter(byNameForCategory);

          // Cap legacy path so we never select 999+ (e.g. "futrola" matching all cases).
          // Server-side selectProducts is the right path for precise intent (e.g. "iPhone 15 futrole" only).
          const LEGACY_MAX_SELECT = 500;
          if (limited.length > LEGACY_MAX_SELECT && maxSelect === 0) {
            limited = limited.slice(0, LEGACY_MAX_SELECT);
          }
          // Single universal path: no product-specific fallbacks
          limited = maxSelect > 0 ? limited.slice(0, maxSelect) : limited;

          if (limited.length > 0 || hasFilter) {
            setters.setSelectedProductIndices(() => new Set(limited));
          } else {
            // STORY-163: Do not fall back to "select entire catalog" — that was reachable only
            // in edge cases and matched the 6213-select bug; keep selection unchanged.
            break;
          }
          break;
        }
      }
    } catch {
      // Silently skip — never let an action crash the UI
    }
  }
}
