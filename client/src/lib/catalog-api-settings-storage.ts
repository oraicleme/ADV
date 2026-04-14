/**
 * STORY-174: Catalog API endpoint preferences (browser-local).
 * STORY-178: Pagination + field mapping for sync.
 */

export const CATALOG_API_SETTINGS_STORAGE_KEY = 'oraicle-catalog-api-settings-v1';

export const CATALOG_API_SETTINGS_CHANGED_EVENT = 'oraicle-catalog-api-settings-changed';

export type CatalogSyncCadence = 'manual' | 'hourly' | 'daily';

export type CatalogPaginationMode = 'offset' | 'page';

export type CatalogApiSettingsSnapshot = {
  /** HTTPS recommended; trailing slashes tolerated */
  baseUrl: string;
  /** e.g. Authorization, X-Api-Key */
  authHeaderName: string;
  authHeaderValue: string;
  /** Preference for a future scheduler — not used yet */
  syncCadence: CatalogSyncCadence;
  /** Dot path to JSON array (e.g. data.items); empty = root must be an array */
  itemsPath: string;
  paginationMode: CatalogPaginationMode;
  offsetParam: string;
  limitParam: string;
  pageParam: string;
  pageSizeParam: string;
  pageSize: number;
  /** API first page index: 0 or 1 when paginationMode is page */
  firstPage: number;
  startOffset: number;
  maxPages: number;
  maxProducts: number;
  /** Dot paths into each product object */
  mapName: string;
  mapCode: string;
  mapCategory: string;
  mapBrand: string;
  mapPrice: string;
};

const EMPTY: CatalogApiSettingsSnapshot = {
  baseUrl: '',
  authHeaderName: '',
  authHeaderValue: '',
  syncCadence: 'manual',
  itemsPath: '',
  paginationMode: 'offset',
  offsetParam: 'offset',
  limitParam: 'limit',
  pageParam: 'page',
  pageSizeParam: 'limit',
  pageSize: 100,
  firstPage: 0,
  startOffset: 0,
  maxPages: 50,
  maxProducts: 10000,
  mapName: 'name',
  mapCode: 'code',
  mapCategory: 'category',
  mapBrand: 'brand',
  mapPrice: 'price',
};

const MAX_BASE_URL = 2048;
const MAX_HEADER_NAME = 128;
const MAX_HEADER_VALUE = 8192;
const MAX_PATH_STR = 256;

const CADENCE_SET = new Set<CatalogSyncCadence>(['manual', 'hourly', 'daily']);
const PAGINATION_SET = new Set<CatalogPaginationMode>(['offset', 'page']);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function normalizeBaseUrl(raw: string): string {
  return truncate(raw.trim(), MAX_BASE_URL);
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeSnapshot(raw: unknown): CatalogApiSettingsSnapshot {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const o = raw as Record<string, unknown>;
  const baseUrl = o.baseUrl == null ? '' : normalizeBaseUrl(String(o.baseUrl));
  const authHeaderName =
    o.authHeaderName == null ? '' : truncate(String(o.authHeaderName).trim(), MAX_HEADER_NAME);
  const authHeaderValue =
    o.authHeaderValue == null ? '' : truncate(String(o.authHeaderValue), MAX_HEADER_VALUE);
  let syncCadence: CatalogSyncCadence = 'manual';
  const c = o.syncCadence;
  if (typeof c === 'string' && CADENCE_SET.has(c as CatalogSyncCadence)) {
    syncCadence = c as CatalogSyncCadence;
  }

  const itemsPath =
    o.itemsPath == null ? '' : truncate(String(o.itemsPath).trim(), MAX_PATH_STR);
  let paginationMode: CatalogPaginationMode = 'offset';
  const pm = o.paginationMode;
  if (typeof pm === 'string' && PAGINATION_SET.has(pm as CatalogPaginationMode)) {
    paginationMode = pm as CatalogPaginationMode;
  }
  const offsetParam =
    o.offsetParam == null ? EMPTY.offsetParam : truncate(String(o.offsetParam).trim(), 64);
  const limitParam =
    o.limitParam == null ? EMPTY.limitParam : truncate(String(o.limitParam).trim(), 64);
  const pageParam =
    o.pageParam == null ? EMPTY.pageParam : truncate(String(o.pageParam).trim(), 64);
  const pageSizeParam =
    o.pageSizeParam == null ? EMPTY.pageSizeParam : truncate(String(o.pageSizeParam).trim(), 64);
  const pageSize = clampInt(Number(o.pageSize), 1, 500, EMPTY.pageSize);
  const firstPage = clampInt(Number(o.firstPage), 0, 1, EMPTY.firstPage);
  const startOffset = clampInt(Number(o.startOffset), 0, 10_000_000, EMPTY.startOffset);
  const maxPages = clampInt(Number(o.maxPages), 1, 500, EMPTY.maxPages);
  const maxProducts = clampInt(Number(o.maxProducts), 1, 100_000, EMPTY.maxProducts);
  const mapName = o.mapName == null ? EMPTY.mapName : truncate(String(o.mapName).trim(), 128);
  const mapCode = o.mapCode == null ? EMPTY.mapCode : truncate(String(o.mapCode).trim(), 128);
  const mapCategory =
    o.mapCategory == null ? EMPTY.mapCategory : truncate(String(o.mapCategory).trim(), 128);
  const mapBrand = o.mapBrand == null ? EMPTY.mapBrand : truncate(String(o.mapBrand).trim(), 128);
  const mapPrice = o.mapPrice == null ? EMPTY.mapPrice : truncate(String(o.mapPrice).trim(), 128);

  return {
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
  };
}

export function readCatalogApiSettings(): CatalogApiSettingsSnapshot {
  if (typeof localStorage === 'undefined') return { ...EMPTY };
  try {
    const raw = localStorage.getItem(CATALOG_API_SETTINGS_STORAGE_KEY);
    if (!raw?.trim()) return { ...EMPTY };
    return normalizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return { ...EMPTY };
  }
}

export function writeCatalogApiSettings(partial: Partial<CatalogApiSettingsSnapshot>): void {
  if (typeof localStorage === 'undefined') return;
  const cur = readCatalogApiSettings();
  const next = normalizeSnapshot({ ...cur, ...partial });
  try {
    localStorage.setItem(CATALOG_API_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    dispatchCatalogApiSettingsChanged();
  } catch {
    /* quota / private mode */
  }
}

export function clearCatalogApiSettings(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CATALOG_API_SETTINGS_STORAGE_KEY);
    dispatchCatalogApiSettingsChanged();
  } catch {
    /* ignore */
  }
}

export function hasSavedCatalogApiConfig(): boolean {
  const s = readCatalogApiSettings();
  return s.baseUrl.trim().length > 0;
}

function dispatchCatalogApiSettingsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CATALOG_API_SETTINGS_CHANGED_EVENT));
}
