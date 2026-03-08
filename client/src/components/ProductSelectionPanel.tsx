/**
 * ProductSelectionPanel
 * Standalone panel for intelligent product selection and multi-ad campaign management
 * Integrates with tab-based bottom panel system
 * Optimized for best-in-class UI/UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DraggableProductList } from './DraggableProductList';
import { ProductBatchOperations } from './ProductBatchOperations';
import type { ProductItem } from '../lib/ad-constants';

export interface ProductSelectionPanelProps {
  /** All available products from the catalog */
  allProducts: ProductItem[];
  /** Currently selected product names in the active ad */
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  /** Called when user wants to create a new ad with remaining products */
  onCreateNewAd?: (remainingProducts: ProductItem[]) => Promise<void>;
  /** Loading state for creating new ad */
  isCreatingAd?: boolean;
  /** Error message if ad creation failed */
  creationError?: string | null;
}

export const ProductSelectionPanel: React.FC<ProductSelectionPanelProps> = ({
  allProducts,
  selectedProductIds,
  onSelectionChange,
  onCreateNewAd,
  isCreatingAd = false,
  creationError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>(allProducts);
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(selectedProductIds));

  // Get remaining products
  const remainingProducts = useMemo(() => {
    return allProducts.filter((p) => !selectedNames.has(p.name));
  }, [allProducts, selectedNames]);

  // Filter products based on search and "unused only" toggle
  useEffect(() => {
    let result = allProducts;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Filter by unused only
    if (showOnlyUnused) {
      result = result.filter((p) => !selectedNames.has(p.name));
    }

    setFilteredProducts(result);
  }, [allProducts, searchQuery, selectedNames, showOnlyUnused]);

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
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <span className="text-foreground font-semibold">{allProducts.length}</span>
              <span>total</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1">
              <span className="text-orange-500 font-semibold">{selectedNames.size}</span>
              <span>selected</span>
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1">
              <span className="text-foreground font-semibold">{remainingProducts.length}</span>
              <span>unused</span>
            </span>
          </div>
        </div>

        {/* Search Input - Optimized */}
        <div className="space-y-2.5">
          <Input
            placeholder="Search by name, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm h-9"
          />

          {/* Filter Toggle - Optimized */}
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={showOnlyUnused}
              onChange={(e) => setShowOnlyUnused(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-orange-500"
            />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Show only unused products
            </span>
          </label>
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
                {searchQuery ? 'Try adjusting your search' : 'Add products to get started'}
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
