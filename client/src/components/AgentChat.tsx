import React, { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
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
  Info,
} from 'lucide-react';
import AdCanvasEditor from './AdCanvasEditor';
import { Badge } from './ui/badge';
import type { AgentConfig } from '../data/agents';
import type { WebImageSelection } from './WebImageSearch';
import LayoutPicker from './LayoutPicker';
import FormatPicker from './FormatPicker';
import StyleCustomizer from './StyleCustomizer';
import { fileToBase64DataUri } from '../lib/file-to-base64';
import {
  getMobilelandMapFromLocalStorage,
  getMobilelandMapTimestamp,
  saveMobilelandMapToLocalStorage,
  isMobilelandImageEnabled,
  normalizeProductCodeForMobilelandLookup,
} from '../lib/mobileland-images';
import { trpc } from '@/lib/trpc';
import { renderAdTemplate } from '../lib/ad-templates';
import { getPages } from '../lib/canvas-pages';
import { applySearchRulesToStage1Hits } from '../lib/apply-search-rules';
import { shouldSkipSelectProductsLLM } from '../lib/meilisearch-smart-routing';
import { normalizeSearchQueryForPipeline } from '../lib/normalize-search-query';
import { readSearchRules } from '../lib/search-rules-storage';
import {
  buildExpandedSearchQueries,
  mergeSearchHitsByMaxScore,
} from '../lib/select-products-query-expansion';
import {
  buildVocabularyHintsFromProducts,
  mergeStage1Subqueries,
} from '../lib/stage1-query-expansion';
import { getPreviewHtmlToShow } from '../lib/preview-html';
import { PREVIEW_FORMAT_LABEL_CLASS } from '../lib/preview-format-label';
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
import { getResolvedLlmApiKey, LLM_API_KEY_CHANGED_EVENT } from '../lib/llm-api-key-storage';
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
  getSavedFooters,
  saveFooter,
  removeSavedFooter,
  isSavedFootersFull,
  type SavedFooterEntry,
} from '../lib/saved-footer-config';
import {
  getSavedProductPhotos,
  saveProductPhoto,
  removeSavedProductPhoto,
  isSavedProductPhotosFull,
  type SavedProductPhotoEntry,
} from '../lib/saved-product-photos';
import type { ProductItem } from '../lib/ad-constants';
import { DEFAULT_FOOTER_FOR_NEW_CREATIVE, type FooterConfig } from '../lib/ad-config-schema';
import type { FormatPreset, LayoutId, StyleOptions } from '../lib/ad-layouts/types';
import type { LogoEntry } from '../lib/logo-utils';
import type { ImageEntry } from './ProductImageUploader';
import { serializeCanvasState, type AdCanvasState, type CatalogSummary } from '../lib/ad-canvas-ai';
import { analyzeProductImages, filterVisionImageUris, type ProductImageAnalysis } from '../lib/product-vision-analyzer';
import {
  sendChatMessage,
  requestProactiveSuggestion,
  type ConversationMessage,
  type ChatModelMode,
} from '../lib/agent-chat-engine';
import { RETAIL_PROMO_CHAT_STARTERS } from '../lib/agent-chat-starters';
import { readAgentBrief } from '../lib/agent-brief-storage';
import {
  resolveModelPairForMode,
  readChatModelMode,
  writeChatModelMode,
} from '../lib/ionet-model-preferences-storage';
import {
  APPLY_DESIGN_DEFAULTS_TO_CANVAS_EVENT,
  resolveWorkspaceDesignDefaults,
} from '../lib/design-defaults-storage';
import {
  proactiveSuggestionDedupKey,
  rememberDismissedSuggestionKey,
  shouldSkipProactiveSuggestionForRecentDismissals,
  hashProactiveSuggestionTipForAnalytics,
  PROACTIVE_SUGGESTION_MIN_INTERVAL_DURING_ACTIVITY_MS,
  PROACTIVE_SUGGESTION_MIN_INTERVAL_IDLE_MS,
  PROACTIVE_SUGGESTION_RECENT_ACTIVITY_WINDOW_MS,
  PROACTIVE_SUGGESTION_DEBOUNCE_IDLE_MS,
  PROACTIVE_SUGGESTION_DEBOUNCE_ACTIVE_MS,
} from '../lib/proactive-suggestion-dedup';
import {
  applyAgentActions,
  extractLastCatalogFilterQueryText,
  type AgentAction,
  type CatalogFilterPayload,
} from '../lib/agent-actions';
import { filterImportedCatalogByActiveSearch } from '../lib/product-selection-panel-filters';
import { useSearchIndex } from '../lib/use-search-index';
import {
  computeCatalogDiff,
  buildIndexState,
  loadIndexState,
  saveIndexState,
  CATALOG_INDEX_STORAGE_KEY,
} from '../lib/catalog-index-manager';
import {
  collectResolvedIndicesFromCatalogActions,
  logSearchFeedbackExplicit,
  logSearchFeedbackImplicitDeselect,
} from '../lib/search-feedback';
import { GeneratingNoiseOverlay } from './GeneratingNoiseOverlay';

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
  /** STORY-181: Add Products search box + Products tab share this string (MiniSearch aligned in panel). */
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  /** STORY-194: Last agent `catalog_filter` query — Products tab seeds search when opened. */
  const [lastAgentCatalogFilterQuery, setLastAgentCatalogFilterQuery] = useState('');
  /** STORY-200: mirror for feedback handlers (avoid stale closure). */
  const lastAgentCatalogFilterQueryRef = useRef('');
  useEffect(() => {
    lastAgentCatalogFilterQueryRef.current = lastAgentCatalogFilterQuery;
  }, [lastAgentCatalogFilterQuery]);
  /** STORY-200: indices last set by agent `catalog_filter` with resolvedIndices (for implicit feedback). */
  const lastAgentCatalogSelectionRef = useRef<Set<number>>(new Set());
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

  /**
   * SKU → image URL map — served from localStorage cache (24h TTL), refreshed
   * via tRPC when stale. When the map is empty (server still warming up),
   * poll every 30 s so images appear as soon as the cache is ready.
   */
  // STORY-119: AI-driven product selection — resolves catalog_filter(query) actions server-side.
  const selectProductsMutation = trpc.catalog.selectProducts.useMutation();

  // STORY-136 + STORY-137: Search provider detection and Meilisearch procedures.
  const { data: searchProviderData } = trpc.catalog.getSearchProvider.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  /**
   * STORY-138: true when Meilisearch hybrid (BM25 + OpenAI vector) is active.
   * When true, _rankingScore values are meaningful for smart LLM routing.
   */
  const hybridEnabled = searchProviderData?.hybridEnabled ?? false;
  /**
   * _rankingScore threshold above which selectProducts is skipped (high confidence path).
   * Comes from server env MEILI_CONFIDENCE_THRESHOLD (default 0.85).
   */
  const confidenceThreshold = searchProviderData?.confidenceThreshold ?? 0.85;
  /** `meilisearch` when Stage-1 uses server search; used for smart LLM routing (STORY-199). */
  const searchProvider = searchProviderData?.provider ?? 'unconfigured';
  const indexProductsMutation = trpc.catalog.indexProducts.useMutation();
  const deleteProductsMutation = trpc.catalog.deleteProducts.useMutation();
  const getIndexStatsMutation = trpc.catalog.getIndexStats.useMutation();
  const configureIndexMutation = trpc.catalog.configureIndex.useMutation();
  const searchProductsMutation = trpc.catalog.searchProducts.useMutation();
  const expandSearchQueryStage1Mutation = trpc.catalog.expandSearchQueryStage1.useMutation();

  /**
   * STORY-138: Meilisearch is the only search provider.
   * MiniSearch index is never built (skip: true always).
   * versionRef still increments on catalog changes for stale-detection in resolveCatalogFilterActions.
   * indexRef (null) is passed to applyAgentActions which handles null by building its own index.
   */
  const { indexRef: searchIndexRef, versionRef: catalogVersionRef, indexVersion: searchIndexVersion } = useSearchIndex(
    products,
    { skip: true },
  );

  /**
   * STORY-122 A-1 belt-and-suspenders: keep a ref that always points to the
   * latest products array regardless of closure capture timing (concurrent React).
   */
  const productsRef = useRef(products);
  productsRef.current = products;

  /** STORY-200: programmatic selection changes — no implicit feedback. */
  const setSelectedProductIndicesFromAgent = useCallback(
    (updater: React.SetStateAction<Set<number>>) => {
      setSelectedProductIndices((prev) =>
        typeof updater === 'function' ? updater(prev) : updater,
      );
    },
    [],
  );

  /** STORY-200: user-driven selection — implicit feedback when deselecting agent-picked rows. */
  const setSelectedProductIndicesFromUser = useCallback(
    (updater: React.SetStateAction<Set<number>>) => {
      setSelectedProductIndices((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (isRetailPromo(agent)) {
          const q = lastAgentCatalogFilterQueryRef.current;
          const agentSet = lastAgentCatalogSelectionRef.current;
          const catalog = productsRef.current;
          for (const i of prev) {
            if (!next.has(i) && agentSet.has(i)) {
              const p = catalog[i];
              if (p) {
                logSearchFeedbackImplicitDeselect({
                  queryRaw: q,
                  product: { code: p.code, name: p.name },
                });
              }
              agentSet.delete(i);
            }
          }
        }
        return next;
      });
    },
    [agent],
  );

  const handleSearchFeedbackExplicit = useCallback((index: number, relevant: boolean) => {
    const q = lastAgentCatalogFilterQueryRef.current;
    const p = productsRef.current[index];
    if (!p || !isRetailPromo(agent)) return;
    logSearchFeedbackExplicit({
      queryRaw: q,
      product: { code: p.code, name: p.name },
      relevant,
    });
  }, [agent]);

  /**
   * STORY-140 M3: Configure Meilisearch index + OpenAI embedder once the
   * provider is known. Uses a ref so it only fires one time even though
   * searchProviderData is in the dependency array (it starts undefined while
   * the tRPC query is in-flight).
   */
  const configureIndexCalledRef = useRef(false);
  useEffect(() => {
    if (searchProviderData?.provider !== 'meilisearch') return;
    if (configureIndexCalledRef.current) return;
    configureIndexCalledRef.current = true;
    void configureIndexMutation.mutateAsync().then((res) => {
      if (!res.ok) {
        console.warn('[AgentChat] configureIndex failed:', (res as { reason?: string }).reason);
      } else {
        console.info('[AgentChat] Meilisearch index configured (embedder ready)');
      }
    });
  }, [searchProviderData]);

  /**
   * STORY-139: Incremental Meilisearch indexing.
   *
   * Flow on every catalog change:
   *   1. Health check (getIndexStats) — if Meilisearch is empty → force full re-index.
   *   2. Load stored state from localStorage.
   *   3. No stored state → full re-index (first run or storage cleared).
   *   4. Otherwise → computeCatalogDiff:
   *        - toUpsert: new/changed products sent with their full-catalog indexId
   *        - toDeleteIds: numeric Meilisearch IDs of removed products
   *   5. Persist updated state to localStorage.
   *
   * OpenAI embeddings are generated only for products in toUpsert — not the full catalog.
   */
  useEffect(() => {
    if (products.length === 0) return;

    void (async () => {
      try {
        const stats = await getIndexStatsMutation.mutateAsync();
        const stored = loadIndexState(CATALOG_INDEX_STORAGE_KEY);
        const needsFull = stats.documentCount === 0 || stored === null;

        if (needsFull) {
          await indexProductsMutation.mutateAsync({
            products: products.map((p, i) => ({
              id: i,
              name: p.name,
              code: p.code,
              category: p.category,
              brand: p.brand,
            })),
          });
          saveIndexState(CATALOG_INDEX_STORAGE_KEY, buildIndexState(products));
          console.info(
            `[CatalogIndexManager] full re-index: ${products.length} products (${stats.documentCount === 0 ? 'empty index' : 'no stored state'})`,
          );
          return;
        }

        const { toUpsert, toDeleteIds, stats: diffStats } = computeCatalogDiff(products, stored);

        if (toUpsert.length > 0) {
          await indexProductsMutation.mutateAsync({
            products: toUpsert.map(({ product, indexId }) => ({
              id: indexId,
              name: product.name,
              code: product.code,
              category: product.category,
              brand: product.brand,
            })),
          });
        }

        if (toDeleteIds.length > 0) {
          await deleteProductsMutation.mutateAsync({ ids: toDeleteIds });
        }

        saveIndexState(CATALOG_INDEX_STORAGE_KEY, buildIndexState(products));

        if (toUpsert.length > 0 || toDeleteIds.length > 0) {
          console.info(
            `[CatalogIndexManager] incremental: +${diffStats.added} ~${diffStats.updated} -${diffStats.deleted} =${diffStats.unchanged}`,
          );
        }
      } catch (err) {
        console.warn('[CatalogIndexManager] Indexing failed:', err);
      }
    })();

    // Mutation refs are stable; products is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  /**
   * STORY-119/122/138: Two-stage product search pipeline.
   * Stage 1 — Meilisearch hybrid search (BM25 + OpenAI embeddings): fast semantic recall.
   * Stage 2 — LLM rerank (catalog.selectProducts): final product selection.
   *
   * A-1: Snapshot catalog version at call time; discard result if catalog changed
   *   while the LLM was processing — prevents applying stale indices to new catalog.
   * A-2: Annotate action with _debugReason on 0-candidate or empty-LLM-result
   *   so the chat panel can surface the failure to the user.
   * A-3: Dynamic candidate count scales with catalog size (50–150).
   */
  const resolveCatalogFilterActions = useCallback(
    async (actions: AgentAction[]): Promise<AgentAction[]> => {
      // A-1: snapshot version and products BEFORE any async work.
      const versionAtStart = catalogVersionRef.current;
      const productsAtStart = productsRef.current; // always fresh (updated every render)

      return Promise.all(
        actions.map(async (action): Promise<AgentAction> => {
          if (action.type !== 'catalog_filter') return action;
          const p = action.payload as Partial<CatalogFilterPayload>;
          const normalizedQuery = normalizeSearchQueryForPipeline(p.query ?? '');
          if (!normalizedQuery || productsAtStart.length === 0) return action;

          // A-3: scale candidate count with catalog size; never send <50 or >150.
          // Special case: for very small catalogs (≤150 products), send all of them
          // as candidates — at that size the LLM cost is trivial and recall is perfect.
          const candidateCount =
            productsAtStart.length <= 150
              ? productsAtStart.length
              : Math.min(150, Math.max(50, Math.ceil(productsAtStart.length * 0.03)));

          // STORY-138: Stage 1 — Meilisearch hybrid search (BM25 + OpenAI embeddings).
          // Noise floor filter: keep hits above 50% of the top score to suppress BM25 noise.
          // Recall safeguard: if that leaves very few candidates (e.g. "kućni punjač Type-C"
          // returning only 1) but we had many raw hits, relax floor to 30% so the LLM sees more.
          const NOISE_FLOOR_RATIO = 0.5;
          const RELAXED_FLOOR_RATIO = 0.3;
          const MIN_CANDIDATES_AFTER_FLOOR = 5;

          let hits: Array<{ index: number; score: number }> = [];

          try {
            /** STORY-162: Multi-query Stage-1 — union hits so inner tubes / variants are not lost to a single bad ranking. */
            /** STORY-198: Optional LLM sub-queries (requires STAGE1_QUERY_EXPANSION + VITE_STAGE1_QUERY_EXPANSION). */
            const STAGE1_MAX_SUBQUERIES = 8;
            let subQueries = buildExpandedSearchQueries(normalizedQuery);
            if (import.meta.env.VITE_STAGE1_QUERY_EXPANSION === '1' && productsAtStart.length > 0) {
              try {
                const hints = buildVocabularyHintsFromProducts(productsAtStart, 40);
                const { suggestions } = await expandSearchQueryStage1Mutation.mutateAsync({
                  query: normalizedQuery,
                  vocabularyHints: hints,
                });
                subQueries = mergeStage1Subqueries(suggestions, subQueries, STAGE1_MAX_SUBQUERIES);
                if (suggestions.length > 0) {
                  console.info(
                    `[AgentChat] STORY-198 Stage-1 LLM expansion: llm=${suggestions.length} merged sub-queries=${subQueries.length}`,
                  );
                }
              } catch (expErr) {
                console.warn(
                  '[AgentChat] STORY-198 Stage-1 expansion failed, using deterministic only:',
                  expErr,
                );
              }
            }
            const perQueryLimit = Math.max(
              40,
              Math.ceil((candidateCount * 1.5) / Math.max(1, subQueries.length)),
            );
            const rawHitLists = await Promise.all(
              subQueries.map((sq) =>
                searchProductsMutation.mutateAsync({
                  query: sq,
                  maxResults: perQueryLimit,
                }),
              ),
            );
            const rawHits = mergeSearchHitsByMaxScore(rawHitLists, candidateCount);
            const topScore = rawHits.length > 0 ? rawHits[0]!.score : 0;
            let noiseFloor = topScore * NOISE_FLOOR_RATIO;
            hits = rawHits.filter((h) => h.score >= noiseFloor);

            if (
              hits.length < MIN_CANDIDATES_AFTER_FLOOR &&
              rawHits.length >= MIN_CANDIDATES_AFTER_FLOOR
            ) {
              const relaxedFloor = topScore * RELAXED_FLOOR_RATIO;
              hits = rawHits.filter((h) => h.score >= relaxedFloor);
              console.info(
                `[AgentChat] Meilisearch recall safeguard: ${hits.length}/${rawHits.length} (relaxed floor ${relaxedFloor.toFixed(2)}) query="${normalizedQuery}"`,
              );
            } else {
              console.info(
                `[AgentChat] Meilisearch candidates=${hits.length}/${rawHits.length} (noise floor ${noiseFloor.toFixed(2)}) query="${normalizedQuery}"`,
              );
            }
            // STORY-196: exclude/downrank post-processing (browser-local rules; same query as catalog_filter).
            hits = applySearchRulesToStage1Hits(normalizedQuery, hits, productsAtStart, readSearchRules());
          } catch (meiliErr) {
            console.warn('[AgentChat] Meilisearch search failed:', meiliErr);
          }

          if (hits.length === 0) {
            console.warn('[AgentChat] Stage 1 returned 0 candidates for:', normalizedQuery);
            // A-2: annotate so the chat panel can show a visible hint to the user.
            return {
              ...action,
              payload: {
                ...(action.payload as object),
                _debugReason: `No products matched query: "${normalizedQuery}"`,
              },
            };
          }

          // STORY-137 + STORY-138 + STORY-199: Smart LLM routing — skip selectProducts when hybrid
          // returns high-confidence results (see `shouldSkipSelectProductsLLM`).
          if (
            shouldSkipSelectProductsLLM({
              hybridEnabled,
              searchProvider,
              hits,
              confidenceThreshold,
            })
          ) {
            const resolvedPayload: CatalogFilterPayload = {
              resolvedIndices: hits.map((h) => h.index),
              maxSelect: p.maxSelect ?? 0,
              deselectOthers: p.deselectOthers ?? true,
            };
            console.info(
              `[AgentChat] Smart routing: skipping LLM — all ${hits.length} Meilisearch hits exceed threshold ${confidenceThreshold} for: "${normalizedQuery}"`,
            );
            return { type: 'catalog_filter', payload: resolvedPayload };
          }

          try {
            const result = await selectProductsMutation.mutateAsync({
              query: normalizedQuery,
              candidates: hits.map(({ index }) => ({
                index,
                name: productsAtStart[index]!.name ?? '',
                code: productsAtStart[index]!.code,
                category: productsAtStart[index]!.category,
                brand: productsAtStart[index]!.brand,
              })),
              maxSelect: typeof p.maxSelect === 'number' ? p.maxSelect : 0,
            });

            // A-1: if catalog changed while LLM was processing, discard the result.
            // The original action is returned unchanged so the legacy filter path
            // (nameContains/category) will re-run against the current catalog.
            if (catalogVersionRef.current !== versionAtStart) {
              console.warn(
                '[AgentChat] Catalog changed during LLM call — discarding stale result for:',
                normalizedQuery,
              );
              return action;
            }

            console.info(
              '[AgentChat] selectProducts resolved:',
              result.indices.length,
              'products',
              result.reasoning,
            );

            // A-2: if LLM returned no matches, either annotate or fallback.
            if (result.indices.length === 0) {
              const isLlmError =
                typeof result.reasoning === 'string' &&
                (result.reasoning.includes('LLM error') ||
                  result.reasoning.includes('LLM not configured') ||
                  result.reasoning.includes('no content'));
              // When LLM is unavailable or failed, use Stage 1 top candidates so the user
              // still sees products instead of "No products selected yet".
              if (isLlmError && hits.length > 0) {
                const fallbackCount = Math.min(50, hits.length);
                const resolvedPayload: CatalogFilterPayload & { _debugReason?: string } = {
                  resolvedIndices: hits.slice(0, fallbackCount).map((h) => h.index),
                  maxSelect: p.maxSelect ?? 0,
                  deselectOthers: p.deselectOthers ?? true,
                  _debugReason: 'LLM nije dostupan — prikazani su najbolji rezultati pretrage.',
                };
                return { type: 'catalog_filter', payload: resolvedPayload };
              }
              return {
                ...action,
                payload: {
                  ...(action.payload as object),
                  _debugReason: `LLM found no matching products among ${hits.length} candidates for: "${normalizedQuery}"`,
                },
              };
            }

            const resolvedPayload: CatalogFilterPayload = {
              resolvedIndices: result.indices,
              maxSelect: p.maxSelect ?? 0,
              deselectOthers: p.deselectOthers ?? true,
            };
            return { type: 'catalog_filter', payload: resolvedPayload };
          } catch (err) {
            console.warn('[AgentChat] selectProducts failed (no legacy fallback to avoid 999+):', err);
            // Do NOT return action — legacy path would use query as nameContains and
            // nameToIndices can return thousands (e.g. all "futrola") → 999+ selected.
            return {
              ...action,
              payload: {
                ...(action.payload as object),
                _debugReason: 'Odabir proizvoda nije uspio (timeout ili greška). Pokušajte ponovo.',
              },
            };
          }
        }),
      );
    },
    [
      selectProductsMutation,
      searchProductsMutation,
      expandSearchQueryStage1Mutation,
      hybridEnabled,
      confidenceThreshold,
      searchProvider,
      catalogVersionRef,
      productsRef,
    ],
  );

  /** STORY-158: hydrate once from LS — do not pass function refs (previous bug: initialData = getter, data became Function). */
  const mobilelandInitialData = useMemo(
    () => getMobilelandMapFromLocalStorage() ?? undefined,
    [],
  );
  const mobilelandInitialUpdatedAt = useMemo(() => getMobilelandMapTimestamp(), []);

  const { data: mobilelandImageMap } = trpc.catalog.getMobilelandImages.useQuery(undefined, {
    /** Fresh map after server deploy / STORY-156 alias keys */
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    initialData: mobilelandInitialData,
    initialDataUpdatedAt: mobilelandInitialUpdatedAt,
    // Poll until the server cache warms up (returns a non-empty map)
    refetchInterval: (query) => {
      const raw = query.state.data;
      const map =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
      const mapSize = Object.keys(map).length;
      return mapSize < 100 ? 30_000 : false; // 30s poll when empty, stop once populated
    },
  });

  // Persist the map to localStorage whenever React Query delivers a fresh response
  useEffect(() => {
    if (
      mobilelandImageMap &&
      typeof mobilelandImageMap === 'object' &&
      !Array.isArray(mobilelandImageMap) &&
      Object.keys(mobilelandImageMap as Record<string, string>).length > 0
    ) {
      saveMobilelandMapToLocalStorage(mobilelandImageMap as Record<string, string>);
    }
  }, [mobilelandImageMap]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webImageSelections, setWebImageSelections] = useState<WebImageSelection>({});
  /** STORY-176: Initial format/layout/style from workspace design defaults (localStorage). */
  const [selectedLayout, setSelectedLayout] = useState<LayoutId>(
    () => resolveWorkspaceDesignDefaults().layout,
  );
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(
    () => resolveWorkspaceDesignDefaults().format,
  );
  const [selectedStyle, setSelectedStyle] = useState<StyleOptions>(
    () => resolveWorkspaceDesignDefaults().style,
  );
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
  /** STORY-109/127: Footer on by default (mandatory footer — industry standard). */
  const [footerEnabled, setFooterEnabled] = useState(true);
  /** STORY-109/127: Footer configuration state; default from DEFAULT_FOOTER_FOR_NEW_CREATIVE (slim band). */
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(() => ({ ...DEFAULT_FOOTER_FOR_NEW_CREATIVE }));
  /** Saved footer configs (Retail Promo) — same pattern as saved logos. */
  const [savedFooters, setSavedFooters] = useState<SavedFooterEntry[]>([]);
  /** Canvas pane mode: 'edit' shows WYSIWYG editor, 'preview' shows rendered HTML (STORY-44). */
  const [canvasMode, setCanvasMode] = useState<'edit' | 'preview'>('edit');
  /** STORY-62: Conversational AI agent chat state. */
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState<ChatModelMode>(() => readChatModelMode());
  const handleChatModelChange = useCallback((m: ChatModelMode) => {
    setChatModel(m);
    writeChatModelMode(m);
  }, []);
  /** STORY-62 Phase 2: proactive suggestions on/off (default on). */
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  /** STORY-169: mute proactive API only for this tab session (cleared on full reload). */
  const [proactiveSuggestionsSessionMuted, setProactiveSuggestionsSessionMuted] = useState(false);
  /** STORY-172: BYOK save/clear — re-run effects that gate on API key. */
  const [llmApiKeyRevision, setLlmApiKeyRevision] = useState(0);
  useEffect(() => {
    const bump = () => setLlmApiKeyRevision((r) => r + 1);
    window.addEventListener(LLM_API_KEY_CHANGED_EVENT, bump);
    return () => window.removeEventListener(LLM_API_KEY_CHANGED_EVENT, bump);
  }, []);

  /** STORY-176: Apply saved workspace design defaults to this ad when user requests from Settings. */
  useEffect(() => {
    const onApply = () => {
      const d = resolveWorkspaceDesignDefaults();
      setSelectedFormat(d.format);
      setSelectedLayout(d.layout);
      setSelectedStyle(d.style);
    };
    window.addEventListener(APPLY_DESIGN_DEFAULTS_TO_CANVAS_EVENT, onApply);
    return () => window.removeEventListener(APPLY_DESIGN_DEFAULTS_TO_CANVAS_EVENT, onApply);
  }, []);
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
  /** STORY-62 Phase 2: throttle proactive suggestions; STORY-167: activity-aware interval. */
  const lastSuggestionTimeRef = useRef<number>(0);
  const lastCanvasEditForSuggestionRef = useRef<number>(0);
  const recentDismissedSuggestionKeysRef = useRef<string[]>([]);
  /** Latest proactive suggestion copy (single slot) — used for dismiss/apply dedup (STORY-167). */
  const lastProactiveSuggestionTextRef = useRef<string>('');
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** STORY-123: Only apply canvas updates for the latest chat turn; ignore stale responses. */
  const chatTurnIdRef = useRef(0);
  const [isGenerating, setIsGenerating] = useState(false);
  /** Multi-agent suggestion state (disabled — requires auth; renders nothing in UI) */
  const [multiAgentSuggestions, setMultiAgentSuggestions] = useState<any>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const [savedCreatives, setSavedCreatives] = useState<SavedCreative[]>([]);
  const [myAdsOpen, setMyAdsOpen] = useState(false);
  const enlargeButtonRef = useRef<HTMLButtonElement | null>(null);
  /** After "Generate Ad", show this HTML (AI copy + template). Null = show live preview. */
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  /** STORY-128: Current page index for canvas + preview (multi-page); shared so preview follows canvas. */
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
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
        setSelectedProductIndicesFromAgent(new Set(decoded.products.map((_, i) => i)));
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

  // Load saved footers on mount (Retail Promo)
  useEffect(() => {
    if (isRetailPromo(agent)) setSavedFooters(getSavedFooters());
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

  // Map products → mobileland image URLs whenever the map or product list changes
  useEffect(() => {
    if (products.length === 0) {
      setMobilelandImageUrls({});
      return;
    }
    const map =
      mobilelandImageMap &&
      typeof mobilelandImageMap === 'object' &&
      !Array.isArray(mobilelandImageMap)
        ? (mobilelandImageMap as Record<string, string>)
        : null;
    if (!map) {
      setMobilelandImageUrls({});
      return;
    }
    const next: Record<number, string> = {};
    for (let i = 0; i < products.length; i++) {
      const code = normalizeProductCodeForMobilelandLookup(products[i]?.code);
      if (code && map[code]) next[i] = map[code];
    }
    setMobilelandImageUrls(next);
    if (isRetailPromo(agent)) {
      logRetailPromoEvent('mobileland_fetch', {
        productCount: products.length,
        resolvedCount: Object.keys(next).length,
      });
    }
  }, [products, mobilelandImageMap, agent]);

  const productsWithImages = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < products.length; i++) {
      if (mobilelandImageUrls[i] || productImages[i] || products[i].imageDataUri) {
        set.add(i);
      }
    }
    return set;
  }, [products, productImages, mobilelandImageUrls]);

  /**
   * STORY-156: Online map is keyed by Magento SKU / entity_id / url_key — not by arbitrary ERP codes.
   * When the catalog has codes but none resolve, surface a clear hint (often Excel "šifra" ≠ Magento SKU).
   */
  const mobilelandCodeMismatchBanner = useMemo(() => {
    if (!isRetailPromo(agent) || !isMobilelandImageEnabled()) return false;
    const map = mobilelandImageMap;
    if (!map || typeof map !== 'object' || Array.isArray(map) || typeof map === 'function') return false;
    if (Object.keys(map as Record<string, string>).length < 500) return false;
    if (selectedProductIndices.size === 0) return false;
    let selectedWithCode = 0;
    let matched = 0;
    for (const i of selectedProductIndices) {
      const code = normalizeProductCodeForMobilelandLookup(products[i]?.code);
      if (!code) continue;
      selectedWithCode++;
      if ((map as Record<string, string>)[code]) matched++;
    }
    return selectedWithCode >= 1 && matched === 0;
  }, [agent, mobilelandImageMap, products, selectedProductIndices]);

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
    return products
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
        brandLogoDataUri: brandLogoDataUris[i] ?? p.brandLogoDataUri,
      }));
  }, [products, selectedProductIndices, mobilelandImageUrls, productImageDataUris, brandLogoDataUris, webSearchEnabled, webImageSelections]);

  // STORY-68: Reset vision analysis when products change (new import = fresh analysis).
  useEffect(() => {
    setImageAnalysisRan(false);
    setProductImageAnalysis(null);
  }, [templateProducts]);

  // STORY-69 / STORY-119: Catalog summary — sent to agent on every message.
  // STORY-119: sampleNames removed — agent now uses query+hintCategories and the server
  // calls catalog.selectProducts which reads actual product data. No vocabulary guessing needed.
  const catalogSummary = useMemo((): CatalogSummary => {
    const categoryMap = new Map<string, number>();
    for (const p of products) {
      const cat = p.category ?? 'Bez klasifikacije';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return {
      totalProducts: products.length,
      selectedCount: selectedProductIndices.size,
      categories,
    };
  }, [products, selectedProductIndices]);

  /**
   * STORY-55: original product indices corresponding to each templateProducts entry.
   * templateProductOriginalIndices[j] = index in `products` for templateProducts[j].
   * Used by AdCanvasEditor to route photo assignment back to the correct product.
   */
  const templateProductOriginalIndices = useMemo((): number[] => {
    if (products.length === 0) return [];
    return products
      .map((_, i) => i)
      .filter((i) => selectedProductIndices.has(i));
  }, [products, selectedProductIndices]);

  /** STORY-131: Single source for footer — same footerConfig/footerEnabled feeds canvas band, buildTemplateData (preview + export). Footer = canvas bottom → preview end → export end. */
  const buildTemplateData = useCallback(
    (productsSlice: ProductItem[]) =>
      ({
        companyLogoDataUri: currentCompanyLogoDataUri,
        title: adHeadline.trim() || 'Your Ad',
        titleFontSize: adTitleFontSize,
        products: productsSlice,
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
        footer: footerEnabled ? footerConfig : undefined,
      } as const),
    [
      currentCompanyLogoDataUri,
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
      footerEnabled,
      footerConfig,
      selectedLayout,
      selectedFormat,
      selectedStyle,
    ],
  );

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
    return renderAdTemplate(buildTemplateData(templateProducts));
  }, [templateProducts, buildTemplateData, adCtaButtons]);

  /** STORY-127: When multi-page, one HTML per page for export (each with footer). */
  const exportPages = useMemo(
    () => getPages(templateProducts.length, selectedFormat, adProductBlockOptions.columns),
    [templateProducts.length, selectedFormat, adProductBlockOptions.columns],
  );
  const htmlPerPage = useMemo(() => {
    if (exportPages.length <= 1) return undefined;
    return exportPages.map((page) => {
      const productsForPage = page.productIndices.map((i) => templateProducts[i]!);
      return renderAdTemplate(buildTemplateData(productsForPage));
    });
  }, [exportPages, templateProducts, buildTemplateData]);

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

  // Track viewport size for full-screen preview (STORY-101)
  useEffect(() => {
    const handler = () =>
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
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
    setSelectedProductIndicesFromAgent(new Set(config.products.map((_, i) => i)));
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

  /** Single-level undo snapshot — shared by main chat apply and proactive suggestion apply (STORY-166). */
  const buildCanvasUndoSnapshot = useCallback(
    () => ({
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
    }),
    [
      adHeadline,
      adTitleFontSize,
      adEmojiOrIcon,
      adBadgeText,
      adCtaButtons,
      adDisclaimerText,
      adElementOrder,
      selectedLayout,
      selectedStyle,
      selectedFormat,
      adLogoHeight,
      adLogoAlignment,
      adLogoCompanion,
      adProductBlockOptions,
      selectedProductIndices,
    ],
  );

  /** STORY-62: Conversational AI agent chat send handler. */
  const handleChatSend = useCallback(async (userMessage: string): Promise<void> => {
    if (!isRetailPromo(agent)) return;

    const apiKey = getResolvedLlmApiKey();
    if (!apiKey) {
      setChatError(
        'No API key configured. Add one in Settings → Connections, or set VITE_IONET_API_KEY in your environment.',
      );
      return;
    }

    // STORY-123: Assign this turn an id so we only apply its response (ignore stale responses).
    const thisTurnId = ++chatTurnIdRef.current;

    const snapshot = buildCanvasUndoSnapshot();

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
      // STORY-68 / STORY-108: Run vision analysis once per product set (silent, non-blocking).
      // filterVisionImageUris strips external HTTP URLs (e.g. Mobileland catalog images)
      // — only base64 data: URIs are safe for the io.net vision server.
      const imageUris = filterVisionImageUris(templateProducts.map((p) => p.imageDataUri));

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

      const { message, actions, emptyActionsLogReason } = await sendChatMessage({
        apiKey,
        model: chatModel,
        modelPair: resolveModelPairForMode(chatModel),
        history: historyForApi,
        canvasState,
        userMessage,
        userBrief: readAgentBrief() || undefined,
      });

      // STORY-123: Ignore response if a newer turn started (e.g. user sent another message).
      if (chatTurnIdRef.current !== thisTurnId) {
        setChatMessages((prev) => prev.slice(0, -1));
        setChatPending(false);
        return;
      }

      const cfText = extractLastCatalogFilterQueryText(actions);
      if (cfText) setLastAgentCatalogFilterQuery(cfText);

      // Save undo snapshot (now that we're about to apply changes)
      setUndoSnapshot(snapshot);

      // STORY-119: Resolve any catalog_filter(query) actions server-side before applying.
      // This replaces client-side string matching with LLM product selection.
      const resolvedActions = await resolveCatalogFilterActions(actions);

      // Apply all agent actions to canvas state (flushSync so canvas updates immediately).
      if (resolvedActions.length > 0) {
        flushSync(() => {
          applyAgentActions(resolvedActions, {
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
            setSelectedProductIndices: setSelectedProductIndicesFromAgent,
            allProducts: products,
            searchIndex: searchIndexRef.current,
          });
        });
      }

      if (resolvedActions.some((a) => a.type === 'catalog_filter')) {
        lastAgentCatalogSelectionRef.current =
          collectResolvedIndicesFromCatalogActions(resolvedActions) ?? new Set();
      }

      // STORY-210: Check if any catalog_filter action failed (has _debugReason).
      // If so, append a corrective follow-up so the user isn't misled by the agent's
      // tentative message that preceded the search.
      const failedFilters = resolvedActions.filter(
        (a) =>
          a.type === 'catalog_filter' &&
          !!(a.payload as Record<string, unknown>)?._debugReason,
      );
      let correctedMessage = message || 'Done!';
      if (failedFilters.length > 0) {
        const reasons = failedFilters
          .map((a) => (a.payload as Record<string, unknown>)._debugReason as string)
          .join('; ');
        correctedMessage = `${correctedMessage}\n\n⚠️ ${reasons}\nPoku\u0161ajte s drugim pojmom za pretragu, ili ru\u010dno odaberite proizvode iz kataloga.`;
      }

      const agentMsg: ConversationMessage = {
        role: 'assistant',
        content: correctedMessage,
        actions: resolvedActions,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, agentMsg]);

      if (isRetailPromo(agent)) {
        logRetailPromoEvent('ai_chat_message', {
          actionsCount: actions.length,
          model: chatModel,
          ...(emptyActionsLogReason && { emptyActionsReason: emptyActionsLogReason }),
        });
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
    agent,
    chatModel,
    chatMessages,
    buildCanvasUndoSnapshot,
    productImageAnalysis,
    imageAnalysisRan,
    catalogSummary,
    templateProducts,
    products,
    resolveCatalogFilterActions,
    setSelectedProductIndicesFromAgent,
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
    setSelectedProductIndicesFromAgent(undoSnapshot.selectedProductIndices);
    setUndoSnapshot(null); // one-level undo — clear after use
  }, [undoSnapshot]);

  /** STORY-62 Phase 2: Apply suggestion — run actions and remove the suggestion message. */
  const handleApplySuggestion = useCallback(
    async (timestamp: number, actions: AgentAction[]) => {
      const raw = lastProactiveSuggestionTextRef.current;
      if (raw && isRetailPromo(agent)) {
        logRetailPromoEvent('suggestion_apply', {
          actionsCount: actions.length,
          tipKeyHash: hashProactiveSuggestionTipForAnalytics(raw),
        });
      }
      if (raw) {
        const k = proactiveSuggestionDedupKey(raw);
        if (k) {
          recentDismissedSuggestionKeysRef.current = rememberDismissedSuggestionKey(
            recentDismissedSuggestionKeysRef.current,
            k,
          );
        }
        lastProactiveSuggestionTextRef.current = '';
      }
      const cfFromSuggestion = extractLastCatalogFilterQueryText(actions);
      if (cfFromSuggestion) setLastAgentCatalogFilterQuery(cfFromSuggestion);
      if (actions.length > 0) {
        setUndoSnapshot(buildCanvasUndoSnapshot());
        /** STORY-163: Same Meilisearch + selectProducts pipeline as main chat — avoids legacy catalog_filter selecting thousands. */
        const resolved = await resolveCatalogFilterActions(actions);
        flushSync(() => {
          applyAgentActions(resolved, {
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
            setSelectedProductIndices: setSelectedProductIndicesFromAgent,
            allProducts: products,
            searchIndex: searchIndexRef.current,
          });
        });
        if (resolved.some((a) => a.type === 'catalog_filter')) {
          lastAgentCatalogSelectionRef.current =
            collectResolvedIndicesFromCatalogActions(resolved) ?? new Set();
        }
      }
      setChatMessages((prev) => prev.filter((m) => m.timestamp !== timestamp));
    },
    [
      agent,
      products,
      resolveCatalogFilterActions,
      buildCanvasUndoSnapshot,
      setSelectedProductIndicesFromAgent,
    ],
  );

  /** STORY-62 Phase 2: Dismiss suggestion — remove the message. */
  const handleDismissSuggestion = useCallback((timestamp: number) => {
    const raw = lastProactiveSuggestionTextRef.current;
    if (raw && isRetailPromo(agent)) {
      logRetailPromoEvent('suggestion_dismiss', {
        tipKeyHash: hashProactiveSuggestionTipForAnalytics(raw),
      });
    }
    if (raw) {
      const k = proactiveSuggestionDedupKey(raw);
      if (k) {
        recentDismissedSuggestionKeysRef.current = rememberDismissedSuggestionKey(
          recentDismissedSuggestionKeysRef.current,
          k,
        );
      }
      lastProactiveSuggestionTextRef.current = '';
    }
    setChatMessages((prev) => prev.filter((m) => m.timestamp !== timestamp));
  }, [agent]);

  /** STORY-169: Pause proactive tips until resume or full reload (does not disable main Suggestions toggle). */
  const handleProactiveSessionMuteToggle = useCallback(() => {
    setProactiveSuggestionsSessionMuted((prev) => {
      const next = !prev;
      if (isRetailPromo(agent)) {
        logRetailPromoEvent('proactive_suggestions_session_mute', { muted: next });
      }
      return next;
    });
  }, [agent]);

  /** STORY-62 Phase 2: Proactive suggestions — debounced, throttled; STORY-167: activity-aware debounce + dedup. */
  useEffect(() => {
    if (!isRetailPromo(agent)) return;
    const apiKey = getResolvedLlmApiKey();
    if (!apiKey) return;

    const prevEdit = lastCanvasEditForSuggestionRef.current;
    const effectNow = Date.now();
    lastCanvasEditForSuggestionRef.current = effectNow;
    const debounceMs =
      prevEdit > 0 && effectNow - prevEdit < PROACTIVE_SUGGESTION_RECENT_ACTIVITY_WINDOW_MS
        ? PROACTIVE_SUGGESTION_DEBOUNCE_ACTIVE_MS
        : PROACTIVE_SUGGESTION_DEBOUNCE_IDLE_MS;

    const timer = setTimeout(() => {
      if (!suggestionsEnabled || proactiveSuggestionsSessionMuted || chatPending) return;
      const now = Date.now();
      const lastEdit = lastCanvasEditForSuggestionRef.current;
      const recentlyActive =
        lastEdit > 0 && now - lastEdit < PROACTIVE_SUGGESTION_RECENT_ACTIVITY_WINDOW_MS;
      const minGap = recentlyActive
        ? PROACTIVE_SUGGESTION_MIN_INTERVAL_DURING_ACTIVITY_MS
        : PROACTIVE_SUGGESTION_MIN_INTERVAL_IDLE_MS;
      if (now - lastSuggestionTimeRef.current < minGap) return;
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
      requestProactiveSuggestion({
        apiKey,
        model: chatModel === 'custom' ? 'smart' : chatModel,
        modelPair: resolveModelPairForMode(chatModel),
        canvasState,
        userBrief: readAgentBrief() || undefined,
      })
        .then(({ message, actions }) => {
          if (!message && actions.length === 0) return;
          if (
            message &&
            shouldSkipProactiveSuggestionForRecentDismissals(
              message,
              recentDismissedSuggestionKeysRef.current,
            )
          ) {
            if (isRetailPromo(agent)) {
              logRetailPromoEvent('suggestion_skipped_dedup', {
                tipKeyHash: hashProactiveSuggestionTipForAnalytics(message),
              });
            }
            return;
          }
          lastProactiveSuggestionTextRef.current = message || '';
          if (isRetailPromo(agent)) {
            logRetailPromoEvent('suggestion_shown', {
              actionsCount: actions.length,
              ...(message ? { tipKeyHash: hashProactiveSuggestionTipForAnalytics(message) } : {}),
            });
          }
          const suggestionMsg: ConversationMessage = {
            role: 'assistant',
            content: message || 'Suggestion',
            actions,
            timestamp: Date.now(),
            isSuggestion: true,
          };
          setChatMessages((prev) => [...prev.filter((m) => !m.isSuggestion), suggestionMsg]);
        })
        .catch((err: unknown) => {
          if (isRetailPromo(agent)) {
            const message = err instanceof Error ? err.message.slice(0, 200) : 'unknown';
            logRetailPromoEvent('suggestion_api_error', { message });
          }
        });
    }, debounceMs);

    suggestionDebounceRef.current = timer;
    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    };
  }, [
    agent,
    suggestionsEnabled,
    proactiveSuggestionsSessionMuted,
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
    llmApiKeyRevision,
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
      const apiKey = getResolvedLlmApiKey();

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
        footer: footerEnabled ? footerConfig : undefined,
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

  const previewHtmlToShow = getPreviewHtmlToShow(generatedHtml, livePreviewHtml, htmlPerPage, currentPageIndex);

  const isPortraitFormat = selectedFormat.height > selectedFormat.width;
  const desktopContainerWidth = isPortraitFormat
    ? PORTRAIT_CONTAINER_WIDTH
    : 400;

  // Full-screen preview container width (STORY-101): fit the ad into available viewport
  const previewContainerWidth = useMemo(() => {
    if (canvasMode !== 'preview') {
      return isPortraitFormat ? PORTRAIT_CONTAINER_WIDTH - 16 : desktopContainerWidth;
    }
    const adW = selectedFormat.width;
    const adH = selectedFormat.height;
    const maxW = viewportSize.width - 48;
    const maxH = viewportSize.height - 160; // ~60px header + ~100px footer/padding
    const scale = Math.min(maxW / adW, maxH / adH, 1);
    return Math.round(adW * scale);
  }, [canvasMode, selectedFormat, viewportSize, isPortraitFormat, desktopContainerWidth]);

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
            canvasMode === 'preview' || !leftPanelOpen
              ? 'lg:w-0 lg:overflow-hidden lg:border-r-0'
              : 'lg:w-[380px]'
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
                onRemoveBrandLogoFromAd={
                  isRetailPromo(agent)
                    ? (index) => setBrandLogoDataUris((prev) => prev.filter((_, i) => i !== index))
                    : undefined
                }
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
              {mobilelandCodeMismatchBanner && (
                <div
                  data-testid="mobileland-sku-mismatch-banner"
                  className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Nema podudaranja za Mobileland slike.</strong> Kolona šifre mora biti{' '}
                    <strong>Magento SKU</strong> (ili numeric <strong>entity ID</strong> iz admina /{' '}
                    <strong>url_key</strong> ako se razlikuje od SKU) — isti identitet kao u REST API-ju i u URL-u
                    proizvoda na mobileland.me. Interni ERP kod (npr. drugačiji broj od SKU) neće učitati sliku.
                    Provjeri jedan proizvod u{' '}
                    <a
                      href="https://mobileland.me/catalogsearch/result/?q=teracell+auto+punjac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
                    >
                      pretrazi
                    </a>
                    : SKU u Magento-u često je duži ili drugačiji broj od kolone u tvom Excelu.
                  </span>
                </div>
              )}
              <Suspense fallback={<SectionLoader />}>
                <ProductDataInput
                  products={products}
                  onProductsChange={setProducts}
                  images={productImages}
                  onImagesChange={setProductImages}
                  selectedIndices={selectedProductIndices}
                  onSelectionChange={setSelectedProductIndicesFromUser}
                  onVisibleIndicesChange={setVisibleProductIndices}
                  searchFeedbackEnabled={
                    isRetailPromo(agent) && Boolean(lastAgentCatalogFilterQuery.trim())
                  }
                  onSearchFeedbackExplicit={handleSearchFeedbackExplicit}
                  sharedSearchIndex={undefined}
                  searchIndexVersion={0}
                  catalogSearchQuery={catalogSearchQuery}
                  onCatalogSearchQueryChange={setCatalogSearchQuery}
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

          {/* STORY-109: Footer configuration accordion */}
          <AccordionStep
            index={3}
            active={activeStep === 3}
            onToggle={() => setActiveStep(3)}
            title="Footer"
            summary={footerEnabled ? 'On' : 'Off'}
            colors={colors}
            isLast
          >
            <div className="space-y-3">
              {/* Enable toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={footerEnabled}
                  onChange={(e) => {
                    setFooterEnabled(e.target.checked);
                    setFooterConfig((c) => ({ ...c, enabled: e.target.checked }));
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 accent-orange-500"
                  data-testid="footer-enabled-toggle"
                />
                <span className="text-sm text-gray-300">Show footer on ad</span>
              </label>

              {footerEnabled && (
                <div className="space-y-2" data-testid="footer-fields">
                  {/* Company name */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Company name</label>
                    <input
                      type="text"
                      placeholder="Mobileland"
                      value={footerConfig.companyName ?? ''}
                      onChange={(e) => setFooterConfig((c) => ({ ...c, companyName: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      data-testid="footer-company-name"
                    />
                  </div>
                  {/* Phone */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Phone</label>
                    <input
                      type="text"
                      placeholder="+387 61 123 456"
                      value={footerConfig.contact?.phone ?? ''}
                      onChange={(e) =>
                        setFooterConfig((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      data-testid="footer-phone"
                    />
                  </div>
                  {/* Website */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Website</label>
                    <input
                      type="text"
                      placeholder="https://yourstore.com"
                      value={footerConfig.contact?.website ?? ''}
                      onChange={(e) =>
                        setFooterConfig((c) => ({ ...c, contact: { ...c.contact, website: e.target.value } }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      data-testid="footer-website"
                    />
                  </div>
                  {/* Address */}
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Address (optional)</label>
                    <input
                      type="text"
                      placeholder="Str. 15, Sarajevo"
                      value={footerConfig.contact?.address ?? ''}
                      onChange={(e) =>
                        setFooterConfig((c) => ({ ...c, contact: { ...c.contact, address: e.target.value } }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                      data-testid="footer-address"
                    />
                  </div>
                  {/* Colors */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-400">Background</label>
                      <input
                        type="color"
                        value={footerConfig.backgroundColor ?? '#1a1a1a'}
                        onChange={(e) => setFooterConfig((c) => ({ ...c, backgroundColor: e.target.value }))}
                        className="h-8 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 p-0.5"
                        data-testid="footer-bg-color"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-400">Text color</label>
                      <input
                        type="color"
                        value={footerConfig.textColor ?? '#ffffff'}
                        onChange={(e) => setFooterConfig((c) => ({ ...c, textColor: e.target.value }))}
                        className="h-8 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 p-0.5"
                        data-testid="footer-text-color"
                      />
                    </div>
                  </div>

                  {/* Save this footer + Saved footers (same pattern as logos) */}
                  {isRetailPromo(agent) && (
                    <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
                        <BookmarkPlus className="h-3.5 w-3.5 text-orange-500/80" />
                        Saved footers
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          saveFooter({
                            config: { ...footerConfig, enabled: true, options: footerConfig.options ?? [] },
                            name: footerConfig.companyName?.trim() || undefined,
                          });
                          setSavedFooters(getSavedFooters());
                        }}
                        data-testid="save-current-footer"
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-medium text-gray-300 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 disabled:opacity-60"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" />
                        Save this footer
                      </button>
                      {isSavedFootersFull() && (
                        <p className="text-xs text-gray-500">Max saved footers reached. Saving will replace the oldest.</p>
                      )}
                      {savedFooters.length > 0 && (
                        <ul className="space-y-2" role="list" aria-label="Saved footers">
                          {savedFooters.map((saved) => (
                            <li
                              key={saved.id}
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setFooterConfig(saved.config);
                                  setFooterEnabled(!!saved.config.enabled);
                                }}
                                className="min-w-0 flex-1 truncate rounded p-1 text-left text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                data-testid={`use-saved-footer-${saved.id}`}
                                aria-label={`Use ${saved.name}`}
                              >
                                {saved.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  removeSavedFooter(saved.id);
                                  setSavedFooters(getSavedFooters());
                                }}
                                data-testid={`remove-saved-footer-${saved.id}`}
                                aria-label={`Remove ${saved.name} from saved`}
                                className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
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

        {/* Panel Toggle Button — hidden in preview mode */}
        {canvasMode === 'edit' && (
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
        )}

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
                  selectionCatalogProducts={products}
                  catalogSearchQuery={catalogSearchQuery}
                  onCatalogSearchQueryChange={setCatalogSearchQuery}
                  lastAgentCatalogFilterQuery={lastAgentCatalogFilterQuery}
                  onCatalogSync={(list) => {
                    const q = catalogSearchQuery.trim();
                    const next = filterImportedCatalogByActiveSearch(list, catalogSearchQuery);
                    if (q && isRetailPromo(agent) && list.length !== next.length) {
                      logRetailPromoEvent('catalog_import_filtered', {
                        resolvedCount: list.length,
                        productCount: next.length,
                      });
                    }
                    setProducts(next);
                    setSelectedProductIndicesFromAgent(new Set(next.map((_, i) => i)));
                    if (q && next.length === 0) {
                      setChatError(
                        `Catalog import: no rows matched your search (“${q.length > 80 ? `${q.slice(0, 80)}…` : q}”). Clear the search in Add Products and sync again to load the full catalog.`,
                      );
                    }
                  }}
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
                  onSwapCanvasProduct={
                    isRetailPromo(agent)
                      ? (canvasIdx, sourceCatalogIndex) => {
                          const origIdx = templateProductOriginalIndices[canvasIdx];
                          if (origIdx === undefined) return;
                          if (sourceCatalogIndex === origIdx) return;
                          setProducts((prev) => {
                            const next = [...prev];
                            const src = prev[sourceCatalogIndex];
                            if (!src) return prev;
                            next[origIdx] = { ...src };
                            return next;
                          });
                          setWebImageSelections((prev) => {
                            if (prev[origIdx] === undefined) return prev;
                            const n = { ...prev };
                            delete n[origIdx];
                            return n;
                          });
                        }
                      : undefined
                  }
                  templateProductCatalogIndices={
                    isRetailPromo(agent) ? templateProductOriginalIndices : undefined
                  }
                  chatMessages={isRetailPromo(agent) ? chatMessages : undefined}
                  onChatSend={isRetailPromo(agent) ? handleChatSend : undefined}
                  chatPending={chatPending}
                  chatError={chatError}
                  chatModel={chatModel}
                  onChatModelChange={handleChatModelChange}
                  showChatWorkspaceTools={isRetailPromo(agent)}
                  chatStarterPrompts={isRetailPromo(agent) ? RETAIL_PROMO_CHAT_STARTERS : undefined}
                  onChatUndo={handleChatUndo}
                  canChatUndo={undoSnapshot !== null}
                  suggestionsEnabled={suggestionsEnabled}
                  onSuggestionsToggle={setSuggestionsEnabled}
                  proactiveSessionMuted={proactiveSuggestionsSessionMuted}
                  onProactiveSessionMuteToggle={handleProactiveSessionMuteToggle}
                  onApplySuggestion={handleApplySuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  footer={footerEnabled ? footerConfig : undefined}
                  onFooterChange={setFooterConfig}
                  format={selectedFormat}
                  htmlPerPage={htmlPerPage}
                  currentPageIndex={currentPageIndex}
                  onCurrentPageChange={setCurrentPageIndex}
                />
              ) : previewHtmlToShow ? (
                <div
                  data-testid="ad-preview-frame-wrapper"
                  className="flex flex-col items-center justify-center gap-4 p-6 min-h-full"
                >
                  <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/40">
                    <Suspense fallback={<SectionLoader />}>
                      <AdPreviewFrameLazy
                        html={previewHtmlToShow}
                        format={selectedFormat}
                        containerWidth={previewContainerWidth}
                      />
                    </Suspense>
                  </div>
                  <p
                    data-testid="preview-format-label"
                    className={PREVIEW_FORMAT_LABEL_CLASS}
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
