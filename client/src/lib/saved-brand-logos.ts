/**
 * Client-side persistence for saved brand logos (Retail Promo Designer).
 * Uses its own localStorage key; independent of company logos (STORY-49).
 * Same max count and size limits as company logos.
 * Enhanced with tagging, reordering, and export/import support.
 */

const STORAGE_KEY = 'retail-promo-saved-brand-logos';
export const MAX_SAVED_BRAND_LOGOS = 5;
/** Soft limit per item to avoid quota (base64 is ~4/3 of raw; 500KB is conservative). */
export const MAX_BRAND_ITEM_BYTES = 500 * 1024;

export interface SavedBrandLogoEntry {
  id: string;
  dataUri: string;
  name: string;
  savedAt: number;
  tags?: string[];
  order?: number;
}

function getStored(): SavedBrandLogoEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedBrandLogoEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedBrandLogoEntry).id === 'string' &&
        typeof (e as SavedBrandLogoEntry).dataUri === 'string' &&
        typeof (e as SavedBrandLogoEntry).name === 'string' &&
        typeof (e as SavedBrandLogoEntry).savedAt === 'number',
    );
  } catch {
    return [];
  }
}

function setStored(entries: SavedBrandLogoEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or disabled storage
  }
}

function dataUriBytes(dataUri: string): number {
  const base64 = dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] ?? '' : '';
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Returns all saved brand logos (newest first). Safe to call in SSR; returns [].
 */
export function getSavedBrandLogos(): SavedBrandLogoEntry[] {
  const entries = getStored();
  return [...entries].sort((a, b) => (b.order ?? b.savedAt) - (a.order ?? a.savedAt));
}

/**
 * Saves a brand logo. If at max count, replaces the oldest.
 * Returns the id of the saved entry, or undefined if save failed (e.g. over size limit).
 */
export function saveBrandLogo(options: { dataUri: string; name?: string; tags?: string[] }): string | undefined {
  const { dataUri, name = 'Brand logo', tags = [] } = options;
  if (dataUriBytes(dataUri) > MAX_BRAND_ITEM_BYTES) return undefined;
  const entries = getStored();
  const id = `saved-brand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: SavedBrandLogoEntry = { id, dataUri, name, savedAt: Date.now(), tags, order: Date.now() };
  const next = [entry, ...entries].slice(0, MAX_SAVED_BRAND_LOGOS);
  setStored(next);
  return id;
}

/**
 * Removes a saved brand logo by id. No-op if id not found.
 */
export function removeSavedBrandLogo(id: string): void {
  const entries = getStored().filter((e) => e.id !== id);
  setStored(entries);
}

/**
 * Updates tags for a saved brand logo.
 */
export function updateBrandLogoTags(id: string, tags: string[]): void {
  const entries = getStored();
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    entry.tags = tags;
    setStored(entries);
  }
}

/**
 * Reorders brand logos by updating their order property.
 */
export function reorderBrandLogos(orderedIds: string[]): void {
  const entries = getStored();
  const entryMap = new Map(entries.map((e) => [e.id, e]));
  
  orderedIds.forEach((id, index) => {
    const entry = entryMap.get(id);
    if (entry) {
      entry.order = index;
    }
  });
  
  const reordered = orderedIds.map((id) => entryMap.get(id)).filter((e): e is SavedBrandLogoEntry => e != null);
  setStored(reordered);
}

/**
 * Returns all unique tags used across saved brand logos.
 */
export function getAllBrandLogoTags(): string[] {
  const entries = getStored();
  const tagsSet = new Set<string>();
  entries.forEach((e) => {
    (e.tags || []).forEach((tag) => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
}

/**
 * Filters brand logos by tags. Returns logos that have ANY of the specified tags.
 */
export function filterBrandLogosByTags(tags: string[]): SavedBrandLogoEntry[] {
  if (tags.length === 0) return getSavedBrandLogos();
  const entries = getSavedBrandLogos();
  return entries.filter((e) => (e.tags || []).some((tag) => tags.includes(tag)));
}

/**
 * Exports brand logos as JSON string for backup/sharing.
 */
export function exportBrandLogos(): string {
  const entries = getStored();
  return JSON.stringify(entries, null, 2);
}

/**
 * Imports brand logos from JSON string. Merges with existing logos.
 * Returns number of successfully imported logos.
 */
export function importBrandLogos(jsonString: string): number {
  try {
    const imported = JSON.parse(jsonString) as unknown;
    if (!Array.isArray(imported)) return 0;
    
    const validEntries = imported.filter(
      (e): e is SavedBrandLogoEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedBrandLogoEntry).id === 'string' &&
        typeof (e as SavedBrandLogoEntry).dataUri === 'string' &&
        typeof (e as SavedBrandLogoEntry).name === 'string' &&
        typeof (e as SavedBrandLogoEntry).savedAt === 'number',
    );
    
    if (validEntries.length === 0) return 0;
    
    const existing = getStored();
    const existingIds = new Set(existing.map((e) => e.id));
    
    // Only add logos that don't already exist
    const newEntries = validEntries.filter((e) => !existingIds.has(e.id));
    const merged = [...newEntries, ...existing].slice(0, MAX_SAVED_BRAND_LOGOS);
    
    setStored(merged);
    return newEntries.length;
  } catch {
    return 0;
  }
}

/**
 * Returns true if the storage is at max capacity (user must replace to add another).
 */
export function isSavedBrandLogosFull(): boolean {
  return getStored().length >= MAX_SAVED_BRAND_LOGOS;
}
