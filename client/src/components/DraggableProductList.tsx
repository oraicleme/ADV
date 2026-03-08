import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProductItem } from '@/lib/ad-templates';

interface DraggableProductListProps {
  products: ProductItem[];
  selectedNames: Set<string>;
  onSelectionChange: (names: Set<string>) => void;
  onReorder: (reorderedProducts: ProductItem[]) => void;
}

/**
 * Draggable product item component
 */
function SortableProductItem({
  product,
  isSelected,
  onToggle,
}: {
  product: ProductItem;
  isSelected: boolean;
  onToggle: (name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isDragging
          ? 'border-orange-500 bg-orange-500/5 shadow-lg'
          : 'border-border hover:border-orange-400/50'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(product.name)}
        className="flex-shrink-0"
      />

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {product.price && (
            <span className="text-xs text-muted-foreground">
              ${typeof product.price === 'string' ? product.price : (product.price as number).toFixed(2)}
            </span>
          )}
          {product.discountPercent && (
            <span className="text-xs font-semibold text-orange-500">
              -{product.discountPercent}%
            </span>
          )}
          {product.category && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {product.category}
            </span>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
      )}
    </div>
  );
}

/**
 * Draggable product list with reordering and selection
 * Uses dnd-kit for drag-and-drop functionality
 */
export function DraggableProductList({
  products,
  selectedNames,
  onSelectionChange,
  onReorder,
}: DraggableProductListProps) {
  const [orderedProducts, setOrderedProducts] = useState(products);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const productNames = useMemo(() => orderedProducts.map((p) => p.name), [orderedProducts]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedProducts.findIndex((p) => p.name === active.id);
      const newIndex = orderedProducts.findIndex((p) => p.name === over.id);

      const newOrder = arrayMove(orderedProducts, oldIndex, newIndex);
      setOrderedProducts(newOrder);
      onReorder(newOrder);
    }
  };

  const handleToggle = (productName: string) => {
    const newSelection = new Set(selectedNames);
    if (newSelection.has(productName)) {
      newSelection.delete(productName);
    } else {
      newSelection.add(productName);
    }
    onSelectionChange(newSelection);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={productNames}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {orderedProducts.map((product) => (
            <SortableProductItem
              key={product.name}
              product={product}
              isSelected={selectedNames.has(product.name)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
