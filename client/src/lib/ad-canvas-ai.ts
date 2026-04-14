/**
 * STORY-58: AI Vision "Edit with Prompt"
 *
 * Serializes canvas state to structured JSON, calls the io.net vision model,
 * parses BlockPatch[] from the response, validates each patch through ad-block-schema,
 * and returns only safe, applicable patches.
 */

import type { ProductBlockOptions } from './ad-constants';
import type { AdElementKey } from './ad-constants';
import type { LayoutId, StyleOptions } from './ad-layouts/types';
import {
  validateBlockChange,
  coerceValue,
  type BlockType,
  type BlockPatch,
} from './ad-block-schema';
import type { ProductImageAnalysis } from './product-vision-analyzer';

/** Data quality signals computed from templateProducts — gives the AI data-aware context. */
export interface DataQuality {
  /** Any product name is majority-uppercase (e.g. "SUMMER SALE", "PROD_123") */
  hasAllCapsNames: boolean;
  /** Any product has no price and no retailPrice */
  hasMissingPrices: boolean;
  /** Any product has originalPrice set — enables sale/strikethrough layout */
  hasOriginalPrices: boolean;
  /** Any product has discountPercent > 0 */
  hasDiscounts: boolean;
  /** Average description character length across products (0 = no descriptions) */
  avgDescriptionLength: number;
  /** Vision model analysis of product images. null if no images or analysis failed. */
  imageAnalysis: ProductImageAnalysis | null;
}

/**
 * STORY-69: Summary of the full product catalog — sent to the AI on every message.
 * Allows the agent to answer catalog queries (filter by name/category) without
 * receiving all product names (would be too many tokens for large catalogs).
 */
export interface CatalogSummary {
  /** Total number of products loaded (e.g. 6213). */
  totalProducts: number;
  /** Number currently selected for the ad. */
  selectedCount: number;
  /** All categories present, sorted by count descending. Use EXACT names for catalog_filter. */
  categories: Array<{ name: string; count: number }>;
  /**
   * Sample product names — kept optional for backward compat with sidebar interpretProductSearch.
   * Not sent to the main agent chat (STORY-119: agent uses query+hintCategories instead).
   */
  sampleNames?: string[];
}

/** Snapshot of the canvas editor state passed to the AI. */
export interface AdCanvasState {
  headline: string;
  titleFontSize: number;
  emojiOrIcon: string;
  badgeText: string;
  ctaButtons: string[];
  disclaimerText: string;
  elementOrder: AdElementKey[];
  layout: LayoutId;
  style: StyleOptions;
  logoHeight: number;
  logoAlignment: 'left' | 'center' | 'right';
  logoCompanion: 'none' | 'headline' | 'badge' | 'emoji';
  productBlockOptions: ProductBlockOptions;
  productCount: number;
  format: { id: string; width: number; height: number };
  dataQuality: DataQuality;
  /** STORY-69: Full catalog metadata for product search/filter queries. */
  catalogSummary: CatalogSummary;
}

/** Serialized canvas state for the AI prompt. */
export interface AdCanvasStateJSON {
  blocks: {
    headline: { text: string; fontSize: number; emojiOrIcon: string };
    products: {
      columns: number;
      maxProducts: number;
      imageHeight: number;
      showFields: ProductBlockOptions['showFields'];
    };
    badge: { text: string };
    cta: { buttons: string[] };
    disclaimer: { text: string };
    logo: { height: number; alignment: string; companion: string };
  };
  meta: {
    layout: LayoutId;
    format: { id: string; width: number; height: number };
    elementOrder: AdElementKey[];
    accentColor: string;
    backgroundColor: string;
    productCount: number;
    dataQuality: DataQuality;
    /** STORY-69: Catalog metadata for product search queries. */
    catalogSummary: CatalogSummary;
  };
}

/** Serializes current canvas state to a structured JSON the AI can reason about. */
export function serializeCanvasState(state: AdCanvasState): AdCanvasStateJSON {
  return {
    blocks: {
      headline: {
        text: state.headline,
        fontSize: state.titleFontSize,
        emojiOrIcon: state.emojiOrIcon,
      },
      products: {
        columns: state.productBlockOptions.columns,
        maxProducts: state.productBlockOptions.maxProducts,
        imageHeight: state.productBlockOptions.imageHeight,
        showFields: state.productBlockOptions.showFields,
      },
      badge: { text: state.badgeText },
      cta: { buttons: state.ctaButtons.filter((b) => b.trim()) },
      disclaimer: { text: state.disclaimerText },
      logo: {
        height: state.logoHeight,
        alignment: state.logoAlignment,
        companion: state.logoCompanion,
      },
    },
    meta: {
      layout: state.layout,
      format: { id: state.format.id, width: state.format.width, height: state.format.height },
      elementOrder: state.elementOrder,
      accentColor: state.style.accentColor,
      backgroundColor: state.style.backgroundColor,
      productCount: state.productCount,
      dataQuality: state.dataQuality,
      catalogSummary: state.catalogSummary,
    },
  };
}

const SYSTEM_PROMPT = `You modify retail ad canvas properties. Output ONLY a JSON array. No explanation. No markdown. No code fences.

EXAMPLE — user says "make headline bigger":
[{"blockType":"headline","property":"fontSize","value":48}]

EXAMPLE — user says "show product codes":
[{"blockType":"products","property":"showFields.code","value":true}]

EXAMPLE — user says "change badge to SALE and make logo bigger":
[{"blockType":"badge","property":"text","value":"SALE"},{"blockType":"logo","property":"height","value":80}]

VALID blockTypes and properties:
headline: text(string≤200), fontSize(int 16-72), emojiOrIcon(string≤4)
products: columns(int 0-4), maxProducts(int 0-100), imageHeight(int 40-300), showFields.image(bool), showFields.code(bool), showFields.name(bool), showFields.description(bool), showFields.originalPrice(bool), showFields.price(bool), showFields.discountBadge(bool), showFields.brandLogo(bool)
badge: text(string≤60)
cta: buttons(string, pipe-separated, ≤320 chars)
disclaimer: text(string≤300)
logo: height(int 24-160), alignment(left|center|right), companion(none|headline|badge|emoji)

RULES: Only change what the user asks. Never invent properties. If impossible, output: []
OUTPUT: Raw JSON array only. First character must be [. Last character must be ].`;

/** Builds the full prompt for the AI edit-with-prompt feature. */
export function buildCanvasEditPrompt(state: AdCanvasState, userPrompt: string): string {
  const stateJson = serializeCanvasState(state);
  return `Current canvas state:\n${JSON.stringify(stateJson, null, 2)}\n\nUser instruction: "${userPrompt}"`;
}

/** Parses the AI response into typed BlockPatch[] (ignoring malformed or hallucinated entries). */
export function parsePatchResponse(raw: string): BlockPatch[] {
  if (!raw.trim()) return [];

  const stripped = raw.trim();

  // Strategy 1: extract JSON array from response (handles markdown fences, surrounding prose)
  const jsonMatch = stripped.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    const result = tryParseArray(jsonMatch[0]);
    if (result.length > 0) return result;
  }

  // Strategy 1b: truncated array — starts with [ but no closing ]
  if (!jsonMatch) {
    const bracketStart = stripped.indexOf('[');
    if (bracketStart !== -1) {
      const result = tryParseArray(stripped.slice(bracketStart));
      if (result.length > 0) return result;
    }
  }

  // Strategy 2: the model wrapped the array in an object like { "patches": [...] }
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]) as Record<string, unknown>;
      const arr = obj.patches ?? obj.changes ?? obj.result ?? obj.data;
      if (Array.isArray(arr)) {
        const result = extractPatches(arr);
        if (result.length > 0) return result;
      }
    } catch { /* continue */ }
  }

  // Strategy 3: single patch object (not wrapped in array)
  if (stripped.startsWith('{') || stripped.includes('{')) {
    try {
      const singleMatch = stripped.match(/\{[\s\S]*\}/);
      if (singleMatch) {
        const single = JSON.parse(singleMatch[0]);
        if (isPatchLike(single)) return [single as BlockPatch];
      }
    } catch { /* continue */ }
  }

  return [];
}

function tryParseArray(json: string): BlockPatch[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return extractPatches(parsed);
  } catch {
    // Try fixing truncated JSON: if missing closing bracket, append it
    const fixed = json.endsWith(']') ? json : json + ']';
    try {
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return extractPatches(parsed);
    } catch { /* give up */ }
    return [];
  }
}

function extractPatches(arr: unknown[]): BlockPatch[] {
  const patches: BlockPatch[] = [];
  for (const item of arr) {
    if (isPatchLike(item)) {
      patches.push(item as BlockPatch);
    }
  }
  return patches;
}

function isPatchLike(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.blockType === 'string' &&
    typeof rec.property === 'string' &&
    rec.value !== undefined
  );
}

/**
 * Validates patches and returns only those that are safe to apply.
 * Invalid patches are discarded with an optional debug log.
 */
export function filterValidPatches(
  patches: BlockPatch[],
  onInvalid?: (patch: BlockPatch, error: string) => void,
): BlockPatch[] {
  const valid: BlockPatch[] = [];
  for (const patch of patches) {
    const result = validateBlockChange(
      patch.blockType as BlockType,
      patch.property,
      patch.value,
    );
    if (result.valid) {
      valid.push({
        ...patch,
        value: coerceValue(patch.blockType as BlockType, patch.property, patch.value),
      });
    } else if (onInvalid) {
      onInvalid(patch, result.error ?? 'invalid');
    }
  }
  return valid;
}

/** Setters the canvas AI can call to apply validated patches. */
export interface CanvasSetters {
  setHeadline: (v: string) => void;
  setTitleFontSize: (v: number) => void;
  setEmojiOrIcon: (v: string) => void;
  setBadgeText: (v: string) => void;
  setCtaButtons: (v: string[]) => void;
  setDisclaimerText: (v: string) => void;
  setLogoHeight: (v: number) => void;
  setLogoAlignment: (v: 'left' | 'center' | 'right') => void;
  setLogoCompanion: (v: 'none' | 'headline' | 'badge' | 'emoji') => void;
  setProductBlockOptions: (updater: (prev: ProductBlockOptions) => ProductBlockOptions) => void;
}

/** Applies a list of validated patches to canvas state via the provided setters. */
export function applyPatches(patches: BlockPatch[], setters: CanvasSetters): void {
  for (const patch of patches) {
    const { blockType, property, value } = patch;

    switch (blockType) {
      case 'headline':
        if (property === 'text') setters.setHeadline(value as string);
        else if (property === 'fontSize') setters.setTitleFontSize(value as number);
        else if (property === 'emojiOrIcon') setters.setEmojiOrIcon(value as string);
        break;

      case 'badge':
        if (property === 'text') setters.setBadgeText(value as string);
        break;

      case 'cta':
        if (property === 'buttons') {
          const buttons = (value as string).split('|').map((b) => b.trim()).filter(Boolean);
          setters.setCtaButtons(buttons.length > 0 ? buttons : ['']);
        }
        break;

      case 'disclaimer':
        if (property === 'text') setters.setDisclaimerText(value as string);
        break;

      case 'logo':
        if (property === 'height') setters.setLogoHeight(value as number);
        else if (property === 'alignment') setters.setLogoAlignment(value as 'left' | 'center' | 'right');
        else if (property === 'companion') setters.setLogoCompanion(value as 'none' | 'headline' | 'badge' | 'emoji');
        break;

      case 'products':
        if (property === 'columns') {
          setters.setProductBlockOptions((prev) => ({ ...prev, columns: value as 0 | 1 | 2 | 3 | 4 }));
        } else if (property === 'maxProducts') {
          setters.setProductBlockOptions((prev) => ({ ...prev, maxProducts: value as number }));
        } else if (property === 'imageHeight') {
          setters.setProductBlockOptions((prev) => ({ ...prev, imageHeight: value as number }));
        } else if (property.startsWith('showFields.')) {
          const field = property.slice('showFields.'.length) as keyof ProductBlockOptions['showFields'];
          setters.setProductBlockOptions((prev) => ({
            ...prev,
            showFields: { ...prev.showFields, [field]: value as boolean },
          }));
        }
        break;
    }
  }
}

export { SYSTEM_PROMPT };
