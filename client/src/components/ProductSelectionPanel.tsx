/**
 * ProductSelectionPanel
 * Standalone panel for intelligent product selection and multi-ad campaign management
 * Integrates with tab-based bottom panel system
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductManagementPanel from './ProductManagementPanel';
import type { ProductItem } from '../lib/ad-constants';

export interface ProductSelectionPanelProps {
  /** All available products from the catalog */
  allProducts: ProductItem[];
  /** Currently selected products in the active ad */
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

  // Get remaining products
  const remainingProducts = React.useMemo(() => {
    const selectedSet = new Set(selectedProductIds);
    return allProducts.filter((p) => !selectedSet.has(p.name));
  }, [allProducts, selectedProductIds]);

  // Filter products based on search and "unused only" toggle
  useEffect(() => {
    let result = allProducts;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q))
      );
    }

    // Filter by unused only
    if (showOnlyUnused) {
      const selectedSet = new Set(selectedProductIds);
      result = result.filter((p) => !selectedSet.has(p.name));
    }

    setFilteredProducts(result);
  }, [allProducts, searchQuery, selectedProductIds, showOnlyUnused]);

  const handleCreateNewAd = async () => {
    if (remainingProducts.length === 0) {
      return;
    }
    await onCreateNewAd?.(remainingProducts);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Product Selection</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {allProducts.length} total • {selectedProductIds.length} selected • {remainingProducts.length} unused
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          <Input
            placeholder="Search products by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyUnused}
              onChange={(e) => setShowOnlyUnused(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-muted-foreground">Show only unused products</span>
          </label>
        </div>
      </div>

      {/* Product Management Panel */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ProductManagementPanel
          products={filteredProducts}
          selectedProductIds={selectedProductIds}
          onSelectionChange={onSelectionChange}
          onCreateNewAdWithRemaining={onCreateNewAd ? handleCreateNewAd : undefined}
          itemsPerPage={8}
        />
      </div>

      {/* Create New Ad Section */}
      {remainingProducts.length > 0 && (
        <div className="border-t border-border bg-blue-50 dark:bg-blue-950 px-4 py-4 space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              Create New Ad with Remaining Products
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {remainingProducts.length} products ready for a new ad campaign
            </p>
          </div>

          {creationError && (
            <div className="flex gap-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs text-red-800 dark:text-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{creationError}</span>
            </div>
          )}

          <Button
            onClick={handleCreateNewAd}
            disabled={isCreatingAd || remainingProducts.length === 0}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCreatingAd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Ad...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Create New Ad ({remainingProducts.length} products)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">No products found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'Try adjusting your search query' : 'Upload products to get started'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelectionPanel;
