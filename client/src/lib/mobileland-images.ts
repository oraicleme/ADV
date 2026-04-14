/**
 * Product images from mobileland.me — client-side module.
 * Fetches SKU → image URL map via the tRPC catalog.getMobilelandImages endpoint,
 * which signs requests with OAuth 1.0 server-side.
 *
 * Set VITE_MOBILELAND_ENABLED=1 in .env.local to enable.
 *
 * Caching strategy:
 *   - Server:      in-memory, 5-minute TTL  (avoids hammering Magento API)
 *   - Client:      localStorage, 24-hour TTL (survives page reloads)
 *   - React Query: in-memory, 24-hour staleTime (no refetch within the same session)
 *   - Image files: browser HTTP cache (standard browser behaviour, no extra work)
 */

const LS_KEY = 'mobileland_image_map_v1';
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface LocalStorageEntry {
  data: Record<string, string>;
  savedAt: number;
}

/**
 * Whether Mobileland image fetching is enabled.
 * Reads the VITE_MOBILELAND_ENABLED build-time flag.
 */
export function isMobilelandImageEnabled(): boolean {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  return import.meta.env.VITE_MOBILELAND_ENABLED === '1';
}

/**
 * Normalize Excel / state `code` for lookup in the server SKU→URL map.
 * Handles numeric cells, float strings, unicode spaces — avoids silent misses when
 * `product.code` is a number (`.trim` would throw) or "1052510.0".
 */
export function normalizeProductCodeForMobilelandLookup(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.trunc(raw));
  }
  let s = String(raw)
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, '')
    .trim();
  if (!s) return '';
  if (/^\d+\.0+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return String(Math.trunc(n));
  }
  return s;
}

/**
 * A cache with fewer entries than this is considered stale/incomplete
 * (e.g. cached before the fields fix — only first page of ~186 items).
 * The full Mobileland catalog has 34k+ products; anything below 1000 entries
 * is almost certainly a partial first-page cache — force a fresh fetch.
 */
const MIN_EXPECTED_ENTRIES = 1000;

/**
 * Read the cached SKU→URL map from localStorage.
 * Returns the data if present, not expired, and large enough to be complete.
 */
export function getMobilelandMapFromLocalStorage(): Record<string, string> | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as LocalStorageEntry;
    if (Date.now() - entry.savedAt > LS_TTL_MS) {
      localStorage.removeItem(LS_KEY);
      return undefined;
    }
    // Invalidate suspiciously small caches — likely from before full pagination
    if (Object.keys(entry.data).length < MIN_EXPECTED_ENTRIES) {
      localStorage.removeItem(LS_KEY);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

/**
 * Timestamp of the cached entry, for React Query's initialDataUpdatedAt.
 * Returns undefined when no valid cache exists.
 */
export function getMobilelandMapTimestamp(): number | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as LocalStorageEntry;
    if (Date.now() - entry.savedAt > LS_TTL_MS) return undefined;
    return entry.savedAt;
  } catch {
    return undefined;
  }
}

/**
 * Persist a fresh SKU→URL map to localStorage with the current timestamp.
 */
export function saveMobilelandMapToLocalStorage(data: Record<string, string>): void {
  try {
    const entry: LocalStorageEntry = { data, savedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded or unavailable — ignore silently
  }
}

/**
 * Fetch the full SKU → image URL map from the server via tRPC.
 * Prefer using the tRPC React hook (trpc.catalog.getMobilelandImages.useQuery)
 * in components to avoid redundant fetches.
 */
export async function fetchMobilelandImageMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/trpc/catalog.getMobilelandImages', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return {};
    const json = await res.json() as {
      result?: { data?: Record<string, string> | { json?: Record<string, string> } };
    };
    const data = json?.result?.data;
    if (!data || typeof data !== 'object') return {};
    if ('json' in data && data.json && typeof data.json === 'object') {
      return data.json;
    }
    return data as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Get the image URL for a single product code (SKU).
 */
export async function getProductImageUrl(code: string): Promise<string | undefined> {
  const key = normalizeProductCodeForMobilelandLookup(code);
  if (!key) return undefined;
  const map = await fetchMobilelandImageMap();
  return map[key];
}
