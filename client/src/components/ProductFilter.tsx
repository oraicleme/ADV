import React from 'react';
import { Search, CheckSquare, Square, Filter, ChevronDown, ChevronUp, Minus, Sparkles } from 'lucide-react';

/** Count per classification value (e.g. category from Excel or API). Keys are whatever the data provides. */
export type CategoryCounts = Record<string, number>;

/** Per-dimension counts: dimension key → value → count. */
export type ClassificationCounts = Record<string, Record<string, number>>;

interface ProductFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Legacy single-dimension */
  categories?: string[];
  categoryCounts?: CategoryCounts;
  activeCategories?: Set<string>;
  onCategoriesChange?: (categories: Set<string>) => void;
  /** Multi-dimension: when set, renders one chip row per dimension */
  classificationCounts?: ClassificationCounts;
  activeFilters?: Record<string, Set<string>>;
  onFiltersChange?: (dimension: string, values: Set<string>) => void;
  dimensionOrder?: string[];
  dimensionLabels?: Record<string, string>;
  selectedCount: number;
  totalCount: number;
  visibleCount: number;
  onSelectAllVisible: () => void;
  onDeselectAllVisible: () => void;
  onSelectOnlyCategory?: (category: string) => void;
  onSelectOnlyDimensionValue?: (dimension: string, value: string) => void;
  /** Deselect all products in a category/dimension value from selection (minus control). */
  onDeselectCategory?: (category: string) => void;
  onDeselectDimensionValue?: (dimension: string, value: string) => void;
  /** Collapsible: when false, only header with summary is shown. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** When set, show "Pretraži s AI" button; called with current search query. */
  onAiSearch?: (query: string) => void | Promise<void>;
  /** True while AI search is in progress. */
  aiSearchLoading?: boolean;
}

function defaultDimensionLabel(dim: string): string {
  return dim.charAt(0).toUpperCase() + dim.slice(1);
}

export default function ProductFilter({
  searchQuery,
  onSearchChange,
  categories = [],
  categoryCounts,
  activeCategories = new Set(),
  onCategoriesChange,
  classificationCounts,
  activeFilters = {},
  onFiltersChange,
  dimensionOrder,
  dimensionLabels = {},
  selectedCount,
  totalCount,
  visibleCount,
  onSelectAllVisible,
  onDeselectAllVisible,
  onSelectOnlyCategory,
  onSelectOnlyDimensionValue,
  onDeselectCategory,
  onDeselectDimensionValue,
  expanded = true,
  onExpandedChange,
  onAiSearch,
  aiSearchLoading = false,
}: ProductFilterProps) {
  const useMulti = classificationCounts != null && Object.keys(classificationCounts).length > 0;
  const dimensions = useMulti ? (dimensionOrder ?? Object.keys(classificationCounts!).sort()) : [];

  const toggleCategory = (cat: string) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onCategoriesChange?.(next);
  };

  const clearCategories = () => onCategoriesChange?.(new Set());

  const toggleDimensionValue = (dimension: string, value: string) => {
    const current = activeFilters[dimension] ?? new Set();
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onFiltersChange?.(dimension, next);
  };

  const clearDimension = (dimension: string) => onFiltersChange?.(dimension, new Set());

  const isCollapsible = onExpandedChange != null;
  const isExpanded = expanded !== false;

  const header = (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        data-testid="filters-collapse-toggle"
        onClick={() => onExpandedChange?.(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-gray-300 transition hover:bg-white/5"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
          <span>Filters</span>
          {!isExpanded && (
            <span className="text-gray-500">
              — {selectedCount} selected, {visibleCount} visible
            </span>
          )}
        </span>
      </button>
      {!isExpanded && (
        <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-orange-400">{selectedCount}</span>
            {' of '}
            <span className="font-semibold text-gray-300">{totalCount}</span>
            {' selected'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="select-all-visible-collapsed"
              onClick={onSelectAllVisible}
              className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-orange-400"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select all
            </button>
            <button
              type="button"
              data-testid="deselect-all-visible-collapsed"
              onClick={onDeselectAllVisible}
              className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-red-400"
              title="Remove all products from ad selection"
            >
              <Square className="h-3.5 w-3.5" />
              Deselect all
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2" data-testid="product-filter">
      {isCollapsible && header}
      {(!isCollapsible || isExpanded) && (
        <div className="space-y-2" data-testid="filters-content">
      {/* Search + AI */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            data-testid="product-search"
            type="text"
            placeholder="Search by name or code…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() && onAiSearch) {
                onAiSearch(searchQuery.trim());
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
          />
        </div>
        {onAiSearch && (
          <button
            type="button"
            onClick={() => searchQuery.trim() && onAiSearch(searchQuery.trim())}
            disabled={!searchQuery.trim() || aiSearchLoading}
            title="Pretraži s AI — tumači prirodni jezik (npr. auto punjači usb-c)"
            data-testid="product-search-ai"
            className="shrink-0 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-2 text-orange-400 transition hover:bg-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Multi-dimension: one row per dimension */}
      {useMulti &&
        dimensions.map((dimKey) => {
          const valueCounts = classificationCounts![dimKey];
          if (!valueCounts || Object.keys(valueCounts).length === 0) return null;
          const values = Object.keys(valueCounts).sort();
          const active = activeFilters[dimKey] ?? new Set<string>();
          const label = dimensionLabels[dimKey] ?? defaultDimensionLabel(dimKey);
          return (
            <div key={dimKey} className="space-y-1" data-testid={`filter-dimension-${dimKey}`}>
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  data-testid={`dimension-${dimKey}-chip-all`}
                  onClick={() => clearDimension(dimKey)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active.size === 0
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  All
                </button>
                {values.map((val) => {
                  const count = valueCounts[val];
                  const chipLabel = count !== undefined ? `${val} (${count})` : val;
                  return (
                    <span key={val} className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        data-testid={`dimension-${dimKey}-chip-${val}`}
                        onClick={() => toggleDimensionValue(dimKey, val)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          active.has(val)
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {chipLabel}
                      </button>
                      {onSelectOnlyDimensionValue && (
                        <button
                          type="button"
                          data-testid={`select-only-${dimKey}-${val}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOnlyDimensionValue(dimKey, val);
                          }}
                          title={`Filter to ${label} "${val}" and select only these items`}
                          className="rounded-full p-1 text-gray-500 hover:bg-orange-500/20 hover:text-orange-400 transition"
                        >
                          <Filter className="h-3 w-3" />
                        </button>
                      )}
                      {onDeselectDimensionValue && (
                        <button
                          type="button"
                          data-testid={`deselect-category-${dimKey}-${val}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeselectDimensionValue(dimKey, val);
                          }}
                          title="Deselect all in this category"
                          className="rounded-full p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Legacy category chips */}
      {!useMulti && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="category-chips">
          <button
            type="button"
            data-testid="category-chip-all"
            onClick={clearCategories}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              activeCategories.size === 0
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const count = categoryCounts?.[cat];
            const label = count !== undefined ? `${cat} (${count})` : cat;
            return (
              <span key={cat} className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  data-testid={`category-chip-${cat}`}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    activeCategories.has(cat)
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
                {onSelectOnlyCategory && (
                  <button
                    type="button"
                    data-testid={`select-only-category-${cat}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOnlyCategory(cat);
                    }}
                    title="Filter to this category and select only these items"
                    className="rounded-full p-1 text-gray-500 hover:bg-orange-500/20 hover:text-orange-400 transition"
                  >
                    <Filter className="h-3 w-3" />
                  </button>
                )}
                {onDeselectCategory && (
                  <button
                    type="button"
                    data-testid={`deselect-category-${cat}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeselectCategory(cat);
                    }}
                    title="Deselect all in this category"
                    className="rounded-full p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Selection summary bar */}
      <div
        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
        data-testid="selection-summary"
      >
        <span className="text-xs text-gray-400">
          <span className="font-semibold text-orange-400">{selectedCount}</span>
          {' '}of{' '}
          <span className="font-semibold text-gray-300">{totalCount}</span>
          {' '}selected for ad
          {visibleCount < totalCount && (
            <span className="ml-1 text-gray-500">({visibleCount} visible)</span>
          )}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="select-all-visible"
            onClick={onSelectAllVisible}
            className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-orange-400"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Select{visibleCount < totalCount ? ` ${visibleCount} visible` : ' all'}
          </button>
          <button
            type="button"
            data-testid="deselect-all-visible"
            onClick={onDeselectAllVisible}
            className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-red-400"
          >
            <Square className="h-3.5 w-3.5" />
            Deselect{visibleCount < totalCount ? ` visible` : ' all'}
          </button>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
