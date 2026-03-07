/**
 * Client-side persistence for saved company logos (Retail Promo Designer).
 * Uses localStorage; no PII in keys. Max count and optional size limits.
 */

const STORAGE_KEY = 'retail-promo-saved-logos';
export const MAX_SAVED_LOGOS = 5;
/** Soft limit per item to avoid quota (base64 is ~4/3 of raw; 500KB is conservative). */
export const MAX_ITEM_BYTES = 500 * 1024;

export interface SavedLogoEntry {
  id: string;
  dataUri: string;
  name: string;
  savedAt: number;
}

function getStored(): SavedLogoEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedLogoEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedLogoEntry).id === 'string' &&
        typeof (e as SavedLogoEntry).dataUri === 'string' &&
        typeof (e as SavedLogoEntry).name === 'string' &&
        typeof (e as SavedLogoEntry).savedAt === 'number',
    );
  } catch {
    return [];
  }
}

function setStored(entries: SavedLogoEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or disabled storage
  }
}

/** Approximate byte size of a data URI (base64 string). */
function dataUriBytes(dataUri: string): number {
  const base64 = dataUri.indexOf(',') >= 0 ? dataUri.split(',')[1] ?? '' : '';
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Returns all saved logos (newest first). Safe to call in SSR; returns [].
 */
export function getSavedLogos(): SavedLogoEntry[] {
  const entries = getStored();
  return [...entries].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves a company logo. If at max count, replaces the oldest.
 * Returns the id of the saved entry, or undefined if save failed (e.g. over size limit).
 */
export function saveLogo(options: { dataUri: string; name?: string }): string | undefined {
  const { dataUri, name = 'Company logo' } = options;
  if (dataUriBytes(dataUri) > MAX_ITEM_BYTES) return undefined;
  const entries = getStored();
  const id = `saved-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: SavedLogoEntry = { id, dataUri, name, savedAt: Date.now() };
  const next = [entry, ...entries].slice(0, MAX_SAVED_LOGOS);
  setStored(next);
  return id;
}

/**
 * Removes a saved logo by id. No-op if id not found.
 */
export function removeSavedLogo(id: string): void {
  const entries = getStored().filter((e) => e.id !== id);
  setStored(entries);
}

/**
 * Returns true if the storage is at max capacity (user must replace to add another).
 */
export function isSavedLogosFull(): boolean {
  return getStored().length >= MAX_SAVED_LOGOS;
}
