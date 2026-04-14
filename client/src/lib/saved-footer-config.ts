/**
 * Client-side persistence for saved footer configs (Retail Promo Designer).
 * Same pattern as saved logos: save current footer, list saved, apply or remove.
 */

import type { FooterConfig } from './ad-config-schema';

const STORAGE_KEY = 'retail-promo-saved-footers';
export const MAX_SAVED_FOOTERS = 5;

export interface SavedFooterEntry {
  id: string;
  name: string;
  savedAt: number;
  config: FooterConfig;
}

function getStored(): SavedFooterEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedFooterEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SavedFooterEntry).id === 'string' &&
        typeof (e as SavedFooterEntry).name === 'string' &&
        typeof (e as SavedFooterEntry).savedAt === 'number' &&
        typeof (e as SavedFooterEntry).config === 'object' &&
        typeof (e as SavedFooterEntry).config.enabled === 'boolean' &&
        Array.isArray((e as SavedFooterEntry).config.options),
    );
  } catch {
    return [];
  }
}

function setStored(entries: SavedFooterEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or disabled storage
  }
}

/**
 * Returns all saved footers (newest first). Safe to call in SSR; returns [].
 */
export function getSavedFooters(): SavedFooterEntry[] {
  const entries = getStored();
  return [...entries].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Saves a footer config. If at max count, replaces the oldest.
 * Returns the id of the saved entry.
 */
export function saveFooter(options: { config: FooterConfig; name?: string }): string {
  const { config, name } = options;
  const entries = getStored();
  const id = `saved-footer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const displayName =
    name?.trim() ||
    config.companyName?.trim() ||
    `Footer ${entries.length + 1}`;
  const entry: SavedFooterEntry = {
    id,
    name: displayName,
    savedAt: Date.now(),
    config: { ...config, enabled: config.enabled ?? true, options: config.options ?? [] },
  };
  const next = [entry, ...entries].slice(0, MAX_SAVED_FOOTERS);
  setStored(next);
  return id;
}

/**
 * Removes a saved footer by id. No-op if id not found.
 */
export function removeSavedFooter(id: string): void {
  const entries = getStored().filter((e) => e.id !== id);
  setStored(entries);
}

export function isSavedFootersFull(): boolean {
  return getStored().length >= MAX_SAVED_FOOTERS;
}
