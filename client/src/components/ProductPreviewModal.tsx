import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { ProductItem } from '@/lib/ad-constants';

interface ProductPreviewModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for displaying detailed product information
 * Shows images, descriptions, pricing, and other product details
 */
export function ProductPreviewModal({ product, isOpen, onClose }: ProductPreviewModalProps) {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Product Image */}
          <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-64">
            {product.imageDataUri ? (
              <img
                src={product.imageDataUri}
                alt={product.name}
                className="max-w-full max-h-64 object-contain rounded"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No image available</p>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Code */}
            {product.code && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Code</p>
                <p className="text-sm font-mono text-foreground">{product.code}</p>
              </div>
            )}

            {/* Category & Brand */}
            <div className="flex gap-2 flex-wrap">
              {product.category && (
                <Badge variant="secondary">{product.category}</Badge>
              )}
              {product.brand && (
                <Badge variant="outline">{product.brand}</Badge>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Pricing</p>
              <div className="space-y-1">
                {product.price && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="text-sm font-semibold text-foreground">
                      ${typeof product.price === 'string' ? product.price : product.price}
                    </span>
                  </div>
                )}
                {product.originalPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Original:</span>
                    <span className="text-sm text-muted-foreground line-through">
                      ${product.originalPrice}
                    </span>
                  </div>
                )}
                {product.discountPercent && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Discount:</span>
                    <span className="text-sm font-semibold text-orange-500">
                      -{product.discountPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Classifications */}
            {product.classifications && Object.keys(product.classifications).length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Details</p>
                <div className="space-y-1">
                  {Object.entries(product.classifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
