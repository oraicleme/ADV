/**
 * Client-side persistence for saved product photos (Retail Promo Designer).
 * Uses its own localStorage key; independent of logos (STORY-50).
 * Max 15 entries; per-item size limit 1.5 MB to avoid quota while allowing
 * typical product shots (PNG/JPEG/WebP).
 */

const STORAGE_KEY = 'retail-promo-saved-product-photos';
/** Max saved product photos (10–20 per story; 15 chosen for balance). */
export const MAX_SAVED_PRODUCT_PHOTOS = 15;
/** Per-item size limit: 1.5 MB (base64 ~4/3 of raw). */
export const MAX_PRODUCT_PHOTO_BYTES = 1.5 * 1024 * 1024;

export interface SavedProductPhotoEntry {
  id: string;
  dataUri: string;
  name: string;
  savedAt: number;
  /** Optional product code / SKU for quick identification in the library. */
  code?: string;
  /** Optional retail price shown as a badge in the saved photos library. */
  price?: string;
}

function getStored(): SavedProductPhotoEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedProductPhotoEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedProductPhotoEntry).id === 'string' &&
        typeof (e as SavedProductPhotoEntry).dataUri === 'string' &&
        typeof (e as SavedProductPhotoEntry).name === 'string' &&
        typeof (e as SavedProductPhotoEntry).savedAt === 'number',
    );
  } catch {
    return [];
  }
}

function setStored(entries: SavedProductPhotoEntry[]): void {
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
 * Returns all saved product photos (newest first). Safe to call in SSR; returns [].
 */
export function getSavedProductPhotos(): SavedProductPhotoEntry[] {
  const entries = getStored();
  return [...entries].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves a product photo. If at max count, replaces the oldest.
 * Returns the id of the saved entry, or undefined if save failed (e.g. over size limit).
 */
export function saveProductPhoto(options: {
  dataUri: string;
  name?: string;
  code?: string;
  price?: string;
}): string | undefined {
  const { dataUri, name = 'Product photo', code, price } = options;
  if (dataUriBytes(dataUri) > MAX_PRODUCT_PHOTO_BYTES) return undefined;
  const entries = getStored();
  const id = `saved-product-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry: SavedProductPhotoEntry = { id, dataUri, name, savedAt: Date.now() };
  if (code?.trim()) entry.code = code.trim();
  if (price?.trim()) entry.price = price.trim();
  const next = [entry, ...entries].slice(0, MAX_SAVED_PRODUCT_PHOTOS);
  setStored(next);
  return id;
}

/**
 * Removes a saved product photo by id. No-op if id not found.
 */
export function removeSavedProductPhoto(id: string): void {
  const entries = getStored().filter((e) => e.id !== id);
  setStored(entries);
}

/**
 * Returns true if the storage is at max capacity (user must replace to add another).
 */
export function isSavedProductPhotosFull(): boolean {
  return getStored().length >= MAX_SAVED_PRODUCT_PHOTOS;
}
