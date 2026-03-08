/**
 * ProductManagementPanel
 * Displays all relevant products with pagination, filtering, and selection management
 * Allows users to see ALL products (not just top 5) and manage which ones to use in ads
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Filter, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductItem } from '../lib/ad-constants';

export interface ProductManagementPanelProps {
  products: ProductItem[];
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  onCreateNewAdWithRemaining?: (remainingProducts: ProductItem[]) => void;
  itemsPerPage?: number;
}

export const ProductManagementPanel: React.FC<ProductManagementPanelProps> = ({
  products,
  selectedProductIds,
  onSelectionChange,
  onCreateNewAdWithRemaining,
  itemsPerPage = 12,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'discount'>('name');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterCategory) {
      result = result.filter((p) => p.category === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price': {
          const aPrice = typeof a.price === 'string' ? parseFloat(a.price) : 0;
          const bPrice = typeof b.price === 'string' ? parseFloat(b.price) : 0;
          return aPrice - bPrice;
        }
        case 'discount':
          return (b.discountPercent || 0) - (a.discountPercent || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [products, searchQuery, filterCategory, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Get remaining products
  const remainingProducts = useMemo(() => {
    const selectedSet = new Set(selectedProductIds);
    return products.filter((p) => !selectedSet.has(p.name));
  }, [products, selectedProductIds]);

  // Toggle product selection (use product name as ID since ProductItem doesn't have id)
  const toggleProduct = (productName: string) => {
    const newSelection = selectedProductIds.includes(productName)
      ? selectedProductIds.filter((id) => id !== productName)
      : [...selectedProductIds, productName];
    onSelectionChange(newSelection);
  };

  // Select all on current page
  const selectAllOnPage = () => {
    const pageNames = paginatedProducts.map((p) => p.name);
    const newSelection = Array.from(
      new Set([...selectedProductIds, ...pageNames])
    );
    onSelectionChange(newSelection);
  };

  // Deselect all on current page
  const deselectAllOnPage = () => {
    const pageNames = new Set(paginatedProducts.map((p) => p.name));
    const newSelection = selectedProductIds.filter((id) => !pageNames.has(id));
    onSelectionChange(newSelection);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-border p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Product Management
        </h2>
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} products found
          {selectedProductIds.length > 0 && (
            <span className="ml-2 font-semibold">
              • {selectedProductIds.length} selected
            </span>
          )}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Category and Sort */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-foreground">Category:</span>
            <select
              value={filterCategory || ''}
              onChange={(e) => {
                setFilterCategory(e.target.value || null);
                setCurrentPage(1);
              }}
              className="text-sm px-3 py-1 rounded border border-border bg-background"
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'name' | 'price' | 'discount')
              }
              className="text-sm px-3 py-1 rounded border border-border bg-background"
            >
              <option value="name">Name</option>
              <option value="price">Price (Low to High)</option>
              <option value="discount">Discount (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {/* Page Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllOnPage}
              disabled={paginatedProducts.length === 0}
            >
              Select All on Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllOnPage}
              disabled={paginatedProducts.length === 0}
            >
              Deselect All on Page
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Products */}
        {paginatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts.map((product) => {
              const isSelected = selectedProductIds.includes(product.name);
              return (
                <div
                  key={product.name}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-border hover:border-orange-300'
                  }`}
                  onClick={() => toggleProduct(product.name)}
                >
                  {/* Checkbox */}
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProduct(product.name)}
                      className="mt-1 w-5 h-5 rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {product.name}
                      </h3>
                      {product.code && (
                        <p className="text-xs text-muted-foreground">{product.code}</p>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-2 text-sm">
                    {product.price && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold text-foreground">
                          {typeof product.price === 'string' ? product.price : `$${product.price}`}
                        </span>
                      </div>
                    )}
                    {product.discountPercent && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-semibold text-orange-600">
                          {product.discountPercent}% off
                        </span>
                      </div>
                    )}
                    {product.category && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="text-foreground">{product.category}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-10"
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Create New Ad with Remaining Products */}
      {remainingProducts.length > 0 && onCreateNewAdWithRemaining && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-blue-900">
              Create New Ad with Remaining Products
            </h3>
            <p className="text-sm text-blue-800 mt-1">
              {remainingProducts.length} products not yet used in ads
            </p>
          </div>
          <Button
            onClick={() => onCreateNewAdWithRemaining(remainingProducts)}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Copy className="w-4 h-4" />
            Create New Ad with {remainingProducts.length} Products
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Products:</span>
          <span className="font-semibold">{products.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Selected:</span>
          <span className="font-semibold text-orange-600">{selectedProductIds.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Remaining:</span>
          <span className="font-semibold text-blue-600">{remainingProducts.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductManagementPanel;
