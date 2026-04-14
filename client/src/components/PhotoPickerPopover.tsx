import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X } from 'lucide-react';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';

export interface PhotoPickerPopoverProps {
  productIndex: number;
  productName: string;
  productCode?: string;
  productPrice?: string;
  savedPhotos: SavedProductPhotoEntry[];
  /** Called when user selects a saved photo or finishes uploading. Sets product.imageDataUri. */
  onAssign: (dataUri: string) => void;
  /** Called when user uploads a new file — parent converts and saves to library. */
  onUploadAndSave: (file: File) => void;
  onClose: () => void;
  /** Bounding rect of the trigger button — used for fixed positioning. */
  anchorRect?: DOMRect;
  /** STORY-210: Embed in modal (no portal); `anchorRect` not required. */
  variant?: 'popover' | 'inline';
  /** When `variant` is inline, hide header close if the parent dialog already has one. */
  showHeaderClose?: boolean;
}

export default function PhotoPickerPopover({
  productName,
  savedPhotos,
  onAssign,
  onUploadAndSave,
  onClose,
  anchorRect,
  variant = 'popover',
  showHeaderClose = true,
}: PhotoPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInline = variant === 'inline';

  useEffect(() => {
    if (isInline) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, isInline]);

  useEffect(() => {
    if (isInline) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isInline]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadAndSave(file);
    onClose();
  };

  const shellClass =
    'rounded-xl border border-white/10 bg-[#1a1a1f] shadow-xl shadow-black/60 dark:bg-[#1a1a1f]';

  const header = (
    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Choose Photo</span>
      {showHeaderClose && (
        <button
          type="button"
          onClick={onClose}
          data-testid="photo-picker-close"
          className="rounded p-0.5 text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const body = (
    <>
      {header}

      {/* Section A: Saved photos library */}
      <div className="max-h-52 overflow-y-auto px-3 py-2">
        {savedPhotos.length > 0 ? (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Saved Photos ({savedPhotos.length})
            </p>
            <ul className="space-y-1" role="list" data-testid="photo-picker-saved-list">
              {savedPhotos.map((saved) => (
                <li
                  key={saved.id}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2 py-1.5"
                >
                  <img
                    src={saved.dataUri}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-gray-300">{saved.name}</span>
                    {(saved.code ?? saved.price) && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {saved.code && (
                          <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-gray-400">
                            {saved.code}
                          </span>
                        )}
                        {saved.price && (
                          <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-medium text-amber-400">
                            {saved.price}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid={`photo-picker-use-${saved.id}`}
                    onClick={() => {
                      onAssign(saved.dataUri);
                      onClose();
                    }}
                    className="shrink-0 rounded bg-orange-500/20 px-2 py-1 text-[10px] font-semibold text-orange-400 transition hover:bg-orange-500/40"
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-3 text-center text-xs text-gray-500">No saved photos yet</p>
        )}
      </div>

      {/* Section B: Upload new */}
      <div className="border-t border-white/10 px-3 py-2">
        <button
          type="button"
          data-testid="photo-picker-upload"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-400"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload photo for this product
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          data-testid="photo-picker-file-input"
          onChange={handleFileChange}
        />
      </div>
    </>
  );

  if (isInline) {
    return (
      <div
        ref={popoverRef}
        data-testid="photo-picker-popover"
        data-variant="inline"
        className={`w-full ${shellClass}`}
        role="region"
        aria-label={`Choose photo for ${productName}`}
      >
        {body}
      </div>
    );
  }

  if (!anchorRect) return null;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const popoverHeight = 320;
  const top =
    spaceBelow >= popoverHeight + 8
      ? anchorRect.bottom + 4
      : anchorRect.top - popoverHeight - 4;
  const left = Math.min(anchorRect.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 296);

  const content = (
    <div
      ref={popoverRef}
      data-testid="photo-picker-popover"
      style={{ top, left, position: 'fixed', zIndex: 9999 }}
      className={`w-72 ${shellClass}`}
      role="dialog"
      aria-label={`Choose photo for ${productName}`}
    >
      {body}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
