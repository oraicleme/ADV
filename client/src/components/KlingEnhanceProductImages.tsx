/**
 * KlingEnhanceProductImages
 *
 * Provides per-product and batch "Enhance with AI" buttons in the canvas product panel.
 * Uses Kling Kolors to:
 *   - Improve existing product images (image-to-image: studio background, better lighting)
 *   - Generate missing product images (text-to-image from name/category/brand)
 *
 * Results are fed back via onAssignImage(productIndex, imageUrl), which updates
 * the canvas product's imageDataUri and causes an instant re-render.
 *
 * Cost: ~$0.028 per image (Kling Kolors 1K resolution).
 */
import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
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
  /** Style preset for all generations */
  style?: 'studio' | 'lifestyle' | 'minimal';
};

type ProductState = 'idle' | 'loading' | 'done' | 'error';

function isExternalUrl(uri?: string): boolean {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}

export default function KlingEnhanceProductImages({
  products,
  onAssignImage,
  style = 'studio',
}: KlingEnhanceProductImagesProps) {
  const [productStates, setProductStates] = useState<Record<number, ProductState>>({});
  const [batchLoading, setBatchLoading] = useState(false);

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });
  const isConfigured = health.data?.configured === true;

  const enhance = trpc.kling.enhanceProductImage.useMutation();

  const setProductState = useCallback((index: number, state: ProductState) => {
    setProductStates((prev) => ({ ...prev, [index]: state }));
  }, []);

  const enhanceSingle = useCallback(
    async (index: number) => {
      const product = products[index];
      if (!product) return;
      setProductState(index, 'loading');
      try {
        const existingImageUrl = isExternalUrl(product.imageDataUri) ? product.imageDataUri : undefined;
        const result = await enhance.mutateAsync({
          name: product.name,
          category: product.category,
          brand: product.brand,
          existingImageUrl,
          aspectRatio: '1:1',
          style,
        });
        onAssignImage(index, result.imageUrl);
        setProductState(index, 'done');
        toast.success(
          result.wasEnhancement ? 'Image enhanced' : 'Image generated',
          { description: product.name.slice(0, 50) },
        );
      } catch (err) {
        setProductState(index, 'error');
        const msg = err instanceof Error ? err.message : 'Enhancement failed';
        toast.error('Kling enhancement failed', { description: msg.slice(0, 120) });
      }
    },
    [products, enhance, onAssignImage, style, setProductState],
  );

  const enhanceAll = useCallback(async () => {
    if (batchLoading || products.length === 0) return;
    setBatchLoading(true);
    toast.message('Enhancing all product images…', {
      description: `Processing ${products.length} product${products.length !== 1 ? 's' : ''} with Kling AI`,
    });
    // Sequential to avoid Kling rate limits
    for (let i = 0; i < products.length; i++) {
      if (productStates[i] === 'done') continue; // skip already enhanced
      await enhanceSingle(i);
    }
    setBatchLoading(false);
    toast.success('All images enhanced', { description: 'Canvas updated with AI-enhanced product photos.' });
  }, [batchLoading, products, productStates, enhanceSingle]);

  if (!isConfigured && health.data) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-[10px] text-amber-200">
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
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
            AI Image Enhancement
          </span>
        </div>
        {/* Style selector */}
        <select
          value={style}
          onChange={() => {}} // controlled by parent — shown as read-only indicator
          className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-400 border border-white/10 cursor-default"
          title="Style preset"
          disabled
        >
          <option value="studio">Studio</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>

      <p className="mb-2.5 text-[10px] leading-relaxed text-gray-500">
        Kling AI generates professional product photos. Existing images get a clean studio
        background; missing images are generated from the product name. ~$0.03/image.
      </p>

      {/* Batch button */}
      <button
        type="button"
        onClick={enhanceAll}
        disabled={anyLoading || !isConfigured || allDone}
        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors disabled:opacity-50"
        style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}
      >
        {batchLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {allDone ? 'All enhanced ✓' : batchLoading ? 'Enhancing…' : `Enhance all ${products.length} images`}
      </button>

      {/* Per-product list */}
      <div className="space-y-1.5">
        {products.map((product, index) => {
          const state = productStates[index] ?? 'idle';
          const hasImage = Boolean(product.imageDataUri);
          const isExternal = isExternalUrl(product.imageDataUri);

          return (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md bg-white/[0.03] px-2.5 py-1.5"
            >
              {/* Thumbnail */}
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-white/10 flex items-center justify-center">
                {hasImage && isExternal ? (
                  <img
                    src={product.imageDataUri}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : hasImage ? (
                  <img
                    src={product.imageDataUri}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[8px] text-gray-600">No img</span>
                )}
              </div>

              {/* Product name */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-gray-300">{product.name}</p>
                <p className="text-[9px] text-gray-600">
                  {hasImage
                    ? isExternal
                      ? '→ will enhance (studio bg)'
                      : '→ will generate (local img)'
                    : '→ will generate from name'}
                </p>
              </div>

              {/* Status / Action */}
              <div className="shrink-0">
                {state === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                ) : state === 'done' ? (
                  <button
                    type="button"
                    onClick={() => enhanceSingle(index)}
                    title="Re-generate"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                ) : state === 'error' ? (
                  <button
                    type="button"
                    onClick={() => enhanceSingle(index)}
                    title="Retry"
                    className="text-red-400 hover:text-red-300"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => enhanceSingle(index)}
                    disabled={!isConfigured}
                    title={hasImage ? 'Enhance image' : 'Generate image'}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
                  >
                    {hasImage ? 'Enhance' : 'Generate'}
                  </button>
                )}
              </div>

              {/* Done indicator */}
              {state === 'done' && (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
