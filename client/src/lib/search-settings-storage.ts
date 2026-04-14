/**
 * STORY-173: Manual catalog search min-score overrides (browser-local).
 * Bounds keep MiniSearch from being tuned into unusable extremes.
 */

export const SEARCH_SETTINGS_STORAGE_KEY = 'oraicle-search-settings-v1';

/** Dispatched in this tab after write/reset so ProductDataInput can re-query. */
export const SEARCH_SETTINGS_CHANGED_EVENT = 'oraicle-search-settings-changed';

/** Stored min scores × 10 (integers) for stable sliders and JSON. */
export type SearchSettingsSnapshot = {
  /** Long queries & empty query defensive threshold → 0.0–3.0 */
  longTenths: number;
  /** Short alphanumeric tokens (len ≤ 6) → 0.0–2.0 */
  shortTenths: number;
};

export const SEARCH_LONG_TENTHS_MAX = 30;
export const SEARCH_SHORT_TENTHS_MAX = 20;

const DEFAULT: SearchSettingsSnapshot = {
  longTenths: 15, // 1.5 — matches pre-STORY-173 manual long default
  shortTenths: 0, // recall-first short tokens
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeSnapshot(raw: unknown): SearchSettingsSnapshot {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT };
  const o = raw as Record<string, unknown>;
  const longTenths =
    o.longTenths == null || o.longTenths === ''
      ? DEFAULT.longTenths
      : clampInt(Number(o.longTenths), 0, SEARCH_LONG_TENTHS_MAX);
  const shortTenths =
    o.shortTenths == null || o.shortTenths === ''
      ? DEFAULT.shortTenths
      : clampInt(Number(o.shortTenths), 0, SEARCH_SHORT_TENTHS_MAX);
  return { longTenths, shortTenths };
}

export function readSearchSettings(): SearchSettingsSnapshot {
  if (typeof localStorage === 'undefined') return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(SEARCH_SETTINGS_STORAGE_KEY);
    if (!raw?.trim()) return { ...DEFAULT };
    return normalizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSearchSettings(partial: Partial<SearchSettingsSnapshot>): void {
  if (typeof localStorage === 'undefined') return;
  const cur = readSearchSettings();
  const next = normalizeSnapshot({
    ...cur,
    ...partial,
  });
  try {
    localStorage.setItem(SEARCH_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    dispatchSearchSettingsChanged();
  } catch {
    /* quota / private mode */
  }
}

export function resetSearchSettingsToDefaults(): void {
  writeSearchSettings({ ...DEFAULT });
}

function dispatchSearchSettingsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SEARCH_SETTINGS_CHANGED_EVENT));
}
