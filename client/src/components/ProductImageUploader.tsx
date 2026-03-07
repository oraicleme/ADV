import React, { useRef, useState } from 'react';
import { Upload, X, ImagePlus, Bookmark, Trash2 } from 'lucide-react';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';

export interface ImageEntry {
  id: string;
  file: File;
  label: string;
  previewUrl: string;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 20;

let imgCounter = 0;

function createImageEntry(file: File, index: number): ImageEntry {
  return {
    id: `img-${Date.now()}-${++imgCounter}`,
    file,
    label: `Image ${index}`,
    previewUrl: URL.createObjectURL(file),
  };
}

/** Optional product metadata that can be attached when saving a photo to the library. */
export interface PhotoSaveMetadata {
  code?: string;
  price?: string;
}

interface ProductImageUploaderProps {
  images: ImageEntry[];
  onImagesChange: (images: ImageEntry[]) => void;
  /** STORY-54: saved product photos library (when provided, show "Saved product photos" block) */
  savedProductPhotos?: SavedProductPhotoEntry[];
  /** Data URIs for current product photos (uploads + saved), by index; used for "Save this photo" */
  currentProductPhotoDataUris?: string[];
  onSavePhoto?: (dataUri: string, name?: string, metadata?: PhotoSaveMetadata) => void;
  onSelectSavedPhoto?: (id: string) => void;
  onRemoveSavedPhoto?: (id: string) => void;
  isSavedProductPhotosFull?: boolean;
}

export default function ProductImageUploader({
  images,
  onImagesChange,
  savedProductPhotos = [],
  currentProductPhotoDataUris = [],
  onSavePhoto,
  onSelectSavedPhoto,
  onRemoveSavedPhoto,
  isSavedProductPhotosFull = false,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newEntries: ImageEntry[] = [];
    let currentCount = images.length;

    for (const file of Array.from(files)) {
      if (currentCount + newEntries.length >= MAX_IMAGES) {
        setError(`Maximum ${MAX_IMAGES} images allowed.`);
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not supported. Use PNG, JPEG, or WebP.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" exceeds 10 MB limit.`);
        continue;
      }
      newEntries.push(
        createImageEntry(file, currentCount + newEntries.length + 1),
      );
    }

    if (newEntries.length > 0) {
      onImagesChange([...images, ...newEntries]);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const entry = images.find((img) => img.id === id);
    if (entry) URL.revokeObjectURL(entry.previewUrl);
    onImagesChange(images.filter((img) => img.id !== id));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
        <ImagePlus className="h-3.5 w-3.5 text-green-400" />
        Product Photos
      </div>
      <div className="mb-2 text-xs text-gray-500">
        Optional — upload product photos (PNG, JPEG, WebP; max 10 MB each, up
        to 20)
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/[0.03] px-3 py-3 text-xs text-gray-500 transition hover:border-orange-500/50 hover:bg-orange-500/5">
        <Upload className="h-3.5 w-3.5" />
        Click or drag to upload product photos
        <input
          ref={inputRef}
          data-testid="product-image-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {error && (
        <div data-testid="image-upload-error" className="mt-1.5 text-xs text-red-400">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6" data-testid="image-thumbnails">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5"
            >
              <img
                src={img.previewUrl}
                alt={img.label}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-xs text-white">
                {img.label}
              </div>
              <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                {currentProductPhotoDataUris[index] && onSavePhoto && (
                  <button
                    type="button"
                    onClick={() => onSavePhoto(currentProductPhotoDataUris[index]!, img.label)}
                    data-testid={`save-photo-${img.id}`}
                    className="rounded-full bg-black/40 p-0.5 text-white hover:bg-green-500/80"
                    title="Save this photo"
                  >
                    <Bookmark className="h-3 w-3" />
                  </button>
                )}
                <button
                  data-testid={`remove-image-${img.id}`}
                  onClick={() => removeImage(img.id)}
                  className="rounded-full bg-black/40 p-0.5 text-white hover:bg-red-500/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STORY-50: Saved product photos — show when there are saved photos or current uploads */}
      {(savedProductPhotos.length > 0 || images.length > 0) &&
        (onSavePhoto != null || onSelectSavedPhoto != null || onRemoveSavedPhoto != null) && (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3" data-testid="saved-product-photos-section">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
                <Bookmark className="h-3.5 w-3.5 text-green-500/80" />
                Saved product photos
              </span>
            </div>
            {images.length > 0 && onSavePhoto && (
              <p className="mb-2 text-xs text-gray-500">
                Hover any photo above and click the bookmark to save it, or save all at once below.
              </p>
            )}
            {images.length > 0 && currentProductPhotoDataUris.length > 0 && onSavePhoto && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => {
                    currentProductPhotoDataUris.forEach((uri, i) => {
                      if (uri) onSavePhoto(uri, `Product photo ${i + 1}`);
                    });
                  }}
                  data-testid="save-all-product-photos"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-medium text-gray-300 transition hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-400 disabled:opacity-60"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Save all current photos to library
                </button>
                {isSavedProductPhotosFull && (
                  <p className="mt-1 text-xs text-gray-500">
                    Max saved product photos reached. Saving will replace the oldest.
                  </p>
                )}
              </div>
            )}
            {savedProductPhotos.length > 0 && (
              <ul className="space-y-2" role="list" aria-label="Saved product photos">
                {savedProductPhotos.map((saved) => (
                  <li
                    key={saved.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 transition"
                    data-testid={`saved-product-photo-item-${saved.id}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 p-1">
                      <img
                        src={saved.dataUri}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded border border-white/10 object-cover bg-white/5"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-gray-300">{saved.name}</span>
                        {(saved.code ?? saved.price) && (
                          <div className="mt-0.5 flex flex-wrap gap-1" data-testid={`saved-photo-meta-${saved.id}`}>
                            {saved.code && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                                {saved.code}
                              </span>
                            )}
                            {saved.price && (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                                {saved.price}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {onRemoveSavedPhoto && (
                      <button
                        type="button"
                        onClick={() => onRemoveSavedPhoto(saved.id)}
                        data-testid={`remove-saved-product-photo-${saved.id}`}
                        aria-label={`Remove ${saved.name} from saved`}
                        className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
    </div>
  );
}
