import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckSquare, XSquare, Filter } from 'lucide-react';
import type { ProductItem } from '@/lib/ad-templates';

interface ProductBatchOperationsProps {
  products: ProductItem[];
  selectedNames: Set<string>;
  onSelectionChange: (names: Set<string>) => void;
}

/**
 * Batch operations for product selection
 * Provides Select All, Deselect All, and Select by Category options
 */
export function ProductBatchOperations({
  products,
  selectedNames,
  onSelectionChange,
}: ProductBatchOperationsProps) {
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) {
        cats.add(p.category);
      }
    });
    return Array.from(cats).sort();
  }, [products]);

  const handleSelectAll = () => {
    const allNames = new Set(products.map((p) => p.name));
    onSelectionChange(allNames);
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleSelectByCategory = (category: string) => {
    const categoryProducts = products
      .filter((p) => p.category === category)
      .map((p) => p.name);
    
    const newSelection = new Set(selectedNames);
    categoryProducts.forEach((name) => newSelection.add(name));
    onSelectionChange(newSelection);
  };

  const handleDeselectByCategory = (category: string) => {
    const categoryProducts = new Set(
      products
        .filter((p) => p.category === category)
        .map((p) => p.name)
    );
    
    const newSelection = new Set(selectedNames);
    categoryProducts.forEach((name) => newSelection.delete(name));
    onSelectionChange(newSelection);
  };

  const selectedCount = selectedNames.size;
  const totalCount = products.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Select All / Deselect All */}
      <Button
        variant="outline"
        size="sm"
        onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
        className="gap-2"
      >
        {isAllSelected ? (
          <>
            <XSquare className="h-4 w-4" />
            Deselect All
          </>
        ) : (
          <>
            <CheckSquare className="h-4 w-4" />
            Select All
          </>
        )}
      </Button>

      {/* Category filter dropdown */}
      {categories.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              By Category
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Select by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {categories.map((category) => {
              const categoryProductNames = new Set(
                products
                  .filter((p) => p.category === category)
                  .map((p) => p.name)
              );
              const isCategorySelected = Array.from(categoryProductNames).every(
                (name) => selectedNames.has(name)
              );

              return (
                <DropdownMenuItem
                  key={category}
                  onClick={() =>
                    isCategorySelected
                      ? handleDeselectByCategory(category)
                      : handleSelectByCategory(category)
                  }
                  className="flex items-center gap-2"
                >
                  <div className="w-4 h-4 rounded border border-border flex items-center justify-center">
                    {isCategorySelected && (
                      <div className="w-2 h-2 bg-orange-500 rounded-sm" />
                    )}
                  </div>
                  <span className="flex-1">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    {categoryProductNames.size}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Selection counter */}
      <div className="text-xs text-muted-foreground ml-auto">
        {selectedCount} / {totalCount} selected
      </div>
    </div>
  );
}
