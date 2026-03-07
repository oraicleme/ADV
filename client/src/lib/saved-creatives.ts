/**
 * Client-side persistence for saved ad creatives (Retail Promo Designer).
 * Uses localStorage; no images stored — only product metadata and text/style config.
 * Max 10 entries; oldest evicted when limit is exceeded.
 */

import type { LayoutId, StyleOptions } from './ad-layouts/types';
import type { AdElementKey, ProductBlockOptions } from './ad-constants';

const STORAGE_KEY = 'retail-promo-saved-creatives';
export const MAX_SAVED_CREATIVES = 10;

/** Product metadata without heavy base64 image fields. */
export interface SavedProductItem {
  name: string;
  code?: string;
  price?: string;
  retailPrice?: string;
  wholesalePrice?: string;
  currency?: string;
  category?: string;
  brand?: string;
  classifications?: Record<string, string>;
  description?: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number;
}

export interface SavedCreativeConfig {
  products: SavedProductItem[];
  headline: string;
  titleFontSize: number;
  ctaButtons: string[];
  badgeText: string;
  disclaimerText: string;
  emojiOrIcon: string;
  /** Render order of the five named blocks (STORY-40). */
  elementOrder: AdElementKey[];
  layout: LayoutId;
  /** ID of the FormatPreset (e.g. "viber-story"). */
  formatId: string;
  style: StyleOptions;
  /** STORY-46: id of the selected saved logo when this creative was saved. */
  savedLogoId?: string;
  /** STORY-49: ids of saved brand logos in order (matches brandLogoDataUris when creative was saved). */
  savedBrandLogoIds?: string[];
  /** STORY-50: ids of saved product photos in order (one per product slot that uses a saved photo). */
  savedProductImageIds?: string[];
  /** STORY-56: per-product-block options (columns, field visibility, image height, max products). */
  productBlockOptions?: ProductBlockOptions;
}

export interface SavedCreative {
  id: string;
  name: string;
  savedAt: number;
  config: SavedCreativeConfig;
}

function getStored(): SavedCreative[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedCreative =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedCreative).id === 'string' &&
        typeof (e as SavedCreative).name === 'string' &&
        typeof (e as SavedCreative).savedAt === 'number' &&
        (e as SavedCreative).config != null &&
        typeof (e as SavedCreative).config === 'object',
    );
  } catch {
    return [];
  }
}

function setStored(entries: SavedCreative[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or disabled storage — silently fail
  }
}

/**
 * Generates an auto-name for a creative based on its content.
 * Uses headline if available, otherwise "N products", or a fallback.
 */
export function autoName(config: Pick<SavedCreativeConfig, 'headline' | 'products'>): string {
  const headline = config.headline.trim();
  if (headline) {
    return headline.length <= 32 ? headline : `${headline.slice(0, 32)}…`;
  }
  const count = config.products.length;
  if (count > 0) return `${count} product${count !== 1 ? 's' : ''}`;
  return 'Saved creative';
}

/**
 * Returns all saved creatives, newest first. Safe to call during SSR (returns []).
 */
export function getSavedCreatives(): SavedCreative[] {
  const entries = getStored();
  return [...entries].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves an ad creative config. If at max count, the oldest entry is evicted.
 * Returns the saved `SavedCreative` entry.
 */
export function saveCreative(
  config: SavedCreativeConfig,
  name?: string,
): SavedCreative {
  const id = `creative-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: SavedCreative = {
    id,
    name: name ?? autoName(config),
    savedAt: Date.now(),
    config,
  };
  const existing = getStored();
  // Newest first; trim to MAX (oldest are at the end after sort)
  const sorted = [entry, ...existing].sort((a, b) => b.savedAt - a.savedAt);
  setStored(sorted.slice(0, MAX_SAVED_CREATIVES));
  return entry;
}

/**
 * Removes a saved creative by id. No-op if id not found.
 */
export function removeCreative(id: string): void {
  setStored(getStored().filter((e) => e.id !== id));
}

/**
 * Clears all saved creatives. Used in tests / reset flows.
 */
export function clearSavedCreatives(): void {
  setStored([]);
}
