/**
 * KlingEnhanceProductImages
 *
 * Provides per-product and batch "Enhance with AI" buttons in the Export panel.
 * Uses Kling Kolors to:
 *   - Improve existing product images (image-to-image: studio background, better lighting)
 *   - Generate missing product images (text-to-image from name/category/brand)
 *
 * Includes an interactive style selector: Studio / Lifestyle / Minimal.
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
  /** Initial style preset — user can change it in the UI */
  style?: 'studio' | 'lifestyle' | 'minimal';
};

type StyleOption = {
  id: 'studio' | 'lifestyle' | 'minimal';
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

function isExternalUrl(uri?: string): boolean {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}

export default function KlingEnhanceProductImages({
  products,
  onAssignImage,
  style: initialStyle = 'studio',
}: KlingEnhanceProductImagesProps) {
  const [selectedStyle, setSelectedStyle] = useState<'studio' | 'lifestyle' | 'minimal'>(initialStyle);
  const [productStates, setProductStates] = useState<Record<number, ProductState>>({});
  const [batchLoading, setBatchLoading] = useState(false);

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });
  const isConfigured = health.data?.configured === true;

  const enhance = trpc.kling.enhanceProductImage.useMutation();

  const setProductState = useCallback((index: number, state: ProductState) => {
    setProductStates((prev) => ({ ...prev, [index]: state }));
  }, []);

  const enhanceSingle = useCallback(
    async (index: number, styleOverride?: 'studio' | 'lifestyle' | 'minimal') => {
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
          style: styleOverride ?? selectedStyle,
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
    [products, enhance, onAssignImage, selectedStyle, setProductState],
  );

  const enhanceAll = useCallback(async () => {
    if (batchLoading || products.length === 0) return;
    setBatchLoading(true);
    toast.message('Enhancing all product images…', {
      description: `Processing ${products.length} product${products.length !== 1 ? 's' : ''} — ${selectedStyle} style`,
    });
    // Sequential to avoid Kling rate limits
    for (let i = 0; i < products.length; i++) {
      if (productStates[i] === 'done') continue; // skip already enhanced
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
        {/* Active style description */}
        <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">
          {STYLE_OPTIONS.find((o) => o.id === selectedStyle)?.description}
        </p>
      </div>

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
        {allDone
          ? 'All enhanced ✓'
          : batchLoading
          ? 'Enhancing…'
          : `Enhance all ${products.length} image${products.length !== 1 ? 's' : ''}`}
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
                {hasImage ? (
                  <img
                    src={product.imageDataUri}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    referrerPolicy={isExternal ? 'no-referrer' : undefined}
                  />
                ) : (
                  <span className="text-[8px] text-gray-600">No img</span>
                )}
              </div>

              {/* Product name + hint */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-gray-300">{product.name}</p>
                <p className="text-[9px] text-gray-600">
                  {state === 'done'
                    ? '✓ Enhanced'
                    : state === 'error'
                    ? '✗ Failed — click to retry'
                    : hasImage && isExternal
                    ? 'will enhance with studio bg'
                    : hasImage
                    ? 'will generate (local img)'
                    : 'will generate from name'}
                </p>
              </div>

              {/* Status / Action */}
              <div className="flex shrink-0 items-center gap-1">
                {state === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                ) : state === 'done' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <button
                      type="button"
                      onClick={() => enhanceSingle(index)}
                      title="Re-generate"
                      className="rounded p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </>
                ) : state === 'error' ? (
                  <button
                    type="button"
                    onClick={() => enhanceSingle(index)}
                    title="Retry"
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Retry
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => enhanceSingle(index)}
                    disabled={!isConfigured || anyLoading}
                    title={hasImage ? 'Enhance this image' : 'Generate image'}
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
                  >
                    {hasImage ? 'Enhance' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
