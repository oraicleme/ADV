import React from 'react';
import { ImageIcon, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProductItem } from '../lib/ad-constants';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';
import { buildSeedSearchQuery } from '../lib/product-swap-seed';
import ProductSwapPanel from './ProductSwapPanel';
import PhotoPickerPopover from './PhotoPickerPopover';

export interface ProductSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Index into canvas `products` (template slice). */
  canvasIndex: number;
  currentProduct: ProductItem;
  showReplaceTab: boolean;
  showPhotoTab: boolean;
  /** Full catalog for swap. */
  swapCatalog: ProductItem[];
  excludeCatalogIndex: number | null;
  workspaceSearchQuery: string;
  onApplyWorkspaceSearch: () => void;
  getCatalogThumbnail?: (catalogIndex: number) => string | undefined;
  onSwapPick: (sourceCatalogIndex: number) => void;
  savedProductPhotos: SavedProductPhotoEntry[];
  onAssignPhoto: (dataUri: string) => void;
  onUploadPhoto: (file: File) => void;
}

/**
 * STORY-210: Single modal for “pick another product” + “change photo” — merchant-friendly.
 */
export default function ProductSlotModal({
  open,
  onOpenChange,
  canvasIndex,
  currentProduct,
  showReplaceTab,
  showPhotoTab,
  swapCatalog,
  excludeCatalogIndex,
  workspaceSearchQuery,
  onApplyWorkspaceSearch,
  getCatalogThumbnail,
  onSwapPick,
  savedProductPhotos,
  onAssignPhoto,
  onUploadPhoto,
}: ProductSlotModalProps) {
  const seed = buildSeedSearchQuery(currentProduct.name, currentProduct.code);
  const both = showReplaceTab && showPhotoTab;
  const defaultTab = showReplaceTab ? 'replace' : 'photo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,800px)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        data-testid="product-slot-modal"
      >
        <DialogHeader className="border border-b px-5 py-4 text-left">
          <DialogTitle>Update this product</DialogTitle>
          <DialogDescription>
            {both
              ? 'Pick another product from your catalog, or change the photo for this tile.'
              : showReplaceTab
                ? 'Choose which catalog product should appear in this spot on your ad.'
                : 'Choose a photo for this product on your ad.'}
          </DialogDescription>
        </DialogHeader>

        {both ? (
          <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col px-5 pb-5">
            <TabsList className="grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="replace" className="gap-2" data-testid="product-slot-tab-replace">
                <Package className="h-4 w-4" />
                Pick another product
              </TabsTrigger>
              <TabsTrigger value="photo" className="gap-2" data-testid="product-slot-tab-photo">
                <ImageIcon className="h-4 w-4" />
                Change photo
              </TabsTrigger>
            </TabsList>
            <TabsContent value="replace" className="mt-4 min-h-0 flex-1 overflow-y-auto outline-none">
              <ProductSwapPanel
                key={`${canvasIndex}-${seed}`}
                catalog={swapCatalog}
                excludeCatalogIndex={excludeCatalogIndex}
                initialSearchQuery={seed}
                workspaceSearchQuery={workspaceSearchQuery}
                onApplyWorkspaceSearch={onApplyWorkspaceSearch}
                getThumbnail={getCatalogThumbnail}
                onPick={(ci) => {
                  onSwapPick(ci);
                  onOpenChange(false);
                }}
              />
            </TabsContent>
            <TabsContent value="photo" className="mt-4 min-h-0 flex-1 overflow-y-auto outline-none">
              <PhotoPickerPopover
                variant="inline"
                productName={currentProduct.name}
                productCode={currentProduct.code}
                productPrice={currentProduct.retailPrice ?? currentProduct.price}
                savedPhotos={savedProductPhotos}
                onAssign={(uri) => {
                  onAssignPhoto(uri);
                  onOpenChange(false);
                }}
                onUploadAndSave={(file) => {
                  onUploadPhoto(file);
                  onOpenChange(false);
                }}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        ) : showReplaceTab ? (
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <ProductSwapPanel
              key={`${canvasIndex}-${seed}`}
              catalog={swapCatalog}
              excludeCatalogIndex={excludeCatalogIndex}
              initialSearchQuery={seed}
              workspaceSearchQuery={workspaceSearchQuery}
              onApplyWorkspaceSearch={onApplyWorkspaceSearch}
              getThumbnail={getCatalogThumbnail}
              onPick={(ci) => {
                onSwapPick(ci);
                onOpenChange(false);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <PhotoPickerPopover
              variant="inline"
              productName={currentProduct.name}
              productCode={currentProduct.code}
              productPrice={currentProduct.retailPrice ?? currentProduct.price}
              savedPhotos={savedProductPhotos}
              onAssign={(uri) => {
                onAssignPhoto(uri);
                onOpenChange(false);
              }}
              onUploadAndSave={(file) => {
                onUploadPhoto(file);
                onOpenChange(false);
              }}
              onClose={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
