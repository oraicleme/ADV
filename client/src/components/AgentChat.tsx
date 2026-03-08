import React, { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  ChevronDown,
  Search,
  Sparkles,
  ImageIcon,
  BookmarkPlus,
  FolderOpen,
  Trash2,
  Clock,
  Maximize2,
  Pencil,
  Eye,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import AdCanvasEditor from './AdCanvasEditor';
import { Badge } from './ui/badge';
import type { AgentConfig } from '../data/agents';
import type { WebImageSelection } from './WebImageSearch';
import LayoutPicker from './LayoutPicker';
import FormatPicker from './FormatPicker';
import StyleCustomizer from './StyleCustomizer';
import { fileToBase64DataUri } from '../lib/file-to-base64';
import { getProductImages, isMobilelandImageEnabled } from '../lib/mobileland-images';
import { renderAdTemplate } from '../lib/ad-templates';
import {
  FORMAT_PRESETS,
  DEFAULT_STYLE,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_ELEMENT_ORDER,
  DEFAULT_LOGO_HEIGHT,
  DEFAULT_PRODUCT_IMAGE_HEIGHT,
  DEFAULT_PRODUCT_BLOCK_OPTIONS,
  HEADER_BRAND_LOGO_MAX_COUNT,
  type AdElementKey,
  type ProductBlockOptions,
} from '../lib/ad-constants';
import { getAdCopyModels, getVisionModels } from '../lib/ionet-models';
import {
  buildAdCopyPrompt,
  parseAdCopyResponse,
  buildVisionPromptForProduct,
} from '../lib/ad-prompts';
import {
  logRetailPromoEvent,
  logRetailPromoError,
  getSessionLogs,
  copySessionLogsToClipboard,
  downloadSessionLogs,
} from '../lib/retail-promo-log';
import {
  getSavedLogos,
  saveLogo,
  removeSavedLogo,
  isSavedLogosFull,
  type SavedLogoEntry,
} from '../lib/saved-logos';
import {
  getSavedBrandLogos,
  saveBrandLogo,
  removeSavedBrandLogo,
  isSavedBrandLogosFull,
  updateBrandLogoTags,
  type SavedBrandLogoEntry,
} from '../lib/saved-brand-logos';
import {
  getSavedCreatives,
  saveCreative,
  removeCreative,
  type SavedCreative,
} from '../lib/saved-creatives';
import {
  getSavedProductPhotos,
  saveProductPhoto,
  removeSavedProductPhoto,
  isSavedProductPhotosFull,
  type SavedProductPhotoEntry,
} from '../lib/saved-product-photos';
import type { ProductItem } from '../lib/ad-constants';
import type { FormatPreset, LayoutId, StyleOptions } from '../lib/ad-layouts/types';
import type { LogoEntry } from '../lib/logo-utils';
import type { ImageEntry } from './ProductImageUploader';
import { serializeCanvasState, type AdCanvasState, type CatalogSummary } from '../lib/ad-canvas-ai';
import { analyzeProductImages, type ProductImageAnalysis } from '../lib/product-vision-analyzer';
import {
  sendChatMessage,
  requestProactiveSuggestion,
  type ConversationMessage,
  type ChatModelMode,
} from '../lib/agent-chat-engine';
import { applyAgentActions, type AgentAction } from '../lib/agent-actions';
import { GeneratingNoiseOverlay } from './GeneratingNoiseOverlay';
import { requestMultiAgentSuggestions } from '../lib/multi-agent-suggestions';
import { requestMultiAgentSuggestionsFromAPI } from '../lib/multi-agent-suggestions-api';
import MultiAgentSuggestionPanel from './MultiAgentSuggestionPanel';
import type { MultiAgentSuggestion } from '../lib/multi-agent-suggestions';
import { trpc } from '../lib/trpc';

const isRetailPromo = (agent: AgentConfig) => agent.id === 'retail-promo';

const LogoUploader = lazy(() => import('./LogoUploader'));
const ProductDataInput = lazy(() => import('./ProductDataInput'));
const WebImageSearch = lazy(() => import('./WebImageSearch'));
const HtmlPreview = lazy(() => import('./HtmlPreview'));
const AdPreviewFrameLazy = lazy(() =>
  import('./HtmlPreview').then((m) => ({ default: m.AdPreviewFrame })),
);
const AdPreviewActionsLazy = lazy(() =>
  import('./HtmlPreview').then((m) => ({ default: m.AdPreviewActions })),
);
const AdPreviewEnlargedModalLazy = lazy(() =>
  import('./HtmlPreview').then((m) => ({ default: m.AdPreviewEnlargedModal })),
);

const colorMap = {
  orange: {
    badge: 'bg-orange-100 text-orange-800',
    stepBorder: 'border-orange-200',
    stepNumber: 'bg-orange-500 text-white',
    gradient: 'from-orange-500 to-amber-500',
    button: 'bg-orange-500 hover:bg-orange-600',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-800',
    stepBorder: 'border-blue-200',
    stepNumber: 'bg-blue-500 text-white',
    button: 'bg-blue-500 hover:bg-blue-600',
  },
  green: {
    badge: 'bg-green-100 text-green-800',
    stepBorder: 'border-green-200',
    stepNumber: 'bg-green-500 text-white',
    button: 'bg-green-500 hover:bg-green-600',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-800',
    stepBorder: 'border-purple-200',
    stepNumber: 'bg-purple-500 text-white',
    button: 'bg-purple-500 hover:bg-purple-600',
  },
  pink: {
    badge: 'bg-pink-100 text-pink-800',
    stepBorder: 'border-pink-200',
    stepNumber: 'bg-pink-500 text-white',
    button: 'bg-pink-500 hover:bg-pink-600',
  },
};

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-orange-500/60" />
    </div>
  );
}

function EmptyPreviewState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
      <Sparkles className="mb-4 h-16 w-16 animate-pulse text-orange-500/30" />
      <p className="text-lg font-semibold bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent">
        Your ad will appear here
      </p>
      <p className="mt-2 text-sm text-gray-500">Upload products and click Generate</p>
    </div>
  );
}

interface AccordionStepProps {
  index: number;
  active: boolean;
  onToggle: () => void;
  title: string;
  summary: string;
  children: React.ReactNode;
  colors: { badge: string; stepBorder: string; stepNumber: string; gradient?: string; button: string };
  isLast?: boolean;
}

function AccordionStep({ index, active, onToggle, title, summary, children, colors, isLast }: AccordionStepProps) {
  return (
    <div className="relative">
      {!isLast && (
        <div
          className="absolute left-[19px] top-[52px] bottom-0 w-px bg-gradient-to-b from-white/20 to-transparent"
          aria-hidden
        />
      )}
      <div
        className={`overflow-hidden rounded-xl border transition-all duration-300 backdrop-blur-xl ${
          active
            ? 'border-orange-500/30 bg-white/[0.07] shadow-[0_0_20px_rgba(249,115,22,0.08)]'
            : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-gray-200">{title}</span>
            {summary && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">{summary}</span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${active ? 'rotate-180' : ''}`}
          />
        </button>
        <div
          className={`grid transition-all duration-300 ease-in-out ${active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-white/10 px-4 py-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full layout names for the Configure Ad step summary (industry-standard: layout type). */
const LAYOUT_LABELS: Record<LayoutId, string> = {
  'single-hero': 'Single Product',
  'multi-grid': 'Product Grid',
  'category-group': 'By Category',
  'sale-discount': 'Sale / Discount',
};


const PORTRAIT_CONTAINER_WIDTH = 280;

function DeviceFrame({
  format,
  children,
}: {
  format: FormatPreset;
  children: React.ReactNode;
}) {
  const isPortrait = format.height > format.width;
  if (isPortrait) {
    return (
      <div data-testid="device-frame" className="relative mx-auto w-[280px] rounded-[2rem] border-2 border-white/20 bg-black/40 p-2 shadow-2xl">
        <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-white/20" aria-hidden />
        <div className="overflow-hidden rounded-[1.5rem]">{children}</div>
        <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-white/20" aria-hidden />
      </div>
    );
  }
  return (
    <div data-testid="device-frame" className="w-full overflow-hidden rounded-lg border border-white/20 bg-black/20 shadow-2xl">
      {children}
    </div>
  );
}

export default function AgentChat({ agent }: { agent: AgentConfig }) {
  const [activeStep, setActiveStep] = useState(0);
  const [logos, setLogos] = useState<LogoEntry[]>([]);
  const [products, setProductsState] = useState<ProductItem[]>([]);
  const [selectedProductIndices, setSelectedProductIndices] = useState<Set<number>>(new Set());
  /** Indices currently visible in the product table (after search/filter). Null = not yet reported; preview shows all selected. */
  const [visibleProductIndices, setVisibleProductIndices] = useState<number[] | null>(null);
  const setProducts = useCallback(
    (next: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])) => {
      setProductsState((prev) => {
        const nextList = typeof next === 'function' ? next(prev) : next;
        if (isRetailPromo(agent)) {
          logRetailPromoEvent('product_list_change', { productCount: nextList.length });
        }
        return nextList;
      });
    },
    [agent]
  );
  const [productImages, setProductImages] = useState<ImageEntry[]>([]);
  /** Product index → image URL from mobileland.me (primary source when set) */
  const [mobilelandImageUrls, setMobilelandImageUrls] = useState<Record<number, string>>({});
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webImageSelections, setWebImageSelections] = useState<WebImageSelection>({});
  const [selectedLayout, setSelectedLayout] = useState<LayoutId>('multi-grid');
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(FORMAT_PRESETS[0]);
  const [selectedStyle, setSelectedStyle] = useState<StyleOptions>(DEFAULT_STYLE);
  /** Ad options: headline override, CTA buttons, badge, disclaimer, emoji (STORY-34/39). */
  const [adHeadline, setAdHeadline] = useState('');
  const [adTitleFontSize, setAdTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE);
  /** Multiple CTA button texts (STORY-39). Each entry is a single button label. */
  const [adCtaButtons, setAdCtaButtons] = useState<string[]>(['']);
  /** Render order of the five named ad blocks (STORY-40). */
  const [adElementOrder, setAdElementOrder] = useState<AdElementKey[]>([...DEFAULT_ELEMENT_ORDER]);
  const [adBadgeText, setAdBadgeText] = useState('');
  const [adDisclaimerText, setAdDisclaimerText] = useState('');
  const [adEmojiOrIcon, setAdEmojiOrIcon] = useState('');
  /** Logo options: height, alignment, companion element (STORY-43). */
  const [adLogoHeight, setAdLogoHeight] = useState(DEFAULT_LOGO_HEIGHT);
  const [adLogoAlignment, setAdLogoAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [adLogoCompanion, setAdLogoCompanion] = useState<'none' | 'headline' | 'badge' | 'emoji'>('none');
  /** Per-product block options (STORY-56): columns, field visibility, image height, max products. */
  const [adProductBlockOptions, setAdProductBlockOptions] = useState(DEFAULT_PRODUCT_BLOCK_OPTIONS);
  /** Canvas pane mode: 'edit' shows WYSIWYG editor, 'preview' shows rendered HTML (STORY-44). */
  const [canvasMode, setCanvasMode] = useState<'edit' | 'preview'>('edit');
  /** STORY-62: Conversational AI agent chat state. */
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState<ChatModelMode>('smart');
  /** STORY-62 Phase 2: proactive suggestions on/off (default on). */
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  /**
   * Snapshot of canvas state taken before the last AI action batch — enables single-level undo.
   * Null means no undo available.
   */
  const [undoSnapshot, setUndoSnapshot] = useState<{
    headline: string;
    titleFontSize: number;
    emojiOrIcon: string;
    badgeText: string;
    ctaButtons: string[];
    disclaimerText: string;
    elementOrder: AdElementKey[];
    layout: LayoutId;
    style: StyleOptions;
    format: FormatPreset;
    logoHeight: number;
    logoAlignment: 'left' | 'center' | 'right';
    logoCompanion: 'none' | 'headline' | 'badge' | 'emoji';
    productBlockOptions: ProductBlockOptions;
    selectedProductIndices: Set<number>;
  } | null>(null);
  /** STORY-62 Phase 2: throttle proactive suggestions to max 1 per 5s. */
  const lastSuggestionTimeRef = useRef<number>(0);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  /** Multi-agent suggestion state */
  const [multiAgentSuggestions, setMultiAgentSuggestions] = useState<any>(null);
  const [multiAgentPending, setMultiAgentPending] = useState(false);
  const [multiAgentError, setMultiAgentError] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [savedCreatives, setSavedCreatives] = useState<SavedCreative[]>([]);
  const [myAdsOpen, setMyAdsOpen] = useState(false);
  const enlargeButtonRef = useRef<HTMLButtonElement | null>(null);
  /** After "Generate Ad", show this HTML (AI copy + template). Null = show live preview. */
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  /** Ref to the element that opened the enlarged preview; focus returns here on close. */
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const showPreviewButtonRef = useRef<HTMLButtonElement | null>(null);

  // Resolved data URIs for live preview (async from file inputs)
  const [companyLogoDataUri, setCompanyLogoDataUri] = useState<string | undefined>(undefined);
  /** Shown under company logo when file read fails so user can retry with another file. */
  const [companyLogoLoadError, setCompanyLogoLoadError] = useState<string | null>(null);
  /** True while reading uploaded company logo file (so we can show "Loading…"). */
  const [companyLogoLoading, setCompanyLogoLoading] = useState(false);
  /** When set, current company logo comes from this saved entry instead of upload. */
  const [selectedSavedLogoId, setSelectedSavedLogoId] = useState<string | null>(null);
  const [savedLogos, setSavedLogos] = useState<SavedLogoEntry[]>([]);
  const [savedBrandLogos, setSavedBrandLogos] = useState<SavedBrandLogoEntry[]>([]);
  const [savedToast, setSavedToast] = useState(false);
  const [brandLogoDataUris, setBrandLogoDataUris] = useState<string[]>([]);
  /** Product image URIs from uploaded files (by index). */
  const [productImageDataUrisFromUploads, setProductImageDataUrisFromUploads] = useState<string[]>([]);
  /** Product image URIs from saved library (append to ad). STORY-50. */
  const [productImageDataUrisFromSaved, setProductImageDataUrisFromSaved] = useState<{ id: string; dataUri: string }[]>([]);
  const [savedProductPhotos, setSavedProductPhotos] = useState<SavedProductPhotoEntry[]>([]);
  /** Combined product image URIs for ad (uploads then saved). */
  const productImageDataUris = useMemo(
    () => [
      ...productImageDataUrisFromUploads,
      ...productImageDataUrisFromSaved.map((x) => x.dataUri),
    ],
    [productImageDataUrisFromUploads, productImageDataUrisFromSaved],
  );

  /** STORY-68: Vision analysis result for current product set. */
  const [productImageAnalysis, setProductImageAnalysis] = useState<ProductImageAnalysis | null>(null);
  /** STORY-68: Prevents re-running vision analysis on every chat message. */
  const [imageAnalysisRan, setImageAnalysisRan] = useState(false);

  const colors = colorMap[agent.color];

  // Retail Promo: log page load once
  useEffect(() => {
    if (isRetailPromo(agent)) logRetailPromoEvent('page_load');
  }, [agent]);

  // STORY-29: Read ?preload=<base64 JSON> from URL on mount (set by control-panel chat widget).
  // Silently ignored if malformed or absent.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('preload');
      if (!raw) return;
      const decoded = JSON.parse(atob(decodeURIComponent(raw))) as {
        products?: ProductItem[];
        segment?: string;
      };
      if (Array.isArray(decoded.products) && decoded.products.length > 0) {
        setProducts(decoded.products);
        setSelectedProductIndices(new Set(decoded.products.map((_, i) => i)));
        // Remove the param from URL without page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('preload');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Malformed preload param — ignore silently
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retail Promo: log web search toggle (skip initial mount to avoid duplicate with page_load)
  const didMountRef = React.useRef(false);
  useEffect(() => {
    if (!isRetailPromo(agent)) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    logRetailPromoEvent('web_search_toggle', { enabled: webSearchEnabled });
  }, [agent, webSearchEnabled]);

  // Retail Promo: log product image upload count when images change
  useEffect(() => {
    if (!isRetailPromo(agent) || productImages.length === 0) return;
    logRetailPromoEvent('image_upload', { productCount: productImages.length });
  }, [agent, productImages.length]);

  // Load saved logos on mount (Retail Promo); STORY-46: auto-select first if none selected
  useEffect(() => {
    if (isRetailPromo(agent)) {
      const logos = getSavedLogos();
      setSavedLogos(logos);
      if (logos.length > 0) setSelectedSavedLogoId(logos[0].id);
    }
  }, [agent]);

  // Load saved brand logos on mount (Retail Promo); STORY-49
  useEffect(() => {
    if (isRetailPromo(agent)) setSavedBrandLogos(getSavedBrandLogos());
  }, [agent]);

  // Load saved product photos on mount (Retail Promo); STORY-50
  useEffect(() => {
    if (isRetailPromo(agent)) setSavedProductPhotos(getSavedProductPhotos());
  }, [agent]);

  // Load saved creatives on mount (Retail Promo)
  useEffect(() => {
    if (isRetailPromo(agent)) setSavedCreatives(getSavedCreatives());
  }, [agent]);

  useEffect(() => {
    const company = logos.find((l) => l.type === 'company');
    const brands = logos.filter((l) => l.type === 'brand');
    if (company) {
      setCompanyLogoLoadError(null);
      setCompanyLogoLoading(true);
      fileToBase64DataUri(company.file)
        .then((uri) => {
          setCompanyLogoDataUri(uri);
          setSelectedSavedLogoId(null);
          setCompanyLogoLoading(false);
        })
        .catch((err) => {
          if (isRetailPromo(agent)) logRetailPromoError(err);
          setCompanyLogoDataUri(undefined);
          setCompanyLogoLoadError('Couldn’t load image. Try another file (PNG, JPEG, WebP under 5 MB).');
          setCompanyLogoLoading(false);
        });
    } else if (!selectedSavedLogoId) {
      setCompanyLogoDataUri(undefined);
      setCompanyLogoLoadError(null);
      setCompanyLogoLoading(false);
    }
    if (brands.length === 0) setBrandLogoDataUris([]);
    else Promise.all(brands.map((l) => fileToBase64DataUri(l.file))).then(setBrandLogoDataUris).catch(() => setBrandLogoDataUris([]));
  }, [logos, selectedSavedLogoId, agent]);

  useEffect(() => {
    if (productImages.length === 0) {
      setProductImageDataUrisFromUploads([]);
      return;
    }
    Promise.all(productImages.map((img) => fileToBase64DataUri(img.file))).then(setProductImageDataUrisFromUploads);
  }, [productImages]);

  // Fetch mobileland.me images when products have codes and base URL is configured
  useEffect(() => {
    if (!isMobilelandImageEnabled() || products.length === 0) {
      setMobilelandImageUrls({});
      return;
    }
    let cancelled = false;
    const promises = products.map(async (p, i) => {
      const code = p.code?.trim();
      if (!code) return { i, url: undefined as string | undefined };
      const urls = await getProductImages(code);
      return { i, url: urls[0] };
    });
    Promise.all(promises).then((results) => {
      if (cancelled) return;
      const next: Record<number, string> = {};
      for (const { i, url } of results) {
        if (url) next[i] = url;
      }
      setMobilelandImageUrls((prev) => ({ ...prev, ...next }));
      if (isRetailPromo(agent)) {
        logRetailPromoEvent('mobileland_fetch', {
          productCount: products.length,
          resolvedCount: Object.keys(next).length,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [products, agent]);

  const productsWithImages = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < products.length; i++) {
      if (mobilelandImageUrls[i] || productImages[i] || products[i].imageDataUri) {
        set.add(i);
      }
    }
    return set;
  }, [products, productImages, mobilelandImageUrls]);

  const configSummary = useMemo(() => {
    const layout = LAYOUT_LABELS[selectedLayout];
    const format = selectedFormat.label;
    return `${layout} · ${format}…`;
  }, [selectedLayout, selectedFormat]);

  /** Current company logo: from selected saved logo or from uploaded file. */
  const currentCompanyLogoDataUri = useMemo(() => {
    if (selectedSavedLogoId) {
      const saved = savedLogos.find((s) => s.id === selectedSavedLogoId);
      return saved?.dataUri;
    }
    return companyLogoDataUri;
  }, [selectedSavedLogoId, savedLogos, companyLogoDataUri]);

  const templateProducts = useMemo((): ProductItem[] => {
    if (products.length === 0) return [];
    const visibleSet = visibleProductIndices === null ? null : new Set(visibleProductIndices);
    return products
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => selectedProductIndices.has(i) && (visibleSet === null || visibleSet.has(i)))
      .map(({ p, i }) => ({
        ...p,
        price: p.retailPrice ?? p.price,
        imageDataUri:
          mobilelandImageUrls[i] ??
          productImageDataUris[i] ??
          p.imageDataUri ??
          (webSearchEnabled ? webImageSelections[i] : undefined),
        brandLogoDataUri: brandLogoDataUris[i] ?? p.brandLogoDataUri,
      }));
  }, [products, selectedProductIndices, visibleProductIndices, mobilelandImageUrls, productImageDataUris, brandLogoDataUris, webSearchEnabled, webImageSelections]);

  // STORY-68: Reset vision analysis when products change (new import = fresh analysis).
  useEffect(() => {
    setImageAnalysisRan(false);
    setProductImageAnalysis(null);
  }, [templateProducts]);

  // STORY-69: Catalog summary — sent to agent on every message so it can answer product queries.
  const catalogSummary = useMemo((): CatalogSummary => {
    const categoryMap = new Map<string, number>();
    for (const p of products) {
      const cat = p.category ?? 'Bez klasifikacije';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    const sampleNames = products.slice(0, 15).map((p) => p.name);
    return {
      totalProducts: products.length,
      selectedCount: selectedProductIndices.size,
      categories,
      sampleNames,
    };
  }, [products, selectedProductIndices]);

  /**
   * STORY-55: original product indices corresponding to each templateProducts entry.
   * templateProductOriginalIndices[j] = index in `products` for templateProducts[j].
   * Used by AdCanvasEditor to route photo assignment back to the correct product.
   */
  const templateProductOriginalIndices = useMemo((): number[] => {
    if (products.length === 0) return [];
    const visibleSet = visibleProductIndices === null ? null : new Set(visibleProductIndices);
    return products
      .map((_, i) => i)
      .filter((i) => selectedProductIndices.has(i) && (visibleSet === null || visibleSet.has(i)));
  }, [products, selectedProductIndices, visibleProductIndices]);

  const livePreviewHtml = useMemo(() => {
    const hasAnyCta = adCtaButtons.some((b) => b.trim());
    const hasContent =
      templateProducts.length > 0 ||
      !!currentCompanyLogoDataUri ||
      !!adHeadline.trim() ||
      hasAnyCta ||
      !!adBadgeText.trim() ||
      !!adDisclaimerText.trim() ||
      !!adEmojiOrIcon.trim();
    if (!hasContent) return '';
    return renderAdTemplate({
      companyLogoDataUri: currentCompanyLogoDataUri,
      title: adHeadline.trim() || 'Your Ad',
      titleFontSize: adTitleFontSize,
      products: templateProducts,
      layout: selectedLayout,
      format: selectedFormat,
      style: selectedStyle,
      ctaButtons: adCtaButtons.filter((b) => b.trim()),
      badgeText: adBadgeText.trim() || undefined,
      disclaimerText: adDisclaimerText.trim() || undefined,
      emojiOrIcon: adEmojiOrIcon.trim() || undefined,
      elementOrder: adElementOrder,
      logoHeight: adLogoHeight,
      logoAlignment: adLogoAlignment,
      logoCompanion: adLogoCompanion,
      productBlockOptions: { ...adProductBlockOptions, imageHeight: adProductBlockOptions.imageHeight },
      headerBrandLogoDataUris: brandLogoDataUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT),
    });
  }, [
    templateProducts,
    currentCompanyLogoDataUri,
    selectedLayout,
    selectedFormat,
    selectedStyle,
    adHeadline,
    adTitleFontSize,
    adCtaButtons,
    adBadgeText,
    adDisclaimerText,
    adEmojiOrIcon,
    adElementOrder,
    adLogoHeight,
    adLogoAlignment,
    adLogoCompanion,
    adProductBlockOptions,
    brandLogoDataUris,
  ]);

  // Auto-open mobile preview modal on first content (Bug B: no feedback on narrow viewports)
  // Removed auto-open behavior - modal only opens when user clicks a button
  // const prevHasPreview = React.useRef(false);
  // useEffect(() => {
  //   if (livePreviewHtml && !prevHasPreview.current) {
  //     setMobilePreviewOpen(true);
  //   }
  //   prevHasPreview.current = Boolean(livePreviewHtml);
  // }, [livePreviewHtml]);

  // Auto-switch to Preview mode after Generate Ad completes (STORY-44)
  useEffect(() => {
    if (generatedHtml) setCanvasMode('preview');
  }, [generatedHtml]);

  // Keyboard shortcut: P toggles Edit ↔ Preview (STORY-44)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (!isInput && e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setCanvasMode((m) => (m === 'edit' ? 'preview' : 'edit'));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Dev-only: expose log helpers on window so devs can inspect via browser console.
  // Usage: window.__retailPromoLogs() / window.__copyRetailPromoLogs() / window.__downloadRetailPromoLogs()
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__retailPromoLogs = getSessionLogs;
    (window as unknown as Record<string, unknown>).__copyRetailPromoLogs = copySessionLogsToClipboard;
    (window as unknown as Record<string, unknown>).__downloadRetailPromoLogs = downloadSessionLogs;
    console.debug('[RetailPromo] Dev log helpers attached to window: __retailPromoLogs(), __copyRetailPromoLogs(), __downloadRetailPromoLogs()');
    return () => {
      delete (window as unknown as Record<string, unknown>).__retailPromoLogs;
      delete (window as unknown as Record<string, unknown>).__copyRetailPromoLogs;
      delete (window as unknown as Record<string, unknown>).__downloadRetailPromoLogs;
    };
  }, []);

  const handleSaveCreative = useCallback(() => {
    if (!isRetailPromo(agent)) return;
    const savedBrandLogoIds = brandLogoDataUris
      .map((uri) => savedBrandLogos.find((s) => s.dataUri === uri)?.id)
      .filter((id): id is string => id != null);
    const savedProductImageIds =
      productImageDataUrisFromSaved.length > 0
        ? productImageDataUrisFromSaved.map((x) => x.id)
        : undefined;
    const config = {
      products: products.map(({ imageDataUri: _img, brandLogoDataUri: _brand, ...rest }) => rest),
      headline: adHeadline,
      titleFontSize: adTitleFontSize,
      ctaButtons: adCtaButtons,
      badgeText: adBadgeText,
      disclaimerText: adDisclaimerText,
      emojiOrIcon: adEmojiOrIcon,
      elementOrder: adElementOrder,
      layout: selectedLayout,
      formatId: selectedFormat.id,
      style: selectedStyle,
      savedLogoId: selectedSavedLogoId ?? undefined,
      savedBrandLogoIds: savedBrandLogoIds.length > 0 ? savedBrandLogoIds : undefined,
      savedProductImageIds,
      productBlockOptions: adProductBlockOptions,
    };
    saveCreative(config);
    setSavedCreatives(getSavedCreatives());
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
    if (isRetailPromo(agent)) logRetailPromoEvent('creative_saved', { productCount: products.length });
  }, [agent, products, adHeadline, adTitleFontSize, adCtaButtons, adBadgeText, adDisclaimerText, adEmojiOrIcon, selectedLayout, selectedFormat, selectedStyle, selectedSavedLogoId, brandLogoDataUris, savedBrandLogos, productImageDataUrisFromSaved, adProductBlockOptions]);

  const handleLoadCreative = useCallback((creative: SavedCreative) => {
    const { config } = creative;
    setProducts(config.products);
    setSelectedProductIndices(new Set(config.products.map((_, i) => i)));
    setAdHeadline(config.headline);
    setAdTitleFontSize(config.titleFontSize ?? DEFAULT_TITLE_FONT_SIZE);
    setAdCtaButtons(config.ctaButtons.length > 0 ? config.ctaButtons : ['']);
    setAdElementOrder(config.elementOrder.length > 0 ? config.elementOrder : [...DEFAULT_ELEMENT_ORDER]);
    setAdBadgeText(config.badgeText);
    setAdDisclaimerText(config.disclaimerText);
    setAdEmojiOrIcon(config.emojiOrIcon);
    setSelectedLayout(config.layout);
    const matchedFormat = FORMAT_PRESETS.find((f) => f.id === config.formatId) ?? FORMAT_PRESETS[0];
    setSelectedFormat(matchedFormat);
    setSelectedStyle(config.style);
    setGeneratedHtml(null);
    if (config.savedLogoId) {
      const logoExists = savedLogos.some((l) => l.id === config.savedLogoId);
      if (logoExists) setSelectedSavedLogoId(config.savedLogoId);
    }
    if (config.productBlockOptions) {
      setAdProductBlockOptions(config.productBlockOptions);
    } else {
      setAdProductBlockOptions(DEFAULT_PRODUCT_BLOCK_OPTIONS);
    }
    if (config.savedBrandLogoIds?.length) {
      const brandLogos = getSavedBrandLogos();
      const uris = config.savedBrandLogoIds
        .map((id) => brandLogos.find((s) => s.id === id)?.dataUri)
        .filter((uri): uri is string => uri != null);
      setBrandLogoDataUris(uris);
    }
    if (config.savedProductImageIds?.length) {
      const productPhotos = getSavedProductPhotos();
      const fromSaved = config.savedProductImageIds
        .map((id) => {
          const entry = productPhotos.find((s) => s.id === id);
          return entry ? { id: entry.id, dataUri: entry.dataUri } : null;
        })
        .filter((x): x is { id: string; dataUri: string } => x != null);
      setProductImageDataUrisFromSaved(fromSaved);
    } else {
      setProductImageDataUrisFromSaved([]);
    }
    setCanvasMode('edit');
    if (isRetailPromo(agent)) logRetailPromoEvent('creative_loaded', { id: creative.id });
  }, [agent, savedLogos]);

  const handleDeleteCreative = useCallback((id: string) => {
    removeCreative(id);
    setSavedCreatives(getSavedCreatives());
  }, []);

  /** STORY-62: Conversational AI agent chat send handler. */
  const handleChatSend = useCallback(async (userMessage: string): Promise<void> => {
    if (!isRetailPromo(agent)) return;

    const apiKey =
      import.meta.env.VITE_IONET_API_KEY ||
      import.meta.env.PUBLIC_IONET_API_KEY ||
      import.meta.env.IO_NET_API_TOKEN ||
      import.meta.env.IONET_API_KEY;
    if (!apiKey) {
      setChatError('No API key configured. Set VITE_IONET_API_KEY in your environment.');
      return;
    }

    // Snapshot current canvas state for undo BEFORE applying any actions
    const snapshot = {
      headline: adHeadline,
      titleFontSize: adTitleFontSize,
      emojiOrIcon: adEmojiOrIcon,
      badgeText: adBadgeText,
      ctaButtons: [...adCtaButtons],
      disclaimerText: adDisclaimerText,
      elementOrder: [...adElementOrder] as AdElementKey[],
      layout: selectedLayout,
      style: { ...selectedStyle },
      format: { ...selectedFormat },
      logoHeight: adLogoHeight,
      logoAlignment: adLogoAlignment,
      logoCompanion: adLogoCompanion,
      productBlockOptions: {
        ...adProductBlockOptions,
        showFields: { ...adProductBlockOptions.showFields },
      },
      selectedProductIndices: new Set(selectedProductIndices),
    };

    // Capture history before update (closure — safe to use directly)
    const historyForApi = chatMessages;

    const userMsg: ConversationMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatPending(true);
    setChatError(null);

    try {
      // STORY-68: Run vision analysis once per product set (silent, non-blocking).
      const imageUris = templateProducts
        .map((p) => p.imageDataUri)
        .filter((uri): uri is string => !!uri)
        .slice(0, 3);

      let imageAnalysis = productImageAnalysis;
      if (!imageAnalysisRan && imageUris.length > 0) {
        setImageAnalysisRan(true);
        try {
          imageAnalysis = await analyzeProductImages(apiKey, imageUris);
          setProductImageAnalysis(imageAnalysis);
        } catch {
          // Silent failure — vision enrichment is optional
        }
      }

      const dataQuality = {
        hasAllCapsNames: templateProducts.some(
          (p) => p.name && p.name === p.name.toUpperCase() && /[A-Z]/.test(p.name),
        ),
        hasMissingPrices: templateProducts.some((p) => !p.price && !p.retailPrice),
        hasOriginalPrices: templateProducts.some((p) => !!p.originalPrice),
        hasDiscounts: templateProducts.some((p) => (p.discountPercent ?? 0) > 0),
        avgDescriptionLength:
          templateProducts.length > 0
            ? Math.round(
                templateProducts.reduce((sum, p) => sum + (p.description?.length ?? 0), 0) /
                  templateProducts.length,
              )
            : 0,
        imageAnalysis,
      };

      const canvasState: AdCanvasState = {
        headline: adHeadline,
        titleFontSize: adTitleFontSize,
        emojiOrIcon: adEmojiOrIcon,
        badgeText: adBadgeText,
        ctaButtons: adCtaButtons,
        disclaimerText: adDisclaimerText,
        elementOrder: adElementOrder,
        layout: selectedLayout,
        style: selectedStyle,
        logoHeight: adLogoHeight,
        logoAlignment: adLogoAlignment,
        logoCompanion: adLogoCompanion,
        productBlockOptions: adProductBlockOptions,
        productCount: templateProducts.length,
        format: { id: selectedFormat.id, width: selectedFormat.width, height: selectedFormat.height },
        dataQuality,
        catalogSummary,
      };

      const { message, actions } = await sendChatMessage({
        apiKey,
        model: chatModel,
        history: historyForApi,
        canvasState,
        userMessage,
      });

      // Save undo snapshot (now that we're about to apply changes)
      setUndoSnapshot(snapshot);

      // Apply all agent actions to canvas state
      if (actions.length > 0) {
        applyAgentActions(actions, {
          setHeadline: setAdHeadline,
          setTitleFontSize: setAdTitleFontSize,
          setEmojiOrIcon: setAdEmojiOrIcon,
          setBadgeText: setAdBadgeText,
          setCtaButtons: setAdCtaButtons,
          setDisclaimerText: setAdDisclaimerText,
          setLogoHeight: setAdLogoHeight,
          setLogoAlignment: setAdLogoAlignment,
          setLogoCompanion: setAdLogoCompanion,
          setProductBlockOptions: setAdProductBlockOptions,
          setLayout: setSelectedLayout,
          setStyle: (updater) => setSelectedStyle((prev) => updater(prev)),
          setElementOrder: setAdElementOrder,
          setFormat: (id) => {
            const preset = FORMAT_PRESETS.find((f) => f.id === id);
            if (preset) setSelectedFormat(preset);
          },
          setSelectedProductIndices: (updater) =>
            setSelectedProductIndices((prev) => updater(prev)),
          allProducts: products,
        });
      }

      const agentMsg: ConversationMessage = {
        role: 'assistant',
        content: message || 'Done!',
        actions,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, agentMsg]);

      // Request multi-agent suggestions after chat message (from backend API)
      if (suggestionsEnabled && isRetailPromo(agent)) {
        try {
          setMultiAgentPending(true);
          setMultiAgentError(null);
          const startTime = Date.now();
          // Use tRPC mutation hook for multi-agent suggestions
          const getSuggestionsMutation = trpc.agents.getSuggestions.useMutation();
          const result = await getSuggestionsMutation.mutateAsync({
            userMessage,
            canvasState,
          });
          const suggestions = {
            suggestions: result.suggestions || [],
            executionPlan: result.executionPlan || { agentsUsed: [], order: [] },
            estimatedImpact: result.estimatedImpact || 'Unknown',
            totalExecutionTime: Date.now() - startTime,
          };
          setMultiAgentSuggestions(suggestions);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to get multi-agent suggestions';
          setMultiAgentError(errMsg);
        } finally {
          setMultiAgentPending(false);
        }
      }

      if (isRetailPromo(agent)) {
        logRetailPromoEvent('ai_chat_message', { actionsCount: actions.length, model: chatModel });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'AI chat failed. Try again.';
      setChatError(errMsg);
      // Remove the user message we optimistically added
      setChatMessages((prev) => prev.slice(0, -1));
      if (isRetailPromo(agent)) {
        logRetailPromoError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setChatPending(false);
    }
  }, [
    agent, chatModel, chatMessages,
    adHeadline, adTitleFontSize, adEmojiOrIcon, adBadgeText, adCtaButtons,
    adDisclaimerText, adElementOrder, selectedLayout, selectedStyle, selectedFormat,
    adLogoHeight, adLogoAlignment, adLogoCompanion, adProductBlockOptions,
    selectedProductIndices, templateProducts,
  ]);

  /** STORY-62: Revert all canvas state to the pre-last-AI-change snapshot. */
  const handleChatUndo = useCallback(() => {
    if (!undoSnapshot) return;
    setAdHeadline(undoSnapshot.headline);
    setAdTitleFontSize(undoSnapshot.titleFontSize);
    setAdEmojiOrIcon(undoSnapshot.emojiOrIcon);
    setAdBadgeText(undoSnapshot.badgeText);
    setAdCtaButtons(undoSnapshot.ctaButtons);
    setAdDisclaimerText(undoSnapshot.disclaimerText);
    setAdElementOrder(undoSnapshot.elementOrder);
    setSelectedLayout(undoSnapshot.layout);
    setSelectedStyle(undoSnapshot.style);
    setSelectedFormat(undoSnapshot.format);
    setAdLogoHeight(undoSnapshot.logoHeight);
    setAdLogoAlignment(undoSnapshot.logoAlignment);
    setAdLogoCompanion(undoSnapshot.logoCompanion);
    setAdProductBlockOptions(undoSnapshot.productBlockOptions);
    setSelectedProductIndices(undoSnapshot.selectedProductIndices);
    setUndoSnapshot(null); // one-level undo — clear after use
  }, [undoSnapshot]);

  /** STORY-62 Phase 2: Apply suggestion — run actions and remove the suggestion message. */
  const handleApplySuggestion = useCallback(
    (timestamp: number, actions: AgentAction[]) => {
      if (actions.length > 0) {
        applyAgentActions(actions, {
          setHeadline: setAdHeadline,
          setTitleFontSize: setAdTitleFontSize,
          setEmojiOrIcon: setAdEmojiOrIcon,
          setBadgeText: setAdBadgeText,
          setCtaButtons: setAdCtaButtons,
          setDisclaimerText: setAdDisclaimerText,
          setLogoHeight: setAdLogoHeight,
          setLogoAlignment: setAdLogoAlignment,
          setLogoCompanion: setAdLogoCompanion,
          setProductBlockOptions: setAdProductBlockOptions,
          setLayout: setSelectedLayout,
          setStyle: (updater) => setSelectedStyle((prev) => updater(prev)),
          setElementOrder: setAdElementOrder,
          setFormat: (id) => {
            const preset = FORMAT_PRESETS.find((f) => f.id === id);
            if (preset) setSelectedFormat(preset);
          },
          setSelectedProductIndices: (updater) =>
            setSelectedProductIndices((prev) => updater(prev)),
          allProducts: products,
        });
      }
      setChatMessages((prev) => prev.filter((m) => m.timestamp !== timestamp));
    },
    [products],
  );

  /** STORY-62 Phase 2: Dismiss suggestion — remove the message. */
  const handleDismissSuggestion = useCallback((timestamp: number) => {
    setChatMessages((prev) => prev.filter((m) => m.timestamp !== timestamp));
  }, []);

  /** STORY-62 Phase 2: Proactive suggestions — debounced 2s, throttled 5s, only when canvas has content. */
  useEffect(() => {
    if (!isRetailPromo(agent)) return;
    const apiKey =
      import.meta.env.VITE_IONET_API_KEY ||
      import.meta.env.PUBLIC_IONET_API_KEY ||
      import.meta.env.IO_NET_API_TOKEN ||
      import.meta.env.IONET_API_KEY;
    if (!apiKey) return;

    const timer = setTimeout(() => {
      if (!suggestionsEnabled || chatPending) return;
      const now = Date.now();
      if (now - lastSuggestionTimeRef.current < 5000) return;
      const hasContent =
        templateProducts.length > 0 ||
        companyLogoDataUri !== undefined;
      if (!hasContent) return;

      lastSuggestionTimeRef.current = now;
      const dataQuality = {
        hasAllCapsNames: templateProducts.some(
          (p) => p.name && p.name === p.name.toUpperCase() && /[A-Z]/.test(p.name),
        ),
        hasMissingPrices: templateProducts.some((p) => !p.price && !p.retailPrice),
        hasOriginalPrices: templateProducts.some((p) => !!p.originalPrice),
        hasDiscounts: templateProducts.some((p) => (p.discountPercent ?? 0) > 0),
        avgDescriptionLength:
          templateProducts.length > 0
            ? Math.round(
                templateProducts.reduce((sum, p) => sum + (p.description?.length ?? 0), 0) /
                  templateProducts.length,
              )
            : 0,
        imageAnalysis: productImageAnalysis,
      };
      const canvasState: AdCanvasState = {
        headline: adHeadline,
        titleFontSize: adTitleFontSize,
        emojiOrIcon: adEmojiOrIcon,
        badgeText: adBadgeText,
        ctaButtons: adCtaButtons,
        disclaimerText: adDisclaimerText,
        elementOrder: adElementOrder,
        layout: selectedLayout,
        style: selectedStyle,
        logoHeight: adLogoHeight,
        logoAlignment: adLogoAlignment,
        logoCompanion: adLogoCompanion,
        productBlockOptions: adProductBlockOptions,
        productCount: templateProducts.length,
        format: { id: selectedFormat.id, width: selectedFormat.width, height: selectedFormat.height },
        dataQuality,
        catalogSummary,
      };
      requestProactiveSuggestion({ apiKey, model: chatModel, canvasState })
        .then(({ message, actions }) => {
          if (!message && actions.length === 0) return;
          const suggestionMsg: ConversationMessage = {
            role: 'assistant',
            content: message || 'Suggestion',
            actions,
            timestamp: Date.now(),
            isSuggestion: true,
          };
          setChatMessages((prev) => [...prev, suggestionMsg]);
        })
        .catch(() => {
          // Silent failure — suggestions are optional
        });
    }, 2000);

    suggestionDebounceRef.current = timer;
    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    };
  }, [
    agent,
    suggestionsEnabled,
    chatPending,
    templateProducts.length,
    companyLogoDataUri,
    selectedLayout,
    selectedFormat.id,
    adHeadline,
    adBadgeText,
    adTitleFontSize,
    adEmojiOrIcon,
    adCtaButtons,
    adDisclaimerText,
    adElementOrder,
    selectedStyle,
    adLogoHeight,
    adLogoAlignment,
    adLogoCompanion,
    adProductBlockOptions,
    productImageAnalysis,
    chatModel,
    catalogSummary,
  ]);

  const handleGenerate = async () => {
    if (isRetailPromo(agent)) logRetailPromoEvent('generate_start');
    setIsGenerating(true);
    setGeneratedHtml(null);
    try {
      const company = logos.find((l) => l.type === 'company');
      const brands = logos.filter((l) => l.type === 'brand');
      const companyUri =
        currentCompanyLogoDataUri ??
        (company ? await fileToBase64DataUri(company.file) : undefined);
      const brandUris = brands.length > 0 ? await Promise.all(brands.map((l) => fileToBase64DataUri(l.file))) : [];
      if (company && !selectedSavedLogoId) setCompanyLogoDataUri(companyUri);
      if (brands.length > 0) setBrandLogoDataUris(brandUris);

      const resolvedProducts: ProductItem[] = products
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => selectedProductIndices.has(i))
        .map(({ p, i }) => ({
          ...p,
          price: p.retailPrice ?? p.price,
          imageDataUri:
            mobilelandImageUrls[i] ??
            productImageDataUris[i] ??
            p.imageDataUri ??
            (webSearchEnabled ? webImageSelections[i] : undefined),
          brandLogoDataUri: brandUris[i] ?? p.brandLogoDataUri,
        }));

      let adTitle = 'Your Ad';
      let productDescriptions: string[] = [];
      const apiKey =
        import.meta.env.VITE_IONET_API_KEY ||
        import.meta.env.PUBLIC_IONET_API_KEY ||
        import.meta.env.IO_NET_API_TOKEN ||
        import.meta.env.IONET_API_KEY;

      if (apiKey && resolvedProducts.length > 0) {
        try {
          const { chatCompletion } = await import('../lib/ionet-client');
          const prompt = buildAdCopyPrompt(resolvedProducts, selectedLayout, agent.placeholderText ?? '');
          const adCopy = getAdCopyModels();
          const modelsToTry = [adCopy.primary, adCopy.fallback];
          for (const model of modelsToTry) {
            try {
              const response = await chatCompletion(apiKey, {
                model,
                messages: [{ role: 'user', content: prompt }],
                max_completion_tokens: 500,
                temperature: 0.7,
              });
              const content = response.choices[0]?.message?.content ?? '';
              const parsed = parseAdCopyResponse(content);
              adTitle = parsed.headline ?? adTitle;
              productDescriptions = parsed.product_descriptions ?? [];
              break;
            } catch {
              // Try next model
            }
          }
        } catch {
          // Fallback to static title and no descriptions
        }

        // Vision: enrich product descriptions from images when available
        const vision = getVisionModels();
        const visionModels = [vision.primary, vision.fallback];
        for (let i = 0; i < resolvedProducts.length; i++) {
          const imgUri = resolvedProducts[i].imageDataUri;
          if (!imgUri || typeof imgUri !== 'string' || !imgUri.startsWith('data:')) continue;
          try {
            const { chatCompletion: visionCompletion } = await import('../lib/ionet-client');
            const visionPrompt = buildVisionPromptForProduct(resolvedProducts[i].name, i);
            for (const model of visionModels) {
              try {
                const res = await visionCompletion(apiKey, {
                  model,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'text' as const, text: visionPrompt },
                        {
                          type: 'image_url' as const,
                          image_url: { url: imgUri },
                        },
                      ],
                    },
                  ],
                  max_completion_tokens: 80,
                  temperature: 0.3,
                });
                const text = res.choices[0]?.message?.content?.trim();
                if (text) {
                  productDescriptions[i] = text.replace(/^["']|["']$/g, '').slice(0, 120);
                  break;
                }
              } catch {
                // try next vision model
              }
            }
          } catch {
            // keep existing description or none
          }
        }
      }

      const productsWithCopy: ProductItem[] = resolvedProducts.map((p, i) => ({
        ...p,
        description: productDescriptions[i] ?? p.description,
      }));

      const html = renderAdTemplate({
        companyLogoDataUri: companyUri,
        title: (adHeadline.trim() || adTitle).toUpperCase(),
        products: productsWithCopy,
        layout: selectedLayout,
        format: selectedFormat,
        style: selectedStyle,
        titleFontSize: adTitleFontSize,
        ctaButtons: adCtaButtons.filter((b) => b.trim()),
        badgeText: adBadgeText.trim() || undefined,
        disclaimerText: adDisclaimerText.trim() || undefined,
        emojiOrIcon: adEmojiOrIcon.trim() || undefined,
        elementOrder: adElementOrder,
        logoHeight: adLogoHeight,
        logoAlignment: adLogoAlignment,
        logoCompanion: adLogoCompanion,
        productBlockOptions: adProductBlockOptions,
        headerBrandLogoDataUris: brandUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT),
      });
      setGeneratedHtml(html);
      if (isRetailPromo(agent)) logRetailPromoEvent('generate_success');

      document.getElementById('ad-preview-pane')?.scrollIntoView({ behavior: 'smooth' });
      setMobilePreviewOpen(true);
    } catch (err) {
      if (isRetailPromo(agent)) {
        logRetailPromoEvent('generate_failure', {
          reason: err instanceof Error ? err.message : String(err),
        });
        logRetailPromoError(err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const previewHtmlToShow = generatedHtml ?? livePreviewHtml;

  const isPortraitFormat = selectedFormat.height > selectedFormat.width;
  const desktopContainerWidth = isPortraitFormat
    ? PORTRAIT_CONTAINER_WIDTH
    : 400;

  const deviceFrameContent = previewHtmlToShow ? (
    <Suspense fallback={<SectionLoader />}>
      <AdPreviewFrameLazy
        html={previewHtmlToShow}
        format={selectedFormat}
        containerWidth={isPortraitFormat ? PORTRAIT_CONTAINER_WIDTH - 16 : desktopContainerWidth}
      />
    </Suspense>
  ) : (
    <EmptyPreviewState />
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Full-screen editor layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - collapsible on desktop */}
        <aside
          className={`hidden lg:flex lg:flex-col lg:shrink-0 lg:border-r lg:border-white/10 lg:overflow-y-auto h-full transition-all duration-300 ease-in-out ${
            leftPanelOpen ? 'lg:w-[380px]' : 'lg:w-0 lg:overflow-hidden lg:border-r-0'
          }`}
        >
          <div className={`space-y-3 p-4 min-w-[380px] ${leftPanelOpen ? '' : 'lg:hidden'}`}>
            <AccordionStep
            index={0}
            active={activeStep === 0}
            onToggle={() => setActiveStep(0)}
            title="Upload Logos"
            summary={logos.length > 0 ? `${logos.length} logo${logos.length !== 1 ? 's' : ''}` : ''}
            colors={colors}
            isLast={false}
          >
            <Suspense fallback={<SectionLoader />}>
              <LogoUploader
                logos={logos}
                onLogosChange={setLogos}
                savedLogos={isRetailPromo(agent) ? savedLogos : []}
                currentCompanyLogoDataUri={isRetailPromo(agent) ? currentCompanyLogoDataUri : undefined}
                companyLogoLoadError={isRetailPromo(agent) ? companyLogoLoadError : null}
                companyLogoLoading={isRetailPromo(agent) ? companyLogoLoading : false}
                selectedSavedLogoId={isRetailPromo(agent) ? selectedSavedLogoId : null}
                onSelectSavedLogo={isRetailPromo(agent) ? setSelectedSavedLogoId : undefined}
                onSaveCurrentLogo={
                  isRetailPromo(agent)
                    ? () => {
                        if (!currentCompanyLogoDataUri) return;
                        const newId = saveLogo({ dataUri: currentCompanyLogoDataUri, name: 'Company logo' });
                        setSavedLogos(getSavedLogos());
                        if (newId) setSelectedSavedLogoId(newId);
                      }
                    : undefined
                }
                onRemoveSavedLogo={
                  isRetailPromo(agent)
                    ? (id) => {
                        removeSavedLogo(id);
                        if (selectedSavedLogoId === id) {
                          setSelectedSavedLogoId(null);
                          setCompanyLogoDataUri(undefined);
                        }
                        setSavedLogos(getSavedLogos());
                      }
                    : undefined
                }
                isSavedLogosFull={isRetailPromo(agent) ? isSavedLogosFull() : false}
                savedBrandLogos={isRetailPromo(agent) ? savedBrandLogos : []}
                currentBrandLogoDataUris={isRetailPromo(agent) ? brandLogoDataUris : []}
                onSelectSavedBrandLogo={
                  isRetailPromo(agent)
                    ? (id) => {
                        const saved = savedBrandLogos.find((s) => s.id === id);
                        if (saved) setBrandLogoDataUris((prev) => [...prev, saved.dataUri]);
                      }
                    : undefined
                }
                onSaveCurrentBrandLogos={
                  isRetailPromo(agent)
                    ? (tags?: string[]) => {
                        brandLogoDataUris.forEach((uri) => {
                          if (!savedBrandLogos.some((s) => s.dataUri === uri)) {
                            const id = saveBrandLogo({ dataUri: uri, tags });
                            if (id && tags && tags.length > 0) {
                              updateBrandLogoTags(id, tags);
                            }
                          }
                        });
                        setSavedBrandLogos(getSavedBrandLogos());
                      }








                    : undefined
                }
                onRemoveSavedBrandLogo={
                  isRetailPromo(agent)
                    ? (id) => {
                        removeSavedBrandLogo(id);
                        setSavedBrandLogos(getSavedBrandLogos());
                      }
                    : undefined
                }
                isSavedBrandLogosFull={isRetailPromo(agent) ? isSavedBrandLogosFull() : false}
              />
            </Suspense>
          </AccordionStep>

          <AccordionStep
            index={1}
            active={activeStep === 1}
            onToggle={() => setActiveStep(1)}
            title="Add Products"
            summary={products.length > 0 ? `${selectedProductIndices.size}/${products.length} selected` : ''}
            colors={colors}
            isLast={false}
          >
            <div className="space-y-4">
              <Suspense fallback={<SectionLoader />}>
                <ProductDataInput
                  products={products}
                  onProductsChange={setProducts}
                  images={productImages}
                  onImagesChange={setProductImages}
                  selectedIndices={selectedProductIndices}
                  onSelectionChange={setSelectedProductIndices}
                  onVisibleIndicesChange={setVisibleProductIndices}
                  eventCallbacks={
                    isRetailPromo(agent)
                      ? {
                          onExcelUploadStart: () => logRetailPromoEvent('file_upload_start'),
                          onExcelUploadSuccess: (productCount) =>
                            logRetailPromoEvent('file_upload_success', { productCount }),
                          onExcelUploadFailure: (reason) =>
                            logRetailPromoEvent('file_upload_failure', { reason }),
                          onPasteProducts: (productCount) =>
                            logRetailPromoEvent('paste_products', { productCount }),
                        }
                      : undefined
                  }
                  savedProductPhotos={isRetailPromo(agent) ? savedProductPhotos : []}
                  currentProductPhotoDataUris={isRetailPromo(agent) ? productImageDataUris : []}
                  onSavePhoto={
                    isRetailPromo(agent)
                      ? (dataUri, name, metadata) => {
                          const id = saveProductPhoto({ dataUri, name, ...metadata });
                          if (id) setSavedProductPhotos(getSavedProductPhotos());
                        }
                      : undefined
                  }
                  onSelectSavedPhoto={
                    isRetailPromo(agent)
                      ? (id) => {
                          const saved = savedProductPhotos.find((s) => s.id === id);
                          if (saved)
                            setProductImageDataUrisFromSaved((prev) => [
                              ...prev,
                              { id: saved.id, dataUri: saved.dataUri },
                            ]);
                        }
                      : undefined
                  }
                  onRemoveSavedPhoto={
                    isRetailPromo(agent)
                      ? (id) => {
                          removeSavedProductPhoto(id);
                          setSavedProductPhotos(getSavedProductPhotos());
                        }
                      : undefined
                  }
                  isSavedProductPhotosFull={isRetailPromo(agent) ? isSavedProductPhotosFull() : false}
                  onAssignProductPhoto={
                    isRetailPromo(agent)
                      ? (index, dataUri) => {
                          setProducts((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index]!, imageDataUri: dataUri };
                            return next;
                          });
                        }
                      : undefined
                  }
                />
              </Suspense>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                    <Search className="h-3.5 w-3.5 text-blue-400" />
                    Web Image Search
                  </span>
                  {webSearchEnabled && (
                    <Badge className="border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs">ON</Badge>
                  )}
                </div>
                <Suspense fallback={<SectionLoader />}>
                  <WebImageSearch
                    products={products}
                    productsWithImages={productsWithImages}
                    enabled={webSearchEnabled}
                    onEnabledChange={setWebSearchEnabled}
                    selections={webImageSelections}
                    onSelectionsChange={setWebImageSelections}
                  />
                </Suspense>
              </div>
            </div>
          </AccordionStep>

          <AccordionStep
            index={2}
            active={activeStep === 2}
            onToggle={() => setActiveStep(2)}
            title="Configure Ad"
            summary={configSummary}
            colors={colors}
            isLast
          >
            <div className="space-y-4">
              <LayoutPicker value={selectedLayout} onChange={setSelectedLayout} />
              <FormatPicker
                presets={FORMAT_PRESETS}
                value={selectedFormat}
                onChange={setSelectedFormat}
              />
              <StyleCustomizer value={selectedStyle} onChange={setSelectedStyle} />
            </div>
          </AccordionStep>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            data-testid="generate-ad-button"
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-orange-500/40 disabled:opacity-60"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
            {isGenerating ? (
              <>
                <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="relative">AI is generating…</span>
              </>
            ) : (
              <>
                <Sparkles className="relative h-4 w-4" />
                <span className="relative">Generate Ad</span>
              </>
            )}
          </button>

          {/* My Ads — saved creatives panel (STORY-37) */}
          {isRetailPromo(agent) && (
            <div
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl"
              data-testid="my-ads-section"
            >
              <button
                type="button"
                onClick={() => setMyAdsOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
                aria-expanded={myAdsOpen}
                data-testid="my-ads-toggle"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-orange-400/70" />
                  <span className="text-sm font-semibold text-gray-300">My Ads</span>
                  {savedCreatives.length > 0 && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400" data-testid="my-ads-count">
                      {savedCreatives.length}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${myAdsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${myAdsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-2 border-t border-white/10 px-4 py-3">
                    <button
                      type="button"
                      onClick={handleSaveCreative}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      data-testid="save-creative-button"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5 text-orange-400" />
                      Save current ad
                    </button>
                    {savedToast && (
                      <p
                        data-testid="save-toast"
                        className="text-center text-xs font-medium text-green-400"
                      >
                        Ad saved ✓
                      </p>
                    )}
                    {savedCreatives.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-500">No saved ads yet.</p>
                    ) : (
                      <ul className="space-y-1.5" data-testid="saved-creatives-list">
                        {savedCreatives.map((creative) => (
                          <li
                            key={creative.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                            data-testid={`creative-item-${creative.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-200">{creative.name}</p>
                              <p className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {new Date(creative.savedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => handleLoadCreative(creative)}
                                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-gray-300 transition hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                data-testid={`load-creative-${creative.id}`}
                                aria-label={`Load creative: ${creative.name}`}
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCreative(creative.id)}
                                className="rounded-md border border-red-500/20 bg-red-500/5 p-1 text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                data-testid={`delete-creative-${creative.id}`}
                                aria-label={`Delete creative: ${creative.name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </aside>

        {/* Panel Toggle Button */}
        <button
          onClick={() => setLeftPanelOpen((o) => !o)}
          className="hidden lg:flex items-center justify-center border-r border-white/10 bg-white/[0.02] px-1.5 hover:bg-white/[0.06] transition-colors"
          title={leftPanelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {leftPanelOpen ? (
            <PanelLeftClose className="h-4 w-4 text-gray-500 hover:text-gray-300" />
          ) : (
            <PanelLeft className="h-4 w-4 text-gray-500 hover:text-gray-300" />
          )}
        </button>

        {/* Main editor area */}
        <div
          id="ad-preview-pane"
          data-testid="preview-pane"
          className="flex-1 min-h-0 min-w-0 flex flex-col"
        >
          <div className="flex flex-1 flex-col min-h-0 bg-white/[0.03] backdrop-blur-xl">
            {/* Header: Edit / Preview toggle + Enlarge + format (STORY-44) */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
              {/* Edit / Preview mode toggle */}
              <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5" data-testid="canvas-mode-toggle">
                <button
                  type="button"
                  onClick={() => setCanvasMode('edit')}
                  data-testid="mode-edit-btn"
                  aria-pressed={canvasMode === 'edit'}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all focus:outline-none focus:ring-1 focus:ring-orange-500/50 ${
                    canvasMode === 'edit'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode('preview')}
                  data-testid="mode-preview-btn"
                  aria-pressed={canvasMode === 'preview'}
                  title="Preview mode (press P)"
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all focus:outline-none focus:ring-1 focus:ring-orange-500/50 ${
                    canvasMode === 'preview'
                      ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              </div>
              <div className="flex items-center gap-2">
                {previewHtmlToShow && (
                  <button
                    ref={enlargeButtonRef}
                    type="button"
                    onClick={() => {
                      previewTriggerRef.current = enlargeButtonRef.current;
                      setMobilePreviewOpen(true);
                    }}
                    data-testid="enlarge-button"
                    aria-label="Enlarge preview"
                    className="rounded-md border border-white/10 bg-white/5 p-1 text-gray-400 transition hover:bg-white/10 hover:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className="text-xs text-gray-500">{selectedFormat.label}</span>
              </div>
            </div>
            {/* Edit / Preview mode content (STORY-44) */}
            <div className="flex-1 min-h-0 overflow-y-auto" data-testid="preview-scroll-area">
              {canvasMode === 'edit' ? (
                <AdCanvasEditor
                  headline={adHeadline}
                  onHeadlineChange={setAdHeadline}
                  titleFontSize={adTitleFontSize}
                  onTitleFontSizeChange={setAdTitleFontSize}
                  ctaButtons={adCtaButtons}
                  onCtaButtonsChange={setAdCtaButtons}
                  badgeText={adBadgeText}
                  onBadgeTextChange={setAdBadgeText}
                  disclaimerText={adDisclaimerText}
                  onDisclaimerTextChange={setAdDisclaimerText}
                  emojiOrIcon={adEmojiOrIcon}
                  onEmojiOrIconChange={setAdEmojiOrIcon}
                  elementOrder={adElementOrder}
                  onElementOrderChange={setAdElementOrder}
                  products={templateProducts}
                  companyLogoDataUri={currentCompanyLogoDataUri}
                  brandLogoDataUris={brandLogoDataUris}
                  headerBrandLogoDataUris={brandLogoDataUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT)}
                  style={selectedStyle}
                  logoHeight={adLogoHeight}
                  onLogoHeightChange={setAdLogoHeight}
                  logoAlignment={adLogoAlignment}
                  onLogoAlignmentChange={setAdLogoAlignment}
                  logoCompanion={adLogoCompanion}
                  onLogoCompanionChange={setAdLogoCompanion}
                  productImageHeight={adProductBlockOptions.imageHeight}
                  onProductImageHeightChange={(v) =>
                    setAdProductBlockOptions((prev) => ({ ...prev, imageHeight: v }))
                  }
                  productBlockOptions={adProductBlockOptions}
                  onProductBlockOptionsChange={setAdProductBlockOptions}
                  savedProductPhotos={isRetailPromo(agent) ? savedProductPhotos : []}
                  onAssignProductPhoto={
                    isRetailPromo(agent)
                      ? (canvasIdx, dataUri) => {
                          const origIdx = templateProductOriginalIndices[canvasIdx];
                          if (origIdx === undefined) return;
                          setProducts((prev) => {
                            const next = [...prev];
                            next[origIdx] = { ...next[origIdx]!, imageDataUri: dataUri };
                            return next;
                          });
                        }
                      : undefined
                  }
                  onUploadProductPhoto={
                    isRetailPromo(agent)
                      ? async (canvasIdx, file) => {
                          const origIdx = templateProductOriginalIndices[canvasIdx];
                          if (origIdx === undefined) return;
                          try {
                            const dataUri = await fileToBase64DataUri(file);
                            setProducts((prev) => {
                              const next = [...prev];
                              next[origIdx] = { ...next[origIdx]!, imageDataUri: dataUri };
                              return next;
                            });
                            const p = products[origIdx];
                            const id = saveProductPhoto({
                              dataUri,
                              name: p?.name,
                              code: p?.code,
                              price: p?.retailPrice ?? p?.price,
                            });
                            if (id) setSavedProductPhotos(getSavedProductPhotos());
                          } catch {
                            // silent
                          }
                        }
                      : undefined
                  }
                  chatMessages={isRetailPromo(agent) ? chatMessages : undefined}
                  onChatSend={isRetailPromo(agent) ? handleChatSend : undefined}
                  chatPending={chatPending}
                  chatError={chatError}
                  chatModel={chatModel}
                  onChatModelChange={setChatModel}
                  onChatUndo={handleChatUndo}
                  canChatUndo={undoSnapshot !== null}
                  suggestionsEnabled={suggestionsEnabled}
                  onSuggestionsToggle={setSuggestionsEnabled}
                  onApplySuggestion={handleApplySuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                />
              ) : previewHtmlToShow ? (
                <div
                  data-testid="ad-preview-frame-wrapper"
                  className="flex flex-col items-center gap-3 p-4 min-h-full"
                >
                  <DeviceFrame format={selectedFormat}>
                    <Suspense fallback={<SectionLoader />}>
                      <AdPreviewFrameLazy
                        html={previewHtmlToShow}
                        format={selectedFormat}
                        containerWidth={isPortraitFormat ? PORTRAIT_CONTAINER_WIDTH - 16 : desktopContainerWidth}
                      />
                    </Suspense>
                  </DeviceFrame>
                  <p
                    data-testid="preview-format-label"
                    className="text-xs text-gray-600 text-center select-none"
                  >
                    {selectedFormat.label} · {selectedFormat.width} × {selectedFormat.height}
                  </p>
                </div>
              ) : (
                <div
                  data-testid="preview-empty-state"
                  className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
                >
                  <Eye className="h-8 w-8 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-400">Nothing to preview yet</p>
                    <p className="mt-1 text-xs text-gray-600">Add a logo or products in Edit mode.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCanvasMode('edit')}
                    className="text-xs text-orange-400 hover:text-orange-300 transition"
                  >
                    ← Back to Edit
                  </button>
                </div>
              )}
            </div>
            {previewHtmlToShow && (
              <div className="shrink-0 border-t border-white/10" data-testid="preview-actions-bar">
                <Suspense fallback={null}>
                  <AdPreviewActionsLazy html={previewHtmlToShow} format={selectedFormat} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Mobile: floating Show Preview button */}
      <button
        ref={showPreviewButtonRef}
        type="button"
        onClick={() => {
          previewTriggerRef.current = showPreviewButtonRef.current;
          setMobilePreviewOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-orange-500/40 md:hidden"
        aria-label="Show preview"
      >
        <ImageIcon className="h-4 w-4" />
        Show Preview
      </button>

      {/* Generating ad overlay with noise animation */}
      {isGenerating && <GeneratingNoiseOverlay />}

      {/* Enlarged preview modal (desktop: open from clicking preview; mobile: open from Show Preview) */}
      {mobilePreviewOpen && (
        <Suspense fallback={null}>
          <AdPreviewEnlargedModalLazy
            open={mobilePreviewOpen}
            onClose={() => setMobilePreviewOpen(false)}
            html={previewHtmlToShow ?? ''}
            format={selectedFormat}
            triggerRef={previewTriggerRef}
          />
        </Suspense>
      )}
    </div>
  );
}
