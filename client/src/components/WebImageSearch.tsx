import React, { useState, useCallback } from 'react';
import { Globe2, Check, X, Loader2, ImageOff, Search } from 'lucide-react';
import { searchImages } from '../lib/image-search';
import type { ImageSearchResult } from '../lib/image-search';
import type { ProductItem } from '../lib/ad-templates';

export interface WebImageSelection {
  /** Product index → selected image URL (or undefined if rejected) */
  [productIndex: number]: string | undefined;
}

interface WebImageSearchProps {
  products: ProductItem[];
  /** Indices of products that already have user-uploaded images */
  productsWithImages: Set<number>;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selections: WebImageSelection;
  onSelectionsChange: (selections: WebImageSelection) => void;
}

interface ProductSearchState {
  loading: boolean;
  results: ImageSearchResult[];
  searched: boolean;
}

export default function WebImageSearch({
  products,
  productsWithImages,
  enabled,
  onEnabledChange,
  selections,
  onSelectionsChange,
}: WebImageSearchProps) {
  const [searchStates, setSearchStates] = useState<
    Record<number, ProductSearchState>
  >({});
  const [hasSearched, setHasSearched] = useState(false);

  const productsNeedingImages = products
    .map((p, i) => ({ product: p, index: i }))
    .filter(({ index }) => !productsWithImages.has(index));

  const handleSearch = useCallback(async () => {
    if (productsNeedingImages.length === 0) return;

    const initialStates: Record<number, ProductSearchState> = {};
    for (const { index } of productsNeedingImages) {
      initialStates[index] = { loading: true, results: [], searched: false };
    }
    setSearchStates(initialStates);
    setHasSearched(true);

    const settled = await Promise.allSettled(
      productsNeedingImages.map(async ({ product, index }) => {
        const query =
          product.name + (product.code ? ` ${product.code}` : '');
        const results = await searchImages(query);
        return { index, results };
      }),
    );

    const newStates: Record<number, ProductSearchState> = {};
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { index, results } = result.value;
        newStates[index] = { loading: false, results, searched: true };
      } else {
        // On error, mark as searched with no results
        newStates[0] = { loading: false, results: [], searched: true };
      }
    }
    setSearchStates((prev) => ({ ...prev, ...newStates }));
  }, [productsNeedingImages]);

  const handleSelect = (productIndex: number, url: string) => {
    onSelectionsChange({ ...selections, [productIndex]: url });
  };

  const handleReject = (productIndex: number) => {
    const next = { ...selections };
    delete next[productIndex];
    onSelectionsChange(next);
  };

  const handleToggle = () => {
    const next = !enabled;
    onEnabledChange(next);
    if (!next) {
      setSearchStates({});
      setHasSearched(false);
      onSelectionsChange({});
    }
  };

  return (
    <div data-testid="web-image-search">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">
            Search product images on the web
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          data-testid="web-search-toggle"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            enabled ? 'bg-blue-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Copyright disclaimer */}
      {enabled && (
        <p className="mt-1.5 text-xs text-gray-400">
          Images found via web search may be subject to copyright. Use for
          internal/draft purposes or verify usage rights before publishing.
        </p>
      )}

      {/* Search trigger */}
      {enabled && products.length > 0 && productsNeedingImages.length > 0 && (
        <div className="mt-3">
          {!hasSearched && (
            <button
              type="button"
              data-testid="search-images-btn"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <Search className="h-3.5 w-3.5" />
              Search images for {productsNeedingImages.length} product
              {productsNeedingImages.length !== 1 ? 's' : ''}
            </button>
          )}

          {/* Results per product */}
          {hasSearched && (
            <div className="mt-2 space-y-3" data-testid="search-results">
              {productsNeedingImages.map(({ product, index }) => {
                const state = searchStates[index];
                const selectedUrl = selections[index];

                return (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                    data-testid={`product-search-${index}`}
                  >
                    <div className="mb-2 text-xs font-medium text-gray-700">
                      {product.name}
                      {product.code && (
                        <span className="ml-1 text-gray-400">
                          ({product.code})
                        </span>
                      )}
                    </div>

                    {/* Loading */}
                    {state?.loading && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400" data-testid={`loading-${index}`}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching…
                      </div>
                    )}

                    {/* Results grid */}
                    {state?.searched && !state.loading && state.results.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {state.results.map((img) => {
                          const isSelected = selectedUrl === img.url;
                          return (
                            <button
                              key={img.id}
                              type="button"
                              data-testid={`select-image-${img.id}`}
                              onClick={() =>
                                isSelected
                                  ? handleReject(index)
                                  : handleSelect(index, img.url)
                              }
                              className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                                isSelected
                                  ? 'border-green-500 ring-2 ring-green-200'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <img
                                src={img.thumbnailUrl}
                                alt={img.description}
                                className="h-full w-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                                  <Check className="h-6 w-6 text-green-600" />
                                </div>
                              )}
                              {img.attribution && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] leading-tight text-white opacity-0 transition group-hover:opacity-100">
                                  {img.attribution}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* No results */}
                    {state?.searched && !state.loading && state.results.length === 0 && (
                      <div
                        className="flex items-center gap-1.5 text-xs text-gray-400"
                        data-testid={`no-results-${index}`}
                      >
                        <ImageOff className="h-3.5 w-3.5" />
                        No image found — upload your own
                      </div>
                    )}

                    {/* Reject selected */}
                    {selectedUrl && (
                      <button
                        type="button"
                        data-testid={`reject-${index}`}
                        onClick={() => handleReject(index)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                        Remove selected image
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All products have images */}
      {enabled && products.length > 0 && productsNeedingImages.length === 0 && (
        <p className="mt-2 text-xs text-green-600">
          All products already have images.
        </p>
      )}
    </div>
  );
}
