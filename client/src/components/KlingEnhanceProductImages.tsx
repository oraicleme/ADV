/**
 * KlingEnhanceProductImages
 *
 * Provides per-product and batch "Enhance with AI" buttons in the Export panel.
 * Uses Kling Kolors to:
 *   - Improve existing product images (image-to-image: studio background, better lighting)
 *   - Generate missing product images (text-to-image from name/category/brand)
 *
 * Re-generate behaviour:
 *   - Enhanced image URLs are tracked locally (not just via the products prop)
 *   - Thumbnail updates immediately after each generation
 *   - Re-generate uses the latest enhanced URL as the reference image (iterative refinement)
 *   - Previous versions are kept in a per-product history; user can revert to any of them
 *   - Style used for each version is recorded and shown on hover
 *
 * Cost: ~$0.028 per image (Kling Kolors 1K resolution).
 */
import React, { useState, useCallback, useRef } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '../lib/trpc';

export type EnhanceableProduct = {
  name: string;
  category?: string;
  brand?: string;
  /** Existing image URL (http/https) — if present, triggers image-to-image enhancement */
  imageDataUri?: string;
};

export type KlingEnhanceProductImagesProps = {
  products: EnhanceableProduct[];
  /** Called when an enhanced/generated image is ready; update product at index with the URL */
  onAssignImage: (productIndex: number, imageUrl: string) => void;
  /** Initial style preset — user can change it in the UI */
  style?: 'studio' | 'lifestyle' | 'minimal';
};

type StyleId = 'studio' | 'lifestyle' | 'minimal';

type StyleOption = {
  id: StyleId;
  label: string;
  description: string;
  icon: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'studio',
    label: 'Studio',
    description: 'Clean white background, soft box lighting, commercial quality',
    icon: '🏢',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    description: 'Natural environment, warm ambient light, editorial feel',
    icon: '🌿',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Pure white, flat lay, soft diffused shadows',
    icon: '◻',
  },
];

type ProductState = 'idle' | 'loading' | 'done' | 'error';

/** One entry in a product's generation history */
type HistoryEntry = {
  imageUrl: string;
  style: StyleId;
  wasEnhancement: boolean;
  timestamp: number;
};

function isExternalUrl(uri?: string): boolean {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}

export default function KlingEnhanceProductImages({
  products,
  onAssignImage,
  style: initialStyle = 'studio',
}: KlingEnhanceProductImagesProps) {
  const [selectedStyle, setSelectedStyle] = useState<StyleId>(initialStyle);
  const [productStates, setProductStates] = useState<Record<number, ProductState>>({});
  const [batchLoading, setBatchLoading] = useState(false);

  /**
   * Per-product generation history.
   * history[i] = array of HistoryEntry, newest last.
   * historyPointer[i] = index of the currently displayed version (defaults to last).
   */
  const [history, setHistory] = useState<Record<number, HistoryEntry[]>>({});
  const [historyPointer, setHistoryPointer] = useState<Record<number, number>>({});

  /**
   * Ref to always-current versions of products and history so callbacks
   * never capture stale closure values.
   */
  const productsRef = useRef(products);
  productsRef.current = products;
  const historyRef = useRef(history);
  historyRef.current = history;

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });
  const isConfigured = health.data?.configured === true;

  const enhance = trpc.kling.enhanceProductImage.useMutation();

  const setProductState = useCallback((index: number, state: ProductState) => {
    setProductStates((prev) => ({ ...prev, [index]: state }));
  }, []);

  /**
   * Get the image URL to use as reference for the next generation.
   * Priority: latest entry in history (most recently generated) → original product URL.
   */
  const getLatestImageUrl = useCallback((index: number): string | undefined => {
    const entries = historyRef.current[index];
    if (entries && entries.length > 0) {
      return entries[entries.length - 1]!.imageUrl;
    }
    const product = productsRef.current[index];
    return isExternalUrl(product?.imageDataUri) ? product!.imageDataUri : undefined;
  }, []);

  /**
   * Core enhancement function.
   * Always uses the latest generated URL (or original) as the reference image.
   * Appends the result to this product's history and updates the canvas.
   */
  const enhanceSingle = useCallback(
    async (index: number, styleOverride?: StyleId) => {
      const product = productsRef.current[index];
      if (!product) return;

      const styleToUse = styleOverride ?? selectedStyle;
      setProductState(index, 'loading');

      try {
        // Use the most recently generated image as the reference (iterative refinement)
        const existingImageUrl = getLatestImageUrl(index);

        const result = await enhance.mutateAsync({
          name: product.name,
          category: product.category,
          brand: product.brand,
          existingImageUrl,
          aspectRatio: '1:1',
          style: styleToUse,
        });

        // Append to history
        const entry: HistoryEntry = {
          imageUrl: result.imageUrl,
          style: styleToUse,
          wasEnhancement: result.wasEnhancement,
          timestamp: Date.now(),
        };
        setHistory((prev) => {
          const existing = prev[index] ?? [];
          return { ...prev, [index]: [...existing, entry] };
        });
        // Always point to the newest entry
        setHistoryPointer((prev) => {
          const newLen = (historyRef.current[index]?.length ?? 0) + 1;
          return { ...prev, [index]: newLen - 1 };
        });

        // Push to canvas
        onAssignImage(index, result.imageUrl);
        setProductState(index, 'done');

        toast.success(
          result.wasEnhancement ? 'Image enhanced' : 'Image generated',
          { description: `${product.name.slice(0, 40)} — ${styleToUse}` },
        );
      } catch (err) {
        setProductState(index, 'error');
        const msg = err instanceof Error ? err.message : 'Enhancement failed';
        toast.error('Kling enhancement failed', { description: msg.slice(0, 120) });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enhance, onAssignImage, selectedStyle, setProductState, getLatestImageUrl],
  );

  /** Navigate history for a product and push the selected version to the canvas */
  const navigateHistory = useCallback(
    (index: number, direction: 'prev' | 'next') => {
      const entries = historyRef.current[index];
      if (!entries || entries.length === 0) return;
      setHistoryPointer((prev) => {
        const current = prev[index] ?? entries.length - 1;
        const next =
          direction === 'prev'
            ? Math.max(0, current - 1)
            : Math.min(entries.length - 1, current + 1);
        if (next !== current) {
          // Push the selected historical version to the canvas
          onAssignImage(index, entries[next]!.imageUrl);
        }
        return { ...prev, [index]: next };
      });
    },
    [onAssignImage],
  );

  const enhanceAll = useCallback(async () => {
    if (batchLoading || products.length === 0) return;
    setBatchLoading(true);
    toast.message('Enhancing all product images…', {
      description: `Processing ${products.length} product${products.length !== 1 ? 's' : ''} — ${selectedStyle} style`,
    });
    for (let i = 0; i < products.length; i++) {
      // Skip only if already done AND not re-running
      if (productStates[i] === 'loading') continue;
      await enhanceSingle(i, selectedStyle);
    }
    setBatchLoading(false);
    toast.success('All images enhanced', { description: 'Canvas updated with AI-enhanced product photos.' });
  }, [batchLoading, products, productStates, enhanceSingle, selectedStyle]);

  if (!isConfigured && health.data) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-[10px] text-amber-200">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Kling not configured — set <code className="text-amber-100">KLING_ACCESS_KEY</code> and{' '}
          <code className="text-amber-100">KLING_SECRET_KEY</code> to enable AI image enhancement.
        </span>
      </div>
    );
  }

  if (products.length === 0) return null;

  const anyLoading = batchLoading || Object.values(productStates).some((s) => s === 'loading');
  const allDone = products.every((_, i) => productStates[i] === 'done');

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      {/* Header */}
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          AI Image Enhancement
        </span>
        <span className="ml-auto rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-medium text-violet-400">
          ~$0.03/image
        </span>
      </div>

      {/* Style selector */}
      <div className="mb-3">
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-gray-500">
          Photo Style
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {STYLE_OPTIONS.map((opt) => {
            const isActive = selectedStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedStyle(opt.id)}
                disabled={anyLoading}
                title={opt.description}
                className="flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-all disabled:opacity-50"
                style={{
                  borderColor: isActive ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255,255,255,0.08)',
                  background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                  cursor: anyLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="text-base leading-none">{opt.icon}</span>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: isActive ? '#c4b5fd' : '#9ca3af' }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">
          {STYLE_OPTIONS.find((o) => o.id === selectedStyle)?.description}
        </p>
      </div>

      {/* Batch button */}
      <button
        type="button"
        onClick={enhanceAll}
        disabled={anyLoading || !isConfigured}
        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors disabled:opacity-50"
        style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}
      >
        {batchLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {batchLoading
          ? 'Enhancing…'
          : allDone
          ? `Re-enhance all ${products.length} images`
          : `Enhance all ${products.length} image${products.length !== 1 ? 's' : ''}`}
      </button>

      {/* Per-product list */}
      <div className="space-y-1.5">
        {products.map((product, index) => {
          const state = productStates[index] ?? 'idle';
          const entries = history[index] ?? [];
          const pointer = historyPointer[index] ?? entries.length - 1;
          const currentEntry = entries[pointer];
          const hasHistory = entries.length > 0;

          // Thumbnail: use the currently pointed-to history entry, else original
          const thumbUrl = currentEntry?.imageUrl ?? product.imageDataUri;
          const thumbIsExternal = isExternalUrl(thumbUrl);
          const hasThumb = Boolean(thumbUrl);

          const hasOriginalImage = Boolean(product.imageDataUri);
          const originalIsExternal = isExternalUrl(product.imageDataUri);

          return (
            <div
              key={index}
              className="rounded-md bg-white/[0.03] px-2.5 py-2"
            >
              <div className="flex items-center gap-2">
                {/* Thumbnail */}
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-white/10 flex items-center justify-center">
                  {hasThumb ? (
                    <img
                      src={thumbUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      referrerPolicy={thumbIsExternal ? 'no-referrer' : undefined}
                    />
                  ) : (
                    <span className="text-[8px] text-gray-600">No img</span>
                  )}
                  {/* "Enhanced" overlay badge on thumbnail */}
                  {hasHistory && (
                    <div className="absolute bottom-0 right-0 rounded-tl bg-violet-600/80 px-0.5 py-px text-[7px] font-bold text-white leading-none">
                      AI
                    </div>
                  )}
                </div>

                {/* Product name + status */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium text-gray-300">{product.name}</p>
                  <p className="text-[9px] text-gray-600">
                    {state === 'loading'
                      ? 'Generating…'
                      : state === 'error'
                      ? '✗ Failed — click Retry'
                      : hasHistory
                      ? `v${entries.length} · ${currentEntry?.style ?? selectedStyle} style`
                      : hasOriginalImage && originalIsExternal
                      ? 'will enhance with studio bg'
                      : hasOriginalImage
                      ? 'will generate (local img)'
                      : 'will generate from name'}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-1">
                  {state === 'loading' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  ) : state === 'error' ? (
                    <button
                      type="button"
                      onClick={() => enhanceSingle(index)}
                      title="Retry"
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Retry
                    </button>
                  ) : hasHistory ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => enhanceSingle(index)}
                        disabled={anyLoading}
                        title={`Re-generate with ${selectedStyle} style`}
                        className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Redo
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => enhanceSingle(index)}
                      disabled={!isConfigured || anyLoading}
                      title={hasOriginalImage ? 'Enhance this image' : 'Generate image'}
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
                    >
                      {hasOriginalImage ? 'Enhance' : 'Generate'}
                    </button>
                  )}
                </div>
              </div>

              {/* History navigation — only shown when there are multiple versions */}
              {entries.length > 1 && (
                <div className="mt-1.5 flex items-center gap-1.5 pl-11">
                  <button
                    type="button"
                    onClick={() => navigateHistory(index, 'prev')}
                    disabled={pointer === 0}
                    title="Previous version"
                    className="rounded p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-[9px] text-gray-500">
                    v{pointer + 1} / {entries.length}
                    {currentEntry && (
                      <span className="ml-1 text-gray-600">· {currentEntry.style}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateHistory(index, 'next')}
                    disabled={pointer === entries.length - 1}
                    title="Next version"
                    className="rounded p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <span className="ml-auto text-[9px] text-gray-600">
                    {pointer === entries.length - 1 ? 'latest' : 'tap ‹ › to switch · canvas updates live'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
