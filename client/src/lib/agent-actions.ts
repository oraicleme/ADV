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
 * STORY-69: Filters the full product catalog and updates selectedProductIndices.
 * Applied client-side — AI returns filter criteria, client does the matching.
 */
export interface CatalogFilterPayload {
  /** Case-insensitive substring to match against product name + code + brand. Empty = match all. */
  nameContains?: string;
  /** Exact category name from catalogSummary.categories. Empty or omitted = all categories. */
  category?: string;
  /** Max products to select (0 = all matching). Default: 0. */
  maxSelect?: number;
  /** If true (default), deselect all non-matching products first. */
  deselectOthers?: boolean;
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
          if (!setters.allProducts || !setters.setSelectedProductIndices) break;
          const p = action.payload as Partial<CatalogFilterPayload>;
          const nameQ = (p?.nameContains ?? '').toLowerCase().trim();
          const catQ = (p?.category ?? '').trim();
          const maxSelect = typeof p?.maxSelect === 'number' ? p.maxSelect : 0;

          const matched: number[] = [];
          for (let i = 0; i < setters.allProducts.length; i++) {
            const prod = setters.allProducts[i];
            const haystack = [prod.name, prod.code ?? '', prod.brand ?? '']
              .join(' ')
              .toLowerCase();
            const nameMatch = !nameQ || haystack.includes(nameQ);
            const catMatch = !catQ || prod.category === catQ;
            if (nameMatch && catMatch) matched.push(i);
          }

          const limited = maxSelect > 0 ? matched.slice(0, maxSelect) : matched;
          setters.setSelectedProductIndices(() => new Set(limited));
          break;
        }
      }
    } catch {
      // Silently skip — never let an action crash the UI
    }
  }
}
