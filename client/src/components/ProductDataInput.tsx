import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { FileSpreadsheet, ClipboardPaste, PenLine, Upload, AlertCircle, CheckCircle2, Globe, Info, ImagePlus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { parseText } from '../lib/text-parser';
import { parseExcelFile } from '../lib/excel-parser';
import { filterImportedCatalogByActiveSearch } from '../lib/product-selection-panel-filters';
import { checkFileSize, formatFileSize, formatParseSummary } from '../lib/parse-utils';
import type { ParseStats } from '../lib/parse-utils';
import { isMobilelandImageEnabled } from '../lib/mobileland-images';
import ProductTable from './ProductTable';
import ProductFilter from './ProductFilter';
import ProductImageUploader, { type ImageEntry } from './ProductImageUploader';
import type { ProductItem } from '../lib/ad-templates';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';
import { UrlJsonAdapter } from '../lib/product-source-adapter';
import { fileToBase64DataUri } from '../lib/file-to-base64';
import {
  buildSearchIndex,
  queryProductIndicesWithManualFallback,
  type ProductSearchIndex,
} from '../lib/product-index';
import { getCatalogMinScoreForQuery, type SearchSource } from '../lib/product-search-min-score';
import {
  SEARCH_SETTINGS_CHANGED_EVENT,
  SEARCH_SETTINGS_STORAGE_KEY,
} from '../lib/search-settings-storage';
import { applySearchRulesToIndices } from '../lib/apply-search-rules';
import { normalizeSearchQueryForPipeline } from '../lib/normalize-search-query';
import { SEARCH_RULES_CHANGED_EVENT, readSearchRules } from '../lib/search-rules-storage';
import { SEARCH_RULES_RAG_LITE_CHANGED_EVENT } from '../lib/search-rules-rag-lite-settings';

type Tab = 'excel' | 'paste' | 'manual' | 'url';

function getProductClassificationValue(p: ProductItem, dimension: string): string {
  if (dimension === 'category') return p.category?.trim() ?? '';
  if (dimension === 'brand') return p.brand?.trim() ?? '';
  return p.classifications?.[dimension]?.trim() ?? '';
}

export interface ProductDataInputEventCallbacks {
  onExcelUploadStart?: () => void;
  onExcelUploadSuccess?: (productCount: number) => void;
  onExcelUploadFailure?: (reason: string) => void;
  onPasteProducts?: (productCount: number) => void;
}

interface ProductDataInputProps {
  products: ProductItem[];
  onProductsChange: (products: ProductItem[]) => void;
  images: ImageEntry[];
  onImagesChange: (images: ImageEntry[]) => void;
  eventCallbacks?: ProductDataInputEventCallbacks | null;
  selectedIndices?: Set<number>;
  onSelectionChange?: (indices: Set<number>) => void;
  /** Called when the set of visible (filtered) product indices changes. Used so the preview can show only selected + visible. */
  onVisibleIndicesChange?: (indices: number[]) => void;
  /** Locale for number/price formatting (e.g. en-US, sr-RS, de-DE). Default en-US. */
  locale?: string;
  /** STORY-54: saved product photos and callbacks for ProductImageUploader */
  savedProductPhotos?: SavedProductPhotoEntry[];
  currentProductPhotoDataUris?: string[];
  /** Called when the user saves a photo to the library. Optional metadata (code, price) comes from manual entry. */
  onSavePhoto?: (dataUri: string, name?: string, metadata?: { code?: string; price?: string }) => void;
  onSelectSavedPhoto?: (id: string) => void;
  onRemoveSavedPhoto?: (id: string) => void;
  isSavedProductPhotosFull?: boolean;
  /** STORY-55: called when user assigns a photo directly to a product row via the picker. */
  onAssignProductPhoto?: (index: number, dataUri: string) => void;
  /**
   * STORY-122 P-2: shared MiniSearch index built by the parent (AgentChat).
   * When provided, this component skips rebuilding the index, halving memory and CPU cost.
   * When absent (standalone use), the component builds its own index as before.
   */
  sharedSearchIndex?: React.RefObject<ProductSearchIndex | null>;
  /**
   * STORY-124: When using sharedSearchIndex, pass the parent's indexVersion so
   * visibleIndices recomputes when the index is rebuilt (e.g. after catalog load).
   */
  searchIndexVersion?: number;
  /**
   * STORY-181: Lift search string to parent so Products tab shares the same query + MiniSearch alignment.
   */
  catalogSearchQuery?: string;
  onCatalogSearchQueryChange?: (q: string) => void;
  /** STORY-200: explicit thumbs vs last agent catalog_filter query (parent hashes in telemetry). */
  searchFeedbackEnabled?: boolean;
  onSearchFeedbackExplicit?: (index: number, relevant: boolean) => void;
}

export default function ProductDataInput({
  products,
  onProductsChange,
  images,
  onImagesChange,
  eventCallbacks,
  selectedIndices,
  onSelectionChange,
  onVisibleIndicesChange,
  locale = 'en-US',
  savedProductPhotos = [],
  currentProductPhotoDataUris = [],
  onSavePhoto,
  onSelectSavedPhoto,
  onRemoveSavedPhoto,
  isSavedProductPhotosFull = false,
  onAssignProductPhoto,
  sharedSearchIndex,
  searchIndexVersion = 0,
  catalogSearchQuery,
  onCatalogSearchQueryChange,
  searchFeedbackEnabled = false,
  onSearchFeedbackExplicit,
}: ProductDataInputProps) {
  const [activeTab, setActiveTab] = useState<Tab>('excel');
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Parsing file…');
  const [parseSummary, setParseSummary] = useState<string | null>(null);
  const [lastParseStats, setLastParseStats] = useState<ParseStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualWholesale, setManualWholesale] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualPhoto, setManualPhoto] = useState<File | null>(null);
  const [manualPhotoPreview, setManualPhotoPreview] = useState<string | null>(null);
  const manualPhotoRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const [internalSearchInput, setInternalSearchInput] = useState('');
  const isSearchControlled =
    catalogSearchQuery !== undefined && onCatalogSearchQueryChange !== undefined;
  const searchInputValue = isSearchControlled ? catalogSearchQuery : internalSearchInput;
  const setSearchInputValue = useCallback(
    (v: string) => {
      if (isSearchControlled) onCatalogSearchQueryChange!(v);
      else setInternalSearchInput(v);
    },
    [isSearchControlled, onCatalogSearchQueryChange],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('manual');
  /** Bumps when Workspace Settings → Search thresholds change so visibleIndices recomputes. */
  const [searchSettingsEpoch, setSearchSettingsEpoch] = useState(0);
  /** STORY-196: bumps when search exclude/downrank rules change. */
  const [searchRulesEpoch, setSearchRulesEpoch] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({});
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const interpretSearch = trpc.catalog.interpretProductSearch.useMutation();
  // P-2: use the shared index from parent when available; build locally only when standalone.
  const localSearchIndexRef = useRef<ProductSearchIndex | null>(null);
  const searchIndexRef = sharedSearchIndex ?? localSearchIndexRef;

  const DEBOUNCE_MS = 200;
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInputValue), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInputValue]);

  useEffect(() => {
    const bump = () => setSearchSettingsEpoch((n) => n + 1);
    const bumpRules = () => setSearchRulesEpoch((n) => n + 1);
    window.addEventListener(SEARCH_SETTINGS_CHANGED_EVENT, bump);
    window.addEventListener(SEARCH_RULES_CHANGED_EVENT, bumpRules);
    window.addEventListener(SEARCH_RULES_RAG_LITE_CHANGED_EVENT, bumpRules);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SEARCH_SETTINGS_STORAGE_KEY) bump();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SEARCH_SETTINGS_CHANGED_EVENT, bump);
      window.removeEventListener(SEARCH_RULES_CHANGED_EVENT, bumpRules);
      window.removeEventListener(SEARCH_RULES_RAG_LITE_CHANGED_EVENT, bumpRules);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (sharedSearchIndex !== undefined) return; // parent owns the index — no local rebuild
    if (products.length === 0) {
      localSearchIndexRef.current = null;
    } else {
      localSearchIndexRef.current = buildSearchIndex(products);
    }
  }, [products, sharedSearchIndex]);

  const showSelection = selectedIndices !== undefined && onSelectionChange !== undefined;

  const classificationCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    const add = (dim: string, value: string) => {
      if (!value) return;
      if (!counts[dim]) counts[dim] = {};
      counts[dim][value] = (counts[dim][value] ?? 0) + 1;
    };
    for (const p of products) {
      if (p.category?.trim()) add('category', p.category.trim());
      if (p.brand?.trim()) add('brand', p.brand.trim());
      if (p.classifications) {
        for (const [k, v] of Object.entries(p.classifications)) {
          if (v?.trim()) add(k, v.trim());
        }
      }
    }
    return counts;
  }, [products]);

  const dimensionOrder = useMemo(
    () => ['category', 'brand', ...Object.keys(classificationCounts).filter((k) => !['category', 'brand'].includes(k)).sort()],
    [classificationCounts],
  );

  const categories = useMemo(() => {
    const cats = classificationCounts.category ?? {};
    return Object.keys(cats).sort();
  }, [classificationCounts]);

  const categoryCounts = useMemo(() => classificationCounts.category ?? {}, [classificationCounts]);

  // STORY-124: when using shared index, depend on searchIndexVersion so we
  // recompute when the parent's index is rebuilt (ref update doesn't trigger re-render).
  const visibleIndices = useMemo(() => {
    const q = normalizeSearchQueryForPipeline(searchQuery);
    let filtered = products.map((_, i) => i);

    if (q && searchIndexRef.current) {
      // Q-1: minScore from settings; STORY-182: fallback when strict threshold yields 0 hits.
      const minScore = getCatalogMinScoreForQuery(q, searchSource);
      let idxs = queryProductIndicesWithManualFallback(
        searchIndexRef.current,
        products,
        q,
        minScore,
      );
      // STORY-196: post-process exclude / downrank rules (same query normalization as Settings rules).
      idxs = applySearchRulesToIndices(q, idxs, products, readSearchRules());
      filtered = idxs;
    }

    // Apply classification filters
    filtered = filtered.filter((i) => {
      const p = products[i];
      for (const dim of Object.keys(activeFilters)) {
        const active = activeFilters[dim];
        if (!active || active.size === 0) continue;
        const val = getProductClassificationValue(p, dim);
        if (!active.has(val)) return false;
      }
      return true;
    });

    return filtered;
  }, [
    products,
    searchQuery,
    searchSource,
    activeFilters,
    sharedSearchIndex !== undefined ? searchIndexVersion : 0,
    searchSettingsEpoch,
    searchRulesEpoch,
  ]);

  useEffect(() => {
    onVisibleIndicesChange?.(visibleIndices);
  }, [visibleIndices, onVisibleIndicesChange]);

  const handleToggleSelect = (index: number) => {
    if (!selectedIndices || !onSelectionChange) return;
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onSelectionChange(next);
  };

  const handleSelectAllVisible = () => {
    if (!selectedIndices || !onSelectionChange) return;
    const next = new Set(selectedIndices);
    for (const i of visibleIndices) next.add(i);
    onSelectionChange(next);
  };

  const handleDeselectAllVisible = () => {
    if (!selectedIndices || !onSelectionChange) return;
    const next = new Set(selectedIndices);
    for (const i of visibleIndices) next.delete(i);
    onSelectionChange(next);
  };

  const handleFiltersChange = useCallback((dimension: string, values: Set<string>) => {
    setActiveFilters((prev) => ({ ...prev, [dimension]: values }));
  }, []);

  const handleAiSearch = useCallback(
    async (query: string) => {
      const qn = normalizeSearchQueryForPipeline(query);
      if (!qn || products.length === 0) return;
      setSearchSource('ai');
      setAiSearchLoading(true);
      try {
        const catCounts = classificationCounts.category ?? {};
        const categories = Object.entries(catCounts).map(([name, count]) => ({ name, count: count ?? 0 }));
        // 5 names per category up to 60 total — same strategy as AgentChat.catalogSummary.
        // Ensures the LLM sees vocabulary from all parts of the catalog, not just the first 40 rows.
        const sampleNames: string[] = [];
        const seenCatCount = new Map<string, number>();
        for (const p of products) {
          if (sampleNames.length >= 60) break;
          const cat = p.category ?? '';
          const n = seenCatCount.get(cat) ?? 0;
          if (n < 5) {
            const name = p.name?.trim() ?? '';
            if (name) sampleNames.push(name);
            seenCatCount.set(cat, n + 1);
          }
        }
        const result = await interpretSearch.mutateAsync({
          query: qn,
          categories,
          sampleNames,
        });
        setSearchInputValue(result.nameContains ?? '');
        handleFiltersChange(
          'category',
          result.category ? new Set([result.category]) : new Set(),
        );
      } catch {
        // Keep current search on error
      } finally {
        setAiSearchLoading(false);
      }
    },
    [products, classificationCounts.category, interpretSearch, handleFiltersChange, setSearchInputValue],
  );

  const handleSelectOnlyDimensionValue = useCallback(
    (dimension: string, value: string) => {
      if (!onSelectionChange) return;
      setActiveFilters((prev) => ({ ...prev, [dimension]: new Set([value]) }));
      const indices = new Set<number>();
      products.forEach((p, i) => {
        if (getProductClassificationValue(p, dimension) === value) indices.add(i);
      });
      onSelectionChange(indices);
    },
    [products, onSelectionChange],
  );

  const handleDeselectDimensionValue = useCallback(
    (dimension: string, value: string) => {
      if (!selectedIndices || !onSelectionChange) return;
      const next = new Set(selectedIndices);
      products.forEach((p, i) => {
        if (getProductClassificationValue(p, dimension) === value) next.delete(i);
      });
      onSelectionChange(next);
    },
    [products, selectedIndices, onSelectionChange],
  );

  const handleToggleSelectAll = useCallback(
    (visibleIndicesList: number[], select: boolean) => {
      if (!selectedIndices || !onSelectionChange) return;
      const next = new Set(selectedIndices);
      if (select) {
        visibleIndicesList.forEach((i) => next.add(i));
      } else {
        visibleIndicesList.forEach((i) => next.delete(i));
      }
      onSelectionChange(next);
    },
    [selectedIndices, onSelectionChange],
  );

  const showSummary = (stats: ParseStats) => {
    setParseSummary(formatParseSummary(stats));
    setLastParseStats(stats);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'excel', label: 'Upload Excel', icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
    { id: 'paste', label: 'Paste Text', icon: <ClipboardPaste className="h-3.5 w-3.5" /> },
    { id: 'manual', label: 'Add Manually', icon: <PenLine className="h-3.5 w-3.5" /> },
    { id: 'url', label: 'Load from URL', icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  const handleExcelUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      const msg = `Unsupported file format ".${ext}". Please use .xlsx, .xls, or .csv`;
      setError(msg);
      eventCallbacks?.onExcelUploadFailure?.(msg);
      return;
    }

    const sizeError = checkFileSize(file);
    if (sizeError) {
      setError(sizeError);
      eventCallbacks?.onExcelUploadFailure?.(sizeError);
      return;
    }

    eventCallbacks?.onExcelUploadStart?.();
    setIsLoading(true);
    setLoadingMessage(`Parsing ${formatFileSize(file.size)} file…`);
    setError(null);
    setParseSummary(null);

    try {
      const result = await parseExcelFile(file);
      if (result.errors.length > 0) {
        setError(result.errors.join(' '));
        eventCallbacks?.onExcelUploadFailure?.(result.errors.join(' '));
      }
      if (result.products.length > 0) {
        const q = searchInputValue.trim();
        const next =
          q ? filterImportedCatalogByActiveSearch(result.products, searchInputValue) : result.products;
        if (q && next.length === 0) {
          setError(
            `No products match your current search. Clear the search box or adjust the file — ${result.products.length} row(s) were in the file.`,
          );
          eventCallbacks?.onExcelUploadFailure?.('search filter: no matches');
        } else {
          onProductsChange(next);
          showSummary(result.stats);
          eventCallbacks?.onExcelUploadSuccess?.(next.length);
        }
      }
    } catch (err) {
      const msg = 'Failed to parse the file. Please check the format and try again.';
      setError(msg);
      eventCallbacks?.onExcelUploadFailure?.(
        err instanceof Error ? err.message : msg
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteConfirm = () => {
    if (!pasteText.trim()) return;
    setError(null);
    setParseSummary(null);
    const result = parseText(pasteText);
    if (result.products.length === 0) {
      setError('Could not parse any products from the pasted text.');
      return;
    }
    const q = searchInputValue.trim();
    const next =
      q ? filterImportedCatalogByActiveSearch(result.products, searchInputValue) : result.products;
    if (q && next.length === 0) {
      setError(
        `No products match your current search. Clear the search box — ${result.products.length} product(s) were parsed.`,
      );
      return;
    }
    onProductsChange(next);
    showSummary(result.stats);
    eventCallbacks?.onPasteProducts?.(next.length);
    setPasteText('');
  };

  const handleManualPhotoChange = (file: File | null) => {
    if (manualPhotoPreview) URL.revokeObjectURL(manualPhotoPreview);
    if (!file) {
      setManualPhoto(null);
      setManualPhotoPreview(null);
      return;
    }
    const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
    if (!ACCEPTED.includes(file.type)) {
      setError('Photo must be PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo exceeds 10 MB limit.');
      return;
    }
    setManualPhoto(file);
    setManualPhotoPreview(URL.createObjectURL(file));
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) return;
    const item: ProductItem = {
      name: manualName.trim(),
      code: manualCode.trim() || undefined,
      price: manualPrice.trim() || undefined,
      retailPrice: manualPrice.trim() || undefined,
      wholesalePrice: manualWholesale.trim() || undefined,
      category: manualCategory.trim() || undefined,
    };
    onProductsChange([...products, item]);
    if (selectedIndices && onSelectionChange) {
      const next = new Set(selectedIndices);
      next.add(products.length);
      onSelectionChange(next);
    }

    if (manualPhoto) {
      const imgCounter = images.length + 1;
      const newEntry = {
        id: `img-manual-${Date.now()}`,
        file: manualPhoto,
        label: manualName.trim(),
        previewUrl: manualPhotoPreview ?? URL.createObjectURL(manualPhoto),
      };
      onImagesChange([...images, newEntry]);

      if (onSavePhoto && currentProductPhotoDataUris.length >= 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          if (dataUri) {
            onSavePhoto(dataUri, manualName.trim(), {
              code: manualCode.trim() || undefined,
              price: manualPrice.trim() || undefined,
            });
          }
        };
        reader.readAsDataURL(manualPhoto);
      }
    }

    setParseSummary(null);
    setManualName('');
    setManualCode('');
    setManualPrice('');
    setManualWholesale('');
    setManualCategory('');
    setManualPhoto(null);
    setManualPhotoPreview(null);
    if (manualPhotoRef.current) manualPhotoRef.current.value = '';
  };

  const handleUpdateProduct = (
    index: number,
    field: keyof ProductItem,
    value: string,
  ) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    onProductsChange(updated);
  };

  const handleRemoveProduct = (index: number) => {
    onProductsChange(products.filter((_, i) => i !== index));
    if (selectedIndices && onSelectionChange) {
      const next = new Set<number>();
      for (const i of selectedIndices) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      onSelectionChange(next);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1 border border-white/10" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setError(null); setParseSummary(null); setLastParseStats(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
              activeTab === tab.id
                ? 'bg-white/10 text-gray-200 shadow-sm'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'excel' && (
        <div data-testid="panel-excel">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/[0.03] px-4 py-6 text-center text-xs text-gray-500 transition hover:border-orange-500/50 hover:bg-orange-500/5">
            <Upload className="h-5 w-5" />
            <span className="font-medium">
              Drop your Excel/CSV file here, or click to browse
            </span>
            <span className="text-xs text-gray-600">
              .xlsx, .xls, .csv — max 5 MB
            </span>
            <input
              ref={fileInputRef}
              data-testid="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleExcelUpload(e.target.files)}
            />
          </label>
          {searchInputValue.trim() ? (
            <p className="text-[11px] text-amber-400/90" data-testid="excel-search-filter-hint">
              Search is active — only spreadsheet rows that match the search box are added to the catalog.
            </p>
          ) : null}
          {isLoading && (
            <div data-testid="parsing-status" className="mt-2 text-xs text-gray-500">
              {loadingMessage}
            </div>
          )}
        </div>
      )}

      {activeTab === 'paste' && (
        <div data-testid="panel-paste" className="space-y-2">
          <textarea
            data-testid="paste-textarea"
            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
            rows={5}
            placeholder={`Paste your product list here. One product per line (tab or comma: code, name, price).\n\nExamples:\nABC123\tSamsung Galaxy S24\t899\nDEF456\tiPhone 15\t1099\nGHI789\tVezice za mob\t12.50`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            data-testid="paste-confirm-btn"
            onClick={handlePasteConfirm}
            disabled={!pasteText.trim()}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Parse Products
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <div data-testid="panel-manual" className="space-y-3">
          {/* Product fields */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              data-testid="manual-name"
              className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none sm:col-span-1"
              placeholder="Product name *"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <input
              data-testid="manual-code"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              placeholder="Code / SKU"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <input
              data-testid="manual-price"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              placeholder="Retail price"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
            />
            <input
              data-testid="manual-wholesale"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              placeholder="Wholesale price"
              value={manualWholesale}
              onChange={(e) => setManualWholesale(e.target.value)}
            />
            <input
              data-testid="manual-category"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
              placeholder="Category"
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value)}
            />
          </div>

          {/* Optional photo attachment */}
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
              <ImagePlus className="h-3 w-3 text-green-400" />
              <span>Photo <span className="text-gray-600">(optional — attaches image to this product)</span></span>
            </div>
            {manualPhotoPreview ? (
              <div className="flex items-center gap-2">
                <img
                  src={manualPhotoPreview}
                  alt="Product photo preview"
                  data-testid="manual-photo-preview"
                  className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                />
                <button
                  type="button"
                  data-testid="manual-photo-remove"
                  onClick={() => handleManualPhotoChange(null)}
                  className="text-xs text-gray-500 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-2 text-xs text-gray-500 transition hover:border-orange-500/40 hover:bg-orange-500/5">
                <Upload className="h-3 w-3" />
                Attach photo
                <input
                  ref={manualPhotoRef}
                  data-testid="manual-photo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleManualPhotoChange(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <button
            data-testid="manual-add-btn"
            onClick={handleManualAdd}
            disabled={!manualName.trim()}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Add Product
          </button>
        </div>
      )}

      {activeTab === 'url' && (
        <div data-testid="panel-url" className="space-y-2">
          <input
            data-testid="url-input"
            type="url"
            placeholder="https://example.com/catalog.json"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none"
          />
          <button
            data-testid="url-load-btn"
            onClick={async () => {
              if (!urlInput.trim()) return;
              setError(null);
              setUrlLoading(true);
              try {
                const adapter = new UrlJsonAdapter();
                const loaded = await adapter.load({ url: urlInput.trim() });
                if (loaded.length > 0) {
                  onProductsChange(loaded);
                  if (onSelectionChange) onSelectionChange(new Set(loaded.map((_, i) => i)));
                  setParseSummary(`Loaded ${loaded.length} products from URL.`);
                } else {
                  setError('The URL returned no products.');
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load from URL.');
              } finally {
                setUrlLoading(false);
              }
            }}
            disabled={!urlInput.trim() || urlLoading}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {urlLoading ? 'Loading…' : 'Load Products'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          data-testid="product-input-error"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Parse summary banner */}
      {parseSummary && !error && (
        <div
          data-testid="parse-summary"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {parseSummary}
        </div>
      )}

      {/* Mobileland image enrichment notice */}
      {products.length > 0 && lastParseStats != null && (
        isMobilelandImageEnabled()
          ? !lastParseStats.hasProductCodes && (
              <div
                data-testid="mobileland-no-codes-warning"
                className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>No product codes found</strong> — your file has names and discounts but no
                  code/SKU/šifra column. Image auto-fetch from the online catalog requires a product
                  code (e.g. <em>1062776</em>). Add a "Šifra" or "Code" column to enable automatic
                  image enrichment.
                </span>
              </div>
            )
          : lastParseStats.hasProductCodes && (
              <div
                data-testid="mobileland-disabled-warning"
                className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-400"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Product codes detected. Online image enrichment is currently disabled — configure
                  the <code className="font-mono">PUBLIC_MOBILELAND_IMAGE_BASE</code> environment
                  variable to enable automatic image fetching by product code.
                </span>
              </div>
            )
      )}

      {/* Filter + Product Table */}
      {products.length > 0 && (
        <div className="space-y-3">
          <div className="sticky top-0 z-10 -mx-1 bg-gray-950 px-1 pb-2 pt-1">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              {products.length} product{products.length !== 1 ? 's' : ''} loaded
            </div>

            {showSelection && (
              <div
                className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2"
                data-testid="selection-bar"
              >
                <span className="text-xs text-gray-300">
                  <span className="font-semibold text-orange-400">{selectedIndices.size}</span>
                  {' of '}
                  <span className="font-semibold text-gray-300">{products.length}</span>
                  {' selected for ad'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="selection-bar-select-all"
                    onClick={handleSelectAllVisible}
                    className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-orange-400"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    data-testid="selection-bar-deselect-all"
                    onClick={handleDeselectAllVisible}
                    className="flex items-center gap-1 text-xs font-medium text-red-400/90 transition hover:text-red-400"
                    title="Remove all products from ad selection"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
            )}

            {showSelection && (
              <ProductFilter
              searchQuery={searchInputValue}
              onSearchChange={(v) => {
                setSearchSource('manual');
                setSearchInputValue(v);
              }}
              classificationCounts={Object.keys(classificationCounts).length > 0 ? classificationCounts : undefined}
              activeFilters={activeFilters}
              onFiltersChange={handleFiltersChange}
              dimensionOrder={dimensionOrder}
              selectedCount={selectedIndices.size}
              totalCount={products.length}
              visibleCount={visibleIndices.length}
              onSelectAllVisible={handleSelectAllVisible}
              onDeselectAllVisible={handleDeselectAllVisible}
              onSelectOnlyDimensionValue={handleSelectOnlyDimensionValue}
              onDeselectDimensionValue={handleDeselectDimensionValue}
              onDeselectCategory={(cat: string) => handleDeselectDimensionValue('category', cat)}
              expanded={filtersExpanded}
              onExpandedChange={setFiltersExpanded}
              categories={categories}
              categoryCounts={Object.keys(categoryCounts).length > 0 ? categoryCounts : undefined}
              activeCategories={new Set()}
              onCategoriesChange={() => {}}
              onAiSearch={handleAiSearch}
              aiSearchLoading={aiSearchLoading}
            />
            )}
          </div>

          {visibleIndices.length === 0 && searchQuery.trim() && (
            <div
              data-testid="search-empty-state"
              className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-gray-500"
            >
              <span>No products match &quot;{searchQuery.trim()}&quot;.</span>
              {!aiSearchLoading ? (
                <button
                  type="button"
                  data-testid="search-empty-ai-cta"
                  onClick={() => handleAiSearch(searchQuery.trim())}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 transition hover:bg-orange-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.816a2 2 0 00-1.272-1.272L3 12l5.816-1.912a2 2 0 001.272-1.272L12 3z"/></svg>
                  Search with AI
                </button>
              ) : (
                <span className="text-xs text-orange-400">AI is searching…</span>
              )}
            </div>
          )}

          <ProductTable
            products={products}
            onUpdate={handleUpdateProduct}
            onRemove={handleRemoveProduct}
            selectedIndices={selectedIndices}
            onToggleSelect={showSelection ? handleToggleSelect : undefined}
            onToggleSelectAll={showSelection ? handleToggleSelectAll : undefined}
            visibleIndices={visibleIndices}
            locale={locale}
            savedProductPhotos={savedProductPhotos}
            searchFeedbackEnabled={searchFeedbackEnabled}
            onSearchFeedbackExplicit={onSearchFeedbackExplicit}
            onAssignPhoto={onAssignProductPhoto}
            onUploadPhoto={async (index: number, file: File) => {
              try {
                const dataUri = await fileToBase64DataUri(file);
                onAssignProductPhoto?.(index, dataUri);
                const p = products[index];
                onSavePhoto?.(dataUri, p?.name, {
                  code: p?.code,
                  price: p?.retailPrice ?? p?.price,
                });
              } catch {
                // silent — user can retry
              }
            }}
          />
        </div>
      )}

      {/* Product Image Uploader + Saved product photos (STORY-54) */}
      <ProductImageUploader
        images={images}
        onImagesChange={onImagesChange}
        savedProductPhotos={savedProductPhotos}
        currentProductPhotoDataUris={currentProductPhotoDataUris}
        onSavePhoto={onSavePhoto}
        onSelectSavedPhoto={onSelectSavedPhoto}
        onRemoveSavedPhoto={onRemoveSavedPhoto}
        isSavedProductPhotosFull={isSavedProductPhotosFull}
      />
    </div>
  );
}
