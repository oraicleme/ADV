import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package } from 'lucide-react';
import type { ProductItem } from '../lib/ad-constants';
import { buildSearchIndex } from '../lib/product-index';
import { filterCatalogIndicesBySearchQuery } from '../lib/product-selection-panel-filters';

const MAX_BROWSE_ALL = 400;

export interface ProductSwapPanelProps {
  catalog: ProductItem[];
  excludeCatalogIndex: number | null;
  /** Initial search text (usually from buildSeedSearchQuery). */
  initialSearchQuery: string;
  /** Workspace search (Products / Add Products) — optional “use same filter” action. */
  workspaceSearchQuery: string;
  onApplyWorkspaceSearch: () => void;
  getThumbnail?: (catalogIndex: number) => string | undefined;
  onPick: (catalogIndex: number) => void;
}

/**
 * STORY-210: Replace-product picker — isolated search, thumbnails, keyboard navigation.
 */
export default function ProductSwapPanel({
  catalog,
  excludeCatalogIndex,
  initialSearchQuery,
  workspaceSearchQuery,
  onApplyWorkspaceSearch,
  getThumbnail,
  onPick,
}: ProductSwapPanelProps) {
  const [localSearch, setLocalSearch] = useState(initialSearchQuery);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    listRef.current?.focus();
  }, []);

  useEffect(() => {
    setLocalSearch(initialSearchQuery);
    setHighlight(0);
  }, [initialSearchQuery]);

  const searchIndex = useMemo(
    () => (catalog.length > 0 ? buildSearchIndex(catalog) : null),
    [catalog],
  );

  const visibleIndices = useMemo(() => {
    const q = localSearch.trim();
    const ex = excludeCatalogIndex;
    if (!q) {
      const all = catalog
        .map((_, i) => i)
        .filter((i) => i !== ex)
        .slice(0, MAX_BROWSE_ALL);
      return all;
    }
    return filterCatalogIndicesBySearchQuery(catalog, localSearch, {
      catalogSearchIndex: searchIndex,
      searchSource: 'manual',
    }).filter((i) => i !== ex);
  }, [catalog, localSearch, searchIndex, excludeCatalogIndex]);

  useEffect(() => {
    if (highlight >= visibleIndices.length) {
      setHighlight(Math.max(0, visibleIndices.length - 1));
    }
  }, [visibleIndices.length, highlight]);

  const scrollToHighlight = useCallback((idx: number) => {
    const ci = visibleIndices[idx];
    if (ci === undefined) return;
    const el = rowRefs.current.get(ci);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [visibleIndices]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => {
          const n = Math.min(visibleIndices.length - 1, h + 1);
          queueMicrotask(() => scrollToHighlight(n));
          return n;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => {
          const n = Math.max(0, h - 1);
          queueMicrotask(() => scrollToHighlight(n));
          return n;
        });
      } else if (e.key === 'Enter' && visibleIndices.length > 0) {
        e.preventDefault();
        const ci = visibleIndices[highlight];
        if (ci !== undefined) onPick(ci);
      }
    },
    [visibleIndices, highlight, onPick, scrollToHighlight],
  );

  const workspaceTrim = workspaceSearchQuery.trim();
  const canMirrorWorkspace = workspaceTrim.length > 0 && workspaceTrim !== localSearch.trim();

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="product-swap-panel"
      onKeyDown={handleKeyDown}
    >
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="product-swap-local-search">
          Search your catalog
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="product-swap-local-search"
            type="search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setHighlight(0);
            }}
            placeholder="Type name, code, or brand…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-11 w-full rounded-md border pl-9 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            data-testid="product-swap-local-search"
            autoComplete="off"
          />
        </div>
        {canMirrorWorkspace && (
          <button
            type="button"
            onClick={() => {
              onApplyWorkspaceSearch();
              setLocalSearch(workspaceTrim);
              setHighlight(0);
            }}
            className="text-primary text-xs font-medium underline-offset-2 hover:underline"
            data-testid="product-swap-use-workspace-search"
          >
            Use same search as Add Products (“{workspaceTrim.length > 40 ? `${workspaceTrim.slice(0, 40)}…` : workspaceTrim}”)
          </button>
        )}
        {!localSearch.trim() && (
          <p className="text-muted-foreground text-xs">
            Showing up to {MAX_BROWSE_ALL} products — type above to narrow down. Use arrow keys and Enter to choose.
          </p>
        )}
      </div>

      <div
        ref={listRef}
        tabIndex={0}
        role="listbox"
        aria-label="Catalog products"
        aria-activedescendant={
          visibleIndices[highlight] !== undefined ? `swap-row-${visibleIndices[highlight]}` : undefined
        }
        className="border-input max-h-[min(420px,50vh)] overflow-y-auto rounded-md border p-1 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
        data-testid="product-swap-list"
      >
        {visibleIndices.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-10 text-sm" data-testid="product-swap-no-matches">
            <Package className="h-8 w-8 opacity-40" />
            <span>No products match. Try different words or clear the search to browse.</span>
          </div>
        )}
        {visibleIndices.map((ci, rowIdx) => {
          const p = catalog[ci]!;
          const price = p.discountPrice ?? p.retailPrice ?? p.price;
          const thumb = getThumbnail?.(ci);
          const selected = rowIdx === highlight;
          return (
            <button
              key={ci}
              type="button"
              role="option"
              id={`swap-row-${ci}`}
              aria-selected={selected}
              ref={(el) => {
                if (el) rowRefs.current.set(ci, el);
                else rowRefs.current.delete(ci);
              }}
              data-testid={`product-swap-row-${ci}`}
              onClick={() => onPick(ci)}
              onMouseEnter={() => setHighlight(rowIdx)}
              className={`flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors ${
                selected ? 'bg-orange-500/15 ring-1 ring-orange-500/40' : 'hover:bg-muted/80'
              }`}
            >
              <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                    referrerPolicy={/^https?:\/\//i.test(thumb) ? 'no-referrer' : undefined}
                  />
                ) : (
                  <Package className="text-muted-foreground h-7 w-7 opacity-35" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {p.code && (
                  <span className="font-mono text-muted-foreground block text-[10px]">{p.code}</span>
                )}
                <span className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</span>
                {price && (
                  <span className="mt-0.5 block text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {price}
                    {p.currency ? ` ${p.currency}` : ''}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 self-center text-xs font-medium">Choose</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
