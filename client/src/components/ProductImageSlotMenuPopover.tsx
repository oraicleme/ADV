import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, RefreshCw, X } from 'lucide-react';

export interface ProductImageSlotMenuPopoverProps {
  onChangePhoto: () => void;
  onSwapProduct: () => void;
  onClose: () => void;
  anchorRect: DOMRect;
  showChangePhoto: boolean;
  showSwapProduct: boolean;
}

/**
 * First step when both photo and catalog swap are available: choose intent (STORY-209).
 */
export default function ProductImageSlotMenuPopover({
  onChangePhoto,
  onSwapProduct,
  onClose,
  anchorRect,
  showChangePhoto,
  showSwapProduct,
}: ProductImageSlotMenuPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const popoverHeight = 120;
  const top =
    spaceBelow >= popoverHeight + 8
      ? anchorRect.bottom + 4
      : Math.max(8, anchorRect.top - popoverHeight - 4);
  const left = Math.min(anchorRect.left, viewportWidth - 220);

  const content = (
    <div
      ref={popoverRef}
      data-testid="product-image-slot-menu-popover"
      style={{ top, left, position: 'fixed', zIndex: 10000 }}
      className="w-52 rounded-xl border border-white/10 bg-[#1a1a1f] shadow-xl shadow-black/60"
      role="menu"
      aria-label="Product image actions"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Product
        </span>
        <button
          type="button"
          onClick={onClose}
          data-testid="product-image-slot-menu-close"
          className="rounded p-0.5 text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col p-1.5">
        {showChangePhoto && (
          <button
            type="button"
            role="menuitem"
            data-testid="product-image-slot-menu-photo"
            onClick={() => {
              onChangePhoto();
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-gray-200 transition hover:bg-white/10"
          >
            <ImageIcon className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
            Change photo
          </button>
        )}
        {showSwapProduct && (
          <button
            type="button"
            role="menuitem"
            data-testid="product-image-slot-menu-swap"
            onClick={() => {
              onSwapProduct();
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-gray-200 transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            Swap product…
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
