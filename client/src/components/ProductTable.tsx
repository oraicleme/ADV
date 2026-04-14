import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, Camera, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ProductItem } from '../lib/ad-templates';
import { formatPrice } from '../lib/price-format';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';
import PhotoPickerPopover from './PhotoPickerPopover';

interface ProductTableProps {
  products: ProductItem[];
  onUpdate: (index: number, field: keyof ProductItem, value: string) => void;
  onRemove: (index: number) => void;
  /** Indices of products selected for the ad. When undefined, no checkboxes are shown. */
  selectedIndices?: Set<number>;
  /** Toggle selection for a single product by its index in the full products array. */
  onToggleSelect?: (index: number) => void;
  /** Batch select/deselect all visible indices in one call. When set, select-all uses this instead of N single toggles. */
  onToggleSelectAll?: (visibleIndices: number[], select: boolean) => void;
  /** Indices of products visible after filtering. When undefined, all are visible. */
  visibleIndices?: number[];
  /**
   * Maximum pixel height of the scroll container before virtual scrolling kicks in.
   * Defaults to 480 (≈ 13 rows). Pass Infinity to disable the height cap.
   */
  maxHeight?: number;
  /** Locale for number/price display (e.g. en-US, sr-RS). When set, retail/wholesale cells are formatted. */
  locale?: string;
  /** STORY-55: saved product photos for the per-row photo picker. */
  savedProductPhotos?: SavedProductPhotoEntry[];
  /** STORY-55: called when user assigns a photo to a specific product row. */
  onAssignPhoto?: (index: number, dataUri: string) => void;
  /** STORY-55: called when user uploads a new photo from the row picker. */
  onUploadPhoto?: (index: number, file: File) => void;
  /** STORY-200: explicit relevance vs last agent catalog search (hashed in parent). */
  searchFeedbackEnabled?: boolean;
  onSearchFeedbackExplicit?: (index: number, relevant: boolean) => void;
}

const ROW_HEIGHT_ESTIMATE = 36; // px — compact table row

export default function ProductTable({
  products,
  onUpdate,
  onRemove,
  selectedIndices,
  onToggleSelect,
  onToggleSelectAll,
  visibleIndices,
  maxHeight = 480,
  locale,
  savedProductPhotos,
  onAssignPhoto,
  onUploadPhoto,
  searchFeedbackEnabled = false,
  onSearchFeedbackExplicit,
}: ProductTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const showSelection = selectedIndices !== undefined && onToggleSelect !== undefined;
  const indicesToShow = visibleIndices ?? products.map((_, i) => i);

  const allVisibleSelected =
    showSelection &&
    indicesToShow.length > 0 &&
    indicesToShow.every((i) => selectedIndices.has(i));
  const someVisibleSelected =
    showSelection && indicesToShow.some((i) => selectedIndices.has(i));

  const handleToggleAll = () => {
    if (onToggleSelectAll) {
      onToggleSelectAll(indicesToShow, !allVisibleSelected);
      return;
    }
    if (!onToggleSelect) return;
    if (allVisibleSelected) {
      for (const i of indicesToShow) onToggleSelect(i);
    } else {
      for (const i of indicesToShow) {
        if (!selectedIndices!.has(i)) onToggleSelect(i);
      }
    }
  };

  return (
    <VirtualTable
      indicesToShow={indicesToShow}
      products={products}
      showSelection={showSelection}
      selectedIndices={selectedIndices}
      onToggleSelect={onToggleSelect}
      onUpdate={onUpdate}
      onRemove={onRemove}
      allVisibleSelected={allVisibleSelected}
      someVisibleSelected={someVisibleSelected}
      handleToggleAll={handleToggleAll}
      scrollRef={scrollRef}
      maxHeight={maxHeight}
      locale={locale}
      savedProductPhotos={savedProductPhotos}
      onAssignPhoto={onAssignPhoto}
      onUploadPhoto={onUploadPhoto}
      searchFeedbackEnabled={searchFeedbackEnabled}
      onSearchFeedbackExplicit={onSearchFeedbackExplicit}
    />
  );
}

/* ─── inner component so hooks run unconditionally ───────────────────────── */

interface VirtualTableProps {
  indicesToShow: number[];
  products: ProductItem[];
  showSelection: boolean;
  selectedIndices?: Set<number>;
  onToggleSelect?: (index: number) => void;
  onUpdate: (index: number, field: keyof ProductItem, value: string) => void;
  onRemove: (index: number) => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  handleToggleAll: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  maxHeight: number;
  locale?: string;
  savedProductPhotos?: SavedProductPhotoEntry[];
  onAssignPhoto?: (index: number, dataUri: string) => void;
  onUploadPhoto?: (index: number, file: File) => void;
  searchFeedbackEnabled?: boolean;
  onSearchFeedbackExplicit?: (index: number, relevant: boolean) => void;
}

function VirtualTable({
  indicesToShow,
  products,
  showSelection,
  selectedIndices,
  onToggleSelect,
  onUpdate,
  onRemove,
  allVisibleSelected,
  someVisibleSelected,
  handleToggleAll,
  scrollRef,
  maxHeight,
  locale,
  savedProductPhotos,
  onAssignPhoto,
  onUploadPhoto,
  searchFeedbackEnabled = false,
  onSearchFeedbackExplicit,
}: VirtualTableProps) {
  const rowVirtualizer = useVirtualizer({
    count: indicesToShow.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 10,
  });

  const [openPicker, setOpenPicker] = useState<{ index: number; rect: DOMRect } | null>(null);

  const showPhotoColumn = onAssignPhoto !== undefined;
  const showSearchFeedbackColumn =
    Boolean(searchFeedbackEnabled) && onSearchFeedbackExplicit !== undefined;

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalVirtualHeight = rowVirtualizer.getTotalSize();

  /**
   * jsdom (vitest / unit tests) has no layout engine — scroll containers
   * report clientHeight = 0, so the virtualizer returns zero virtual items.
   * When that happens we fall back to rendering all visible rows directly,
   * which keeps every existing test green without any mocking required.
   */
  const useFallback = virtualItems.length === 0 && indicesToShow.length > 0;

  const paddingTop = useFallback || virtualItems.length === 0 ? 0 : virtualItems[0].start;
  const paddingBottom =
    useFallback || virtualItems.length === 0
      ? 0
      : totalVirtualHeight - virtualItems[virtualItems.length - 1].end;

  const rowsToRender = useFallback
    ? indicesToShow.map((productIdx, position) => ({ productIdx, position }))
    : virtualItems.map((vItem: any) => ({
        productIdx: indicesToShow[vItem.index]!,
        position: vItem.index,
      }));

  // colSpan for spacer rows
  const baseColCount = 7; // #, Code, Name, Price, Wholesale, Category, Remove
  const totalColCount =
    baseColCount +
    (showSelection ? 1 : 0) +
    (showPhotoColumn ? 1 : 0) +
    (showSearchFeedbackColumn ? 1 : 0);

  return (
    <div
      ref={scrollRef}
      data-testid="product-table-scroll"
      style={{ maxHeight: maxHeight === Infinity ? undefined : maxHeight, overflowY: 'auto' }}
      className="rounded-lg border border-white/10"
    >
      <table className="w-full text-left text-sm" data-testid="product-table">
        {/* ─── sticky header ─────────────────────────────────────────────── */}
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-white/10 bg-[#0f0f10] text-xs font-semibold uppercase tracking-widest text-gray-500">
            {showSelection && (
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  data-testid="select-all-checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={handleToggleAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-white/5 accent-orange-500"
                />
              </th>
            )}
            <th className="px-3 py-2">#</th>
            {showPhotoColumn && (
              <th className="px-2 py-2 w-12 text-center">Photo</th>
            )}
            {showSearchFeedbackColumn && (
              <th className="px-1 py-2 w-16 text-center" title="Relevance vs last agent catalog search">
                Match
              </th>
            )}
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Price (Retail)</th>
            <th className="px-3 py-2">Price (Wholesale)</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2 w-10" />
          </tr>
        </thead>

        {/* ─── virtualised body ──────────────────────────────────────────── */}
        <tbody>
          {/* top spacer — fills the virtual space above rendered window */}
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingTop }} colSpan={totalColCount} />
            </tr>
          )}

          {rowsToRender.map(({ productIdx: i }: any) => {
            const product = products[i];
            if (!product) return null;
            const isSelected = showSelection && selectedIndices!.has(i);
            return (
              <tr
                key={i}
                data-testid={`product-row-${i}`}
                style={{ height: ROW_HEIGHT_ESTIMATE }}
                className={`border-b border-white/5 last:border-0 transition-colors ${
                  showSelection && isSelected
                    ? 'bg-orange-500/5 hover:bg-orange-500/10'
                    : showSelection && !isSelected
                      ? 'opacity-50 hover:bg-white/5'
                      : 'hover:bg-white/5'
                }`}
              >
                {showSelection && (
                  <td className="px-2 py-1">
                    <input
                      type="checkbox"
                      data-testid={`product-select-${i}`}
                      checked={isSelected}
                      onChange={() => onToggleSelect!(i)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-white/5 accent-orange-500"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>

                {/* ─── Photo cell (STORY-55) ─────────────────────────────── */}
                {showPhotoColumn && (
                  <td className="px-2 py-1 text-center relative">
                    <button
                      type="button"
                      data-testid={`product-photo-btn-${i}`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setOpenPicker((prev) =>
                          prev?.index === i ? null : { index: i, rect },
                        );
                      }}
                      className="group relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/5 transition hover:border-orange-500/40"
                      title={product.imageDataUri ? 'Replace photo' : 'Add photo'}
                    >
                      {product.imageDataUri ? (
                        <>
                          <img
                            src={product.imageDataUri}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                            Change
                          </span>
                        </>
                      ) : (
                        <Camera className="h-3.5 w-3.5 text-gray-500 transition group-hover:text-orange-400" />
                      )}
                    </button>

                    {openPicker?.index === i && (
                      <PhotoPickerPopover
                        productIndex={i}
                        productName={product.name}
                        productCode={product.code}
                        productPrice={product.retailPrice ?? product.price}
                        savedPhotos={savedProductPhotos ?? []}
                        onAssign={(dataUri) => {
                          onAssignPhoto?.(i, dataUri);
                          setOpenPicker(null);
                        }}
                        onUploadAndSave={(file) => {
                          onUploadPhoto?.(i, file);
                          setOpenPicker(null);
                        }}
                        onClose={() => setOpenPicker(null)}
                        anchorRect={openPicker?.rect}
                      />
                    )}
                  </td>
                )}

                {showSearchFeedbackColumn && (
                  <td className="px-1 py-1 text-center align-middle">
                    {isSelected ? (
                      <div className="inline-flex gap-0.5">
                        <button
                          type="button"
                          data-testid={`search-feedback-up-${i}`}
                          title="Relevant for last agent search"
                          className="rounded p-0.5 text-gray-500 hover:bg-emerald-500/15 hover:text-emerald-400"
                          onClick={() => onSearchFeedbackExplicit!(i, true)}
                        >
                          <ThumbsUp className="h-3 w-3" aria-hidden />
                        </button>
                        <button
                          type="button"
                          data-testid={`search-feedback-down-${i}`}
                          title="Not relevant for last agent search"
                          className="rounded p-0.5 text-gray-500 hover:bg-amber-500/15 hover:text-amber-400"
                          onClick={() => onSearchFeedbackExplicit!(i, false)}
                        >
                          <ThumbsDown className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                )}

                <td className="px-3 py-1">
                  <input
                    data-testid={`product-code-${i}`}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm text-gray-200 placeholder:text-gray-600 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                    value={product.code ?? ''}
                    onChange={(e) => onUpdate(i, 'code', e.target.value)}
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    data-testid={`product-name-${i}`}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-gray-200 placeholder:text-gray-600 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                    value={product.name}
                    onChange={(e) => onUpdate(i, 'name', e.target.value)}
                    placeholder="Product name"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    data-testid={`product-price-${i}`}
                    className="w-24 rounded border border-transparent bg-transparent px-1 py-1 text-sm text-gray-200 placeholder:text-gray-600 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                    value={
                      locale
                        ? formatPrice(product.retailPrice ?? product.price ?? '', { locale })
                        : (product.retailPrice ?? product.price ?? '')
                    }
                    onChange={(e) => {
                      onUpdate(i, 'price', e.target.value);
                      onUpdate(i, 'retailPrice', e.target.value);
                    }}
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    data-testid={`product-wholesale-${i}`}
                    className="w-24 rounded border border-transparent bg-transparent px-1 py-1 text-sm text-gray-200 placeholder:text-gray-600 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                    value={
                      locale
                        ? formatPrice(product.wholesalePrice ?? '', { locale })
                        : (product.wholesalePrice ?? '')
                    }
                    onChange={(e) => onUpdate(i, 'wholesalePrice', e.target.value)}
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    data-testid={`product-category-${i}`}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm text-gray-200 placeholder:text-gray-600 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                    value={product.category ?? ''}
                    onChange={(e) => onUpdate(i, 'category', e.target.value)}
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-1 text-center">
                  <button
                    data-testid={`product-remove-${i}`}
                    onClick={() => onRemove(i)}
                    className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Remove product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}

          {/* bottom spacer — fills the virtual space below rendered window */}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingBottom }} colSpan={totalColCount} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
