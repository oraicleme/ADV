/**
 * ProductSelectionPanel
 * Standalone panel for intelligent product selection and multi-ad campaign management
 * Integrates with tab-based bottom panel system
 * Optimized for best-in-class UI/UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Copy, AlertCircle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DraggableProductList } from './DraggableProductList';
import { ProductBatchOperations } from './ProductBatchOperations';
import type { ProductItem } from '../lib/ad-constants';
import type { WorkspaceSettingsSectionId } from '@/lib/workspace-settings-sections';
import { buildSearchIndex } from '../lib/product-index';
import {
  type ProductSelectionCanvasScope,
  filterProductsForSelectionPanel,
  remainingCatalogForNewAd,
} from '../lib/product-selection-panel-filters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ProductSelectionPanelProps {
  /** All available products from the catalog */
  allProducts: ProductItem[];
  /**
   * Product names currently on the ad canvas. When set, "unused" means not on this ad
   * (industry default for the next creative). When omitted, legacy: unused = not checked in this panel.
   */
  namesOnCanvas?: string[];
  /** Currently selected product names in the active ad */
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  /** Called when user wants to create a new ad with remaining products */
  onCreateNewAd?: (remainingProducts: ProductItem[]) => Promise<void>;
  /** Loading state for creating new ad */
  isCreatingAd?: boolean;
  /** Error message if ad creation failed */
  creationError?: string | null;
  /**
   * STORY-164: Controlled from parent so search/toggle survive unmount when switching
   * bottom tabs (Chat / Products / Export).
   */
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  /**
   * STORY-206: When `namesOnCanvas` is set — after search, list all hits / not on ad / only on ad.
   * Ignored when `namesOnCanvas` is omitted (legacy).
   */
  canvasScope?: ProductSelectionCanvasScope;
  onCanvasScopeChange?: (scope: ProductSelectionCanvasScope) => void;
  /** Legacy when `namesOnCanvas` is omitted: hide checked rows in this panel. */
  showOnlyUnused?: boolean;
  onShowOnlyUnusedChange?: (v: boolean) => void;
  /**
   * STORY-208: When true (default in canvas mode from parent), empty search shows no rows — only search hits appear.
   * When false, empty search lists the full catalog slice (then filtered by List scope), legacy behavior.
   */
  listOnlySearchMatches?: boolean;
  onListOnlySearchMatchesChange?: (v: boolean) => void;
  /** STORY-171: jump to Workspace Settings (e.g. Search section). */
  onNavigateToWorkspaceSettings?: (section: WorkspaceSettingsSectionId) => void;
}

export const ProductSelectionPanel: React.FC<ProductSelectionPanelProps> = ({
  allProducts,
  namesOnCanvas,
  selectedProductIds,
  onSelectionChange,
  onCreateNewAd,
  isCreatingAd = false,
  creationError,
  searchQuery,
  onSearchQueryChange,
  canvasScope = 'not_on_canvas',
  onCanvasScopeChange,
  showOnlyUnused = false,
  onShowOnlyUnusedChange,
  listOnlySearchMatches = true,
  onListOnlySearchMatchesChange,
  onNavigateToWorkspaceSettings,
}) => {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(selectedProductIds));

  useEffect(() => {
    setSelectedNames(new Set(selectedProductIds));
  }, [selectedProductIds]);

  const remainingProducts = useMemo(
    () => remainingCatalogForNewAd(allProducts, namesOnCanvas, selectedNames),
    [allProducts, namesOnCanvas, selectedNames],
  );

  const canvasMode = namesOnCanvas !== undefined;

  /** STORY-181: same MiniSearch index as Add Products for aligned “shown” counts. */
  const panelSearchIndex = useMemo(
    () => (allProducts.length > 0 ? buildSearchIndex(allProducts) : null),
    [allProducts],
  );

  const filteredProducts = useMemo(() => {
    if (canvasMode && listOnlySearchMatches && !searchQuery.trim()) {
      return [];
    }
    return filterProductsForSelectionPanel(
      allProducts,
      searchQuery,
      namesOnCanvas,
      selectedNames,
      canvasMode ? canvasScope : null,
      canvasMode ? false : showOnlyUnused,
      { catalogSearchIndex: panelSearchIndex, searchSource: 'manual' },
    );
  }, [
    allProducts,
    searchQuery,
    namesOnCanvas,
    selectedNames,
    canvasMode,
    canvasScope,
    showOnlyUnused,
    listOnlySearchMatches,
    panelSearchIndex,
  ]);

  // Sync selected names with parent component
  const handleSelectionChange = (names: Set<string>) => {
    setSelectedNames(names);
    onSelectionChange(Array.from(names));
  };

  const handleReorder = (reorderedProducts: ProductItem[]) => {
    // Reorder is handled locally in DraggableProductList
    // If needed, we can emit this to parent component
  };

  const handleCreateNewAd = async () => {
    if (remainingProducts.length === 0) {
      return;
    }
    await onCreateNewAd?.(remainingProducts);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Optimized spacing and typography */}
      <div className="border-b border-border px-4 py-3.5 space-y-3.5">
        {/* Title and Stats */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-foreground tracking-tight">PRODUCT SELECTION</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
            {canvasMode ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">{allProducts.length}</span>
                  <span>in catalog</span>
                </span>
                <span className="text-border hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">{(namesOnCanvas ?? []).length}</span>
                  <span>on this ad</span>
                </span>
                <span className="text-border hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">{remainingProducts.length}</span>
                  <span>available</span>
                </span>
                <span className="text-border hidden sm:inline">•</span>
                <span
                  className="flex items-center gap-1"
                  title="Rows in the scrollable list after search + list scope (all / not on ad / only on ad)"
                >
                  <span className="text-foreground font-semibold">{filteredProducts.length}</span>
                  <span>shown</span>
                </span>
                <span className="text-border hidden sm:inline">•</span>
                <span
                  className="flex items-center gap-1"
                  title="Checkboxes for batch actions (Select all, By category) — not the same as products on the ad"
                >
                  <span className="text-orange-500 font-semibold">{selectedNames.size}</span>
                  <span>checked</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">{allProducts.length}</span>
                  <span>total</span>
                </span>
                <span className="text-border">•</span>
                <span
                  className="flex items-center gap-1"
                  title="Rows visible after search + unused filter"
                >
                  <span className="text-foreground font-semibold">{filteredProducts.length}</span>
                  <span>shown</span>
                </span>
                <span className="text-border">•</span>
                <span
                  className="flex items-center gap-1"
                  title="Rows checked for batch actions in this panel"
                >
                  <span className="text-orange-500 font-semibold">{selectedNames.size}</span>
                  <span>checked</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-foreground font-semibold">{remainingProducts.length}</span>
                  <span>unused</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Search Input - Optimized */}
        <div className="space-y-2.5">
          <Input
            placeholder="Search by name, code, or category..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="text-sm h-9"
          />

          {canvasMode ? (
            <div className="space-y-1.5">
              <label
                htmlFor="product-panel-canvas-scope"
                className="text-[11px] font-medium text-muted-foreground"
              >
                List
              </label>
              <Select
                value={canvasScope}
                onValueChange={(v) => onCanvasScopeChange?.(v as ProductSelectionCanvasScope)}
              >
                <SelectTrigger
                  id="product-panel-canvas-scope"
                  className="h-9 w-full text-sm"
                  data-testid="product-panel-canvas-scope"
                >
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All matching search</SelectItem>
                  <SelectItem value="not_on_canvas">Not on this ad</SelectItem>
                  <SelectItem value="only_on_canvas">Only on this ad</SelectItem>
                </SelectContent>
              </Select>
              <label className="group flex cursor-pointer items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  checked={listOnlySearchMatches}
                  onChange={(e) => onListOnlySearchMatchesChange?.(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-orange-500"
                  data-testid="product-panel-list-only-search-matches"
                />
                <span className="text-xs font-medium leading-snug text-muted-foreground group-hover:text-foreground">
                  Only list search matches — hide the full catalog until you type a search (uncheck to browse
                  without searching)
                </span>
              </label>
            </div>
          ) : (
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={showOnlyUnused}
                onChange={(e) => onShowOnlyUnusedChange?.(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-orange-500"
              />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Show only unused products
              </span>
            </label>
          )}

          {onNavigateToWorkspaceSettings && (
            <button
              type="button"
              onClick={() => onNavigateToWorkspaceSettings('search')}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-orange-500/40 hover:bg-muted/50 hover:text-foreground"
              data-testid="product-panel-search-settings-link"
            >
              <Settings2 className="h-3 w-3 shrink-0 text-orange-500/90" aria-hidden />
              Search settings
            </button>
          )}
        </div>

        {/* Batch Operations */}
        <ProductBatchOperations
          products={filteredProducts}
          selectedNames={selectedNames}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Draggable Product List */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        {filteredProducts.length > 0 ? (
          <DraggableProductList
            products={filteredProducts}
            selectedNames={selectedNames}
            onSelectionChange={handleSelectionChange}
            onReorder={handleReorder}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">No products found</p>
              <p className="text-xs text-muted-foreground">
                {canvasMode && listOnlySearchMatches && !searchQuery.trim()
                  ? 'Type a search above to list products here. Uncheck “Only list search matches” to browse the full catalog without a query.'
                  : searchQuery.trim()
                    ? canvasMode && canvasScope === 'only_on_canvas'
                      ? 'No products on this ad match this search — try clearing or broadening the search'
                      : 'Try adjusting your search'
                    : canvasMode && canvasScope === 'not_on_canvas'
                      ? 'Nothing left off this ad — switch List to “All matching search” or “Only on this ad”'
                      : canvasMode && canvasScope === 'only_on_canvas'
                        ? 'No products on this ad yet — add products from the catalog first'
                        : 'Add products to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create New Ad Section - Optimized */}
      {remainingProducts.length > 0 && (
        <div className="border-t border-border bg-blue-50 dark:bg-blue-950/30 px-4 py-3.5 space-y-3">
          <div className="space-y-1">
            <h3 className="font-bold text-xs text-blue-900 dark:text-blue-100 tracking-tight">
              CREATE NEW AD WITH REMAINING PRODUCTS
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              {remainingProducts.length} product{remainingProducts.length !== 1 ? 's' : ''} ready for new campaign
            </p>
          </div>

          {creationError && (
            <div className="flex gap-2 p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs text-red-800 dark:text-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{creationError}</span>
            </div>
          )}

          <Button
            onClick={handleCreateNewAd}
            disabled={isCreatingAd || remainingProducts.length === 0}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9"
          >
            {isCreatingAd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Ad...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Create New Ad
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductSelectionPanel;
