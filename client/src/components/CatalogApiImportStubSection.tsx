/**
 * STORY-174: Workspace Settings → Import — Catalog API (persist).
 * STORY-177: Test connection.
 * STORY-178: Full sync (pagination + mapping → products).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CATALOG_API_SETTINGS_CHANGED_EVENT,
  clearCatalogApiSettings,
  hasSavedCatalogApiConfig,
  readCatalogApiSettings,
  writeCatalogApiSettings,
  type CatalogPaginationMode,
  type CatalogSyncCadence,
} from '@/lib/catalog-api-settings-storage';
import type { ProductItem } from '@/lib/ad-constants';
import { trpc } from '@/lib/trpc';
import { Database, Eye, EyeOff, Loader2 } from 'lucide-react';

const CADENCE_OPTIONS: Array<{ value: CatalogSyncCadence; label: string }> = [
  { value: 'manual', label: 'Manual (future: trigger from Products)' },
  { value: 'hourly', label: 'Hourly (not active yet)' },
  { value: 'daily', label: 'Daily (not active yet)' },
];

function mapApiRowsToProducts(
  rows: Array<{
    name: string;
    code?: string;
    category?: string;
    brand?: string;
    price?: string;
    retailPrice?: string;
  }>,
): ProductItem[] {
  return rows.map((r) => {
    const price = r.retailPrice ?? r.price;
    return {
      name: r.name,
      ...(r.code ? { code: r.code } : {}),
      ...(r.category ? { category: r.category } : {}),
      ...(r.brand ? { brand: r.brand } : {}),
      ...(price ? { price, retailPrice: price } : {}),
    };
  });
}

export default function CatalogApiImportStubSection({
  onCatalogSync,
}: {
  onCatalogSync?: (products: ProductItem[]) => void;
}) {
  const [baseUrl, setBaseUrl] = useState('');
  const [authHeaderName, setAuthHeaderName] = useState('');
  const [authHeaderValue, setAuthHeaderValue] = useState('');
  const [syncCadence, setSyncCadence] = useState<CatalogSyncCadence>('manual');
  const [itemsPath, setItemsPath] = useState('');
  const [paginationMode, setPaginationMode] = useState<CatalogPaginationMode>('offset');
  const [offsetParam, setOffsetParam] = useState('offset');
  const [limitParam, setLimitParam] = useState('limit');
  const [pageParam, setPageParam] = useState('page');
  const [pageSizeParam, setPageSizeParam] = useState('limit');
  const [pageSize, setPageSize] = useState(100);
  const [firstPage, setFirstPage] = useState(0);
  const [startOffset, setStartOffset] = useState(0);
  const [maxPages, setMaxPages] = useState(50);
  const [maxProducts, setMaxProducts] = useState(10000);
  const [mapName, setMapName] = useState('name');
  const [mapCode, setMapCode] = useState('code');
  const [mapCategory, setMapCategory] = useState('category');
  const [mapBrand, setMapBrand] = useState('brand');
  const [mapPrice, setMapPrice] = useState('price');

  const [showSecret, setShowSecret] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [testHint, setTestHint] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  const testConnection = trpc.catalog.testExternalCatalogConnection.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        const preview = res.bodyPreview?.trim();
        const snippet =
          preview && preview.length > 0
            ? preview.length > 280
              ? `${preview.slice(0, 280)}…`
              : preview
            : '';
        setTestHint(
          [
            `Connected (${res.httpStatus ?? '—'}${res.contentType ? ` · ${res.contentType}` : ''}).`,
            snippet ? `Preview: ${snippet}` : 'Empty response body.',
          ].join(' '),
        );
      } else {
        setTestHint(res.error ?? 'Connection failed.');
      }
    },
    onError: (err) => {
      setTestHint(err.message || 'Request failed.');
    },
  });

  const syncCatalog = trpc.catalog.syncCatalogFromApi.useMutation({
    onSuccess: (res) => {
      if (!res.ok) {
        setSyncHint(res.error ?? 'Sync failed.');
        return;
      }
      const parts = [
        `Imported ${res.products.length} product(s) in ${res.pagesFetched} page(s).`,
        res.truncatedByMaxPages ? 'Stopped early (max pages).' : '',
        res.truncatedByMaxProducts ? 'Stopped early (max products).' : '',
      ].filter(Boolean);
      setSyncHint(parts.join(' '));
      if (onCatalogSync && res.products.length > 0) {
        onCatalogSync(mapApiRowsToProducts(res.products));
      }
    },
    onError: (err) => {
      setSyncHint(err.message || 'Sync failed.');
    },
  });

  const sync = useCallback(() => {
    const s = readCatalogApiSettings();
    setBaseUrl(s.baseUrl);
    setAuthHeaderName(s.authHeaderName);
    setAuthHeaderValue(s.authHeaderValue);
    setSyncCadence(s.syncCadence);
    setItemsPath(s.itemsPath);
    setPaginationMode(s.paginationMode);
    setOffsetParam(s.offsetParam);
    setLimitParam(s.limitParam);
    setPageParam(s.pageParam);
    setPageSizeParam(s.pageSizeParam);
    setPageSize(s.pageSize);
    setFirstPage(s.firstPage);
    setStartOffset(s.startOffset);
    setMaxPages(s.maxPages);
    setMaxProducts(s.maxProducts);
    setMapName(s.mapName);
    setMapCode(s.mapCode);
    setMapCategory(s.mapCategory);
    setMapBrand(s.mapBrand);
    setMapPrice(s.mapPrice);
    setHasConfig(hasSavedCatalogApiConfig());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, sync);
  }, [sync]);

  const handleSave = () => {
    writeCatalogApiSettings({
      baseUrl,
      authHeaderName,
      authHeaderValue,
      syncCadence,
      itemsPath,
      paginationMode,
      offsetParam,
      limitParam,
      pageParam,
      pageSizeParam,
      pageSize,
      firstPage,
      startOffset,
      maxPages,
      maxProducts,
      mapName,
      mapCode,
      mapCategory,
      mapBrand,
      mapPrice,
    });
    sync();
  };

  const handleClear = () => {
    clearCatalogApiSettings();
    setBaseUrl('');
    setAuthHeaderName('');
    setAuthHeaderValue('');
    setSyncCadence('manual');
    setItemsPath('');
    setPaginationMode('offset');
    setOffsetParam('offset');
    setLimitParam('limit');
    setPageParam('page');
    setPageSizeParam('limit');
    setPageSize(100);
    setFirstPage(0);
    setStartOffset(0);
    setMaxPages(50);
    setMaxProducts(10000);
    setMapName('name');
    setMapCode('code');
    setMapCategory('category');
    setMapBrand('brand');
    setMapPrice('price');
    sync();
  };

  const canSave = baseUrl.trim().length > 0;

  const syncSettingsDirty = useMemo(
    () =>
      itemsPath.trim() !== '' ||
      paginationMode !== 'offset' ||
      offsetParam !== 'offset' ||
      limitParam !== 'limit' ||
      pageParam !== 'page' ||
      pageSizeParam !== 'limit' ||
      pageSize !== 100 ||
      firstPage !== 0 ||
      startOffset !== 0 ||
      maxPages !== 50 ||
      maxProducts !== 10000 ||
      mapName !== 'name' ||
      mapCode !== 'code' ||
      mapCategory !== 'category' ||
      mapBrand !== 'brand' ||
      mapPrice !== 'price',
    [
      itemsPath,
      paginationMode,
      offsetParam,
      limitParam,
      pageParam,
      pageSizeParam,
      pageSize,
      firstPage,
      startOffset,
      maxPages,
      maxProducts,
      mapName,
      mapCode,
      mapCategory,
      mapBrand,
      mapPrice,
    ],
  );

  const canClear = useMemo(
    () =>
      hasConfig ||
      baseUrl.trim() !== '' ||
      authHeaderName.trim() !== '' ||
      authHeaderValue.trim() !== '' ||
      syncCadence !== 'manual' ||
      syncSettingsDirty,
    [hasConfig, baseUrl, authHeaderName, authHeaderValue, syncCadence, syncSettingsDirty],
  );

  const buildSyncPayload = () => ({
    baseUrl: baseUrl.trim(),
    authHeaderName: authHeaderName.trim() || undefined,
    authHeaderValue: authHeaderValue || undefined,
    itemsPath: itemsPath.trim(),
    paginationMode,
    offsetParam: offsetParam.trim() || 'offset',
    limitParam: limitParam.trim() || 'limit',
    pageParam: pageParam.trim() || 'page',
    pageSizeParam: pageSizeParam.trim() || 'limit',
    pageSize: Math.min(500, Math.max(1, Math.floor(pageSize) || 100)),
    firstPage: firstPage === 1 ? 1 : 0,
    startOffset: Math.max(0, Math.floor(startOffset) || 0),
    maxPages: Math.min(500, Math.max(1, Math.floor(maxPages) || 50)),
    maxProducts: Math.min(100000, Math.max(1, Math.floor(maxProducts) || 10000)),
    mapName: mapName.trim() || 'name',
    mapCode: mapCode.trim() || undefined,
    mapCategory: mapCategory.trim() || undefined,
    mapBrand: mapBrand.trim() || undefined,
    mapPrice: mapPrice.trim() || undefined,
  });

  return (
    <div className="space-y-3 pt-2" data-testid="catalog-api-import-stub-section">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500/90" aria-hidden />
        <p className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">Catalog API.</span> Save URL and auth, map JSON fields, then{' '}
          <span className="font-medium text-foreground">Test connection</span> or{' '}
          <span className="font-medium text-foreground">Sync catalog</span> (server-side GET + paginate). Replaces the
          current product list when sync succeeds. Excel / paste in the Products tab is unchanged.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalog-api-base-url" className="text-[11px]">
          Catalog base URL
        </Label>
        <Input
          id="catalog-api-base-url"
          type="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://api.example.com/v1/products"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="h-9 font-mono text-[11px]"
          data-testid="catalog-api-base-url"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="catalog-api-auth-header" className="text-[11px]">
            Auth header name (optional)
          </Label>
          <Input
            id="catalog-api-auth-header"
            autoComplete="off"
            spellCheck={false}
            placeholder="Authorization"
            value={authHeaderName}
            onChange={(e) => setAuthHeaderName(e.target.value)}
            className="h-9 font-mono text-[11px]"
            data-testid="catalog-api-auth-header-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catalog-api-auth-value" className="text-[11px]">
            Auth header value (optional)
          </Label>
          <div className="relative">
            <Input
              id="catalog-api-auth-value"
              type={showSecret ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder="Bearer …"
              value={authHeaderValue}
              onChange={(e) => setAuthHeaderValue(e.target.value)}
              className="h-9 pr-10 font-mono text-[11px]"
              data-testid="catalog-api-auth-header-value"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={showSecret ? 'Hide secret' : 'Show secret'}
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalog-api-items-path" className="text-[11px]">
          Items path (dot notation, optional)
        </Label>
        <Input
          id="catalog-api-items-path"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. data.items — leave empty if root JSON is an array"
          value={itemsPath}
          onChange={(e) => setItemsPath(e.target.value)}
          className="h-9 font-mono text-[11px]"
          data-testid="catalog-api-items-path"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="catalog-api-pagination-mode" className="text-[11px]">
            Pagination
          </Label>
          <select
            id="catalog-api-pagination-mode"
            value={paginationMode}
            onChange={(e) => setPaginationMode(e.target.value as CatalogPaginationMode)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-[11px] shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="catalog-api-pagination-mode"
          >
            <option value="offset">Offset + limit (query)</option>
            <option value="page">Page + page size (query)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catalog-api-page-size" className="text-[11px]">
            Page size
          </Label>
          <Input
            id="catalog-api-page-size"
            type="number"
            min={1}
            max={500}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 font-mono text-[11px]"
            data-testid="catalog-api-page-size"
          />
        </div>
      </div>

      {paginationMode === 'offset' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Offset param</Label>
            <Input
              value={offsetParam}
              onChange={(e) => setOffsetParam(e.target.value)}
              className="h-9 font-mono text-[11px]"
              data-testid="catalog-api-offset-param"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Limit param</Label>
            <Input
              value={limitParam}
              onChange={(e) => setLimitParam(e.target.value)}
              className="h-9 font-mono text-[11px]"
              data-testid="catalog-api-limit-param"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Start offset</Label>
            <Input
              type="number"
              min={0}
              value={startOffset}
              onChange={(e) => setStartOffset(Number(e.target.value))}
              className="h-9 font-mono text-[11px]"
              data-testid="catalog-api-start-offset"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Page param</Label>
            <Input
              value={pageParam}
              onChange={(e) => setPageParam(e.target.value)}
              className="h-9 font-mono text-[11px]"
              data-testid="catalog-api-page-param"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Page size param</Label>
            <Input
              value={pageSizeParam}
              onChange={(e) => setPageSizeParam(e.target.value)}
              className="h-9 font-mono text-[11px]"
              data-testid="catalog-api-page-size-param"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">First page #</Label>
            <select
              value={firstPage}
              onChange={(e) => setFirstPage(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-[11px]"
              data-testid="catalog-api-first-page"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px]">Max pages (safety)</Label>
          <Input
            type="number"
            min={1}
            max={500}
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="h-9 font-mono text-[11px]"
            data-testid="catalog-api-max-pages"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px]">Max products</Label>
          <Input
            type="number"
            min={1}
            max={100000}
            value={maxProducts}
            onChange={(e) => setMaxProducts(Number(e.target.value))}
            className="h-9 font-mono text-[11px]"
            data-testid="catalog-api-max-products"
          />
        </div>
      </div>

      <p className="text-[10px] font-medium text-foreground">Field paths (dot notation per item)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[10px]">name (required)</Label>
          <Input value={mapName} onChange={(e) => setMapName(e.target.value)} className="h-8 font-mono text-[11px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">code</Label>
          <Input value={mapCode} onChange={(e) => setMapCode(e.target.value)} className="h-8 font-mono text-[11px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">category</Label>
          <Input
            value={mapCategory}
            onChange={(e) => setMapCategory(e.target.value)}
            className="h-8 font-mono text-[11px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">brand</Label>
          <Input value={mapBrand} onChange={(e) => setMapBrand(e.target.value)} className="h-8 font-mono text-[11px]" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px]">price</Label>
          <Input value={mapPrice} onChange={(e) => setMapPrice(e.target.value)} className="h-8 font-mono text-[11px]" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="catalog-api-cadence" className="text-[11px]">
          Sync cadence (preference)
        </Label>
        <select
          id="catalog-api-cadence"
          value={syncCadence}
          onChange={(e) => setSyncCadence(e.target.value as CatalogSyncCadence)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-[11px] shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="catalog-api-sync-cadence"
        >
          {CADENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={!canSave}
          data-testid="catalog-api-save"
        >
          Save catalog API
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          disabled={!canSave || testConnection.isPending}
          onClick={() => {
            setTestHint(null);
            testConnection.mutate({
              baseUrl: baseUrl.trim(),
              authHeaderName: authHeaderName.trim() || undefined,
              authHeaderValue: authHeaderValue || undefined,
            });
          }}
          data-testid="catalog-api-test-connection"
        >
          {testConnection.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              Testing…
            </>
          ) : (
            'Test connection'
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 border border-orange-500/40 bg-orange-500/15 text-xs text-orange-950 hover:bg-orange-500/25 dark:text-orange-100"
          disabled={!canSave || !onCatalogSync || syncCatalog.isPending}
          title={!onCatalogSync ? 'Catalog sync is not wired in this view.' : undefined}
          onClick={() => {
            setSyncHint(null);
            syncCatalog.mutate(buildSyncPayload());
          }}
          data-testid="catalog-api-sync-catalog"
        >
          {syncCatalog.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              Syncing…
            </>
          ) : (
            'Sync catalog'
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleClear}
          disabled={!canClear}
          data-testid="catalog-api-clear"
        >
          Clear saved
        </Button>
      </div>

      {testHint ? (
        <p
          className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-[11px] leading-snug text-foreground"
          data-testid="catalog-api-test-hint"
        >
          {testHint}
        </p>
      ) : null}

      {syncHint ? (
        <p
          className="rounded-md border border-orange-500/25 bg-orange-500/5 px-2.5 py-2 text-[11px] leading-snug text-foreground"
          data-testid="catalog-api-sync-hint"
        >
          {syncHint}
        </p>
      ) : null}

      <p className="text-[10px] leading-relaxed text-muted-foreground/90">
        Stored only in this browser&apos;s localStorage (including secrets). Same-origin scripts can read it — avoid on
        shared devices.
      </p>
    </div>
  );
}
