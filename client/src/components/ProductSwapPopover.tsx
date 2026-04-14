import React, { useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import type { ProductItem } from '../lib/ad-constants';
import { buildSearchIndex } from '../lib/product-index';
import { filterCatalogIndicesBySearchQuery } from '../lib/product-selection-panel-filters';

export interface ProductSwapPopoverProps {
  catalog: ProductItem[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  listOnlySearchMatches: boolean;
  /** Catalog row backing the current canvas slot — excluded from pick list. */
  excludeCatalogIndex: number | null;
  onPick: (catalogIndex: number) => void;
  onClose: () => void;
  anchorRect: DOMRect;
}

/**
 * STORY-209: Replace a canvas product slot by picking another catalog row using the same
 * MiniSearch + rules pipeline as Add Products / Products tab (shared workspace search).
 */
export default function ProductSwapPopover({
  catalog,
  searchQuery,
  onSearchQueryChange,
  listOnlySearchMatches,
  excludeCatalogIndex,
  onPick,
  onClose,
  anchorRect,
}: ProductSwapPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchIndex = useMemo(
    () => (catalog.length > 0 ? buildSearchIndex(catalog) : null),
    [catalog],
  );

  const matchingIndices = useMemo(() => {
    const q = searchQuery.trim();
    if (!q && listOnlySearchMatches) return [];
    return filterCatalogIndicesBySearchQuery(catalog, searchQuery, {
      catalogSearchIndex: searchIndex,
      searchSource: 'manual',
    });
  }, [catalog, searchQuery, listOnlySearchMatches, searchIndex]);

  const visibleIndices = useMemo(
    () => matchingIndices.filter((i) => i !== excludeCatalogIndex),
    [matchingIndices, excludeCatalogIndex],
  );

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

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
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 900;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const popoverHeight = 380;
  const top =
    spaceBelow >= popoverHeight + 8
      ? anchorRect.bottom + 4
      : Math.max(8, anchorRect.top - popoverHeight - 4);
  const left = Math.min(anchorRect.left, viewportWidth - 428);

  const emptyBecauseNoQuery =
    listOnlySearchMatches && !searchQuery.trim() && catalog.length > 0;

  const content = (
    <div
      ref={popoverRef}
      data-testid="product-swap-popover"
      style={{ top, left, position: 'fixed', zIndex: 10001 }}
      className="flex w-[min(420px,calc(100vw-16px))] flex-col rounded-xl border border-white/10 bg-[#1a1a1f] shadow-xl shadow-black/60"
      role="dialog"
      aria-label="Swap product from catalog"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Swap product
        </span>
        <button
          type="button"
          onClick={onClose}
          data-testid="product-swap-close"
          className="rounded p-0.5 text-gray-500 transition hover:bg-white/10 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-white/10 px-3 py-2">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Search catalog (same as Add Products)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Filter by name, code, brand…"
            className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
            data-testid="product-swap-search-input"
          />
        </div>
      </div>

      <div className="max-h-72 min-h-[120px] overflow-y-auto px-2 py-2">
        {emptyBecauseNoQuery && (
          <p className="px-2 py-6 text-center text-xs text-gray-500" data-testid="product-swap-empty-query">
            Type a search above (or turn off &quot;Only list search matches&quot; in the Products tab) to
            see catalog rows here.
          </p>
        )}
        {!emptyBecauseNoQuery && catalog.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-500">No catalog loaded.</p>
        )}
        {!emptyBecauseNoQuery && catalog.length > 0 && visibleIndices.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-500" data-testid="product-swap-no-matches">
            No products match this search.
          </p>
        )}
        <ul className="space-y-1" role="listbox" data-testid="product-swap-list">
          {visibleIndices.map((ci) => {
            const p = catalog[ci]!;
            const price = p.discountPrice ?? p.retailPrice ?? p.price;
            return (
              <li key={ci}>
                <button
                  type="button"
                  role="option"
                  data-testid={`product-swap-row-${ci}`}
                  onClick={() => onPick(ci)}
                  className="flex w-full flex-col gap-0.5 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-orange-500/30 hover:bg-white/5"
                >
                  {p.code && (
                    <span className="font-mono text-[10px] text-gray-500">{p.code}</span>
                  )}
                  <span className="line-clamp-2 text-xs font-medium text-gray-200">{p.name}</span>
                  {price && (
                    <span className="text-[11px] font-semibold text-orange-300/90">{price}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
