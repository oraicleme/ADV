import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedProductPhotos,
  saveProductPhoto,
  removeSavedProductPhoto,
  isSavedProductPhotosFull,
  MAX_SAVED_PRODUCT_PHOTOS,
  MAX_PRODUCT_PHOTO_BYTES,
} from './saved-product-photos';

const DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('saved-product-photos', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('getSavedProductPhotos returns empty array when storage is empty', () => {
    expect(getSavedProductPhotos()).toEqual([]);
  });

  it('saveProductPhoto adds an entry and getSavedProductPhotos returns it', () => {
    const id = saveProductPhoto({ dataUri: DATA_URI, name: 'Product shot' });
    expect(id).toBeDefined();
    const list = getSavedProductPhotos();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id, dataUri: DATA_URI, name: 'Product shot' });
    expect(list[0].savedAt).toBeGreaterThan(0);
  });

  it('removeSavedProductPhoto removes the entry', () => {
    const id = saveProductPhoto({ dataUri: DATA_URI, name: 'Photo' });
    expect(getSavedProductPhotos()).toHaveLength(1);
    removeSavedProductPhoto(id!);
    expect(getSavedProductPhotos()).toHaveLength(0);
  });

  it('removeSavedProductPhoto is no-op when id not found', () => {
    saveProductPhoto({ dataUri: DATA_URI, name: 'Photo' });
    removeSavedProductPhoto('nonexistent');
    expect(getSavedProductPhotos()).toHaveLength(1);
  });

  it('respects max count when saving', () => {
    for (let i = 0; i < MAX_SAVED_PRODUCT_PHOTOS + 2; i++) {
      saveProductPhoto({ dataUri: DATA_URI, name: `Photo ${i}` });
    }
    expect(getSavedProductPhotos().length).toBe(MAX_SAVED_PRODUCT_PHOTOS);
  });

  it('isSavedProductPhotosFull returns true when at max', () => {
    for (let i = 0; i < MAX_SAVED_PRODUCT_PHOTOS; i++) {
      saveProductPhoto({ dataUri: DATA_URI, name: `Photo ${i}` });
    }
    expect(isSavedProductPhotosFull()).toBe(true);
  });

  it('isSavedProductPhotosFull returns false when under max', () => {
    saveProductPhoto({ dataUri: DATA_URI, name: 'One' });
    expect(isSavedProductPhotosFull()).toBe(false);
  });

  it('saveProductPhoto returns undefined when data URI exceeds size limit', () => {
    const base64Len = Math.ceil((MAX_PRODUCT_PHOTO_BYTES * 4) / 3) + 1;
    const bigBase64 = 'A'.repeat(base64Len);
    const bigDataUri = `data:image/png;base64,${bigBase64}`;
    const id = saveProductPhoto({ dataUri: bigDataUri, name: 'Too big' });
    expect(id).toBeUndefined();
    expect(getSavedProductPhotos()).toHaveLength(0);
  });

  // STORY-54: metadata (code + price) persistence
  describe('metadata (code + price)', () => {
    it('persists code and price when provided', () => {
      const id = saveProductPhoto({ dataUri: DATA_URI, name: 'Galaxy S24', code: 'ABC123', price: '€899' });
      const list = getSavedProductPhotos();
      expect(list[0]).toMatchObject({ id, code: 'ABC123', price: '€899' });
    });

    it('omits code/price fields when not provided', () => {
      saveProductPhoto({ dataUri: DATA_URI, name: 'No meta' });
      const list = getSavedProductPhotos();
      expect(list[0].code).toBeUndefined();
      expect(list[0].price).toBeUndefined();
    });

    it('trims whitespace from code and price', () => {
      saveProductPhoto({ dataUri: DATA_URI, name: 'Trimmed', code: '  SKU-1  ', price: '  99 EUR  ' });
      const list = getSavedProductPhotos();
      expect(list[0].code).toBe('SKU-1');
      expect(list[0].price).toBe('99 EUR');
    });

    it('omits code/price when provided as empty strings', () => {
      saveProductPhoto({ dataUri: DATA_URI, name: 'Empty strings', code: '', price: '' });
      const list = getSavedProductPhotos();
      expect(list[0].code).toBeUndefined();
      expect(list[0].price).toBeUndefined();
    });
  });
});
