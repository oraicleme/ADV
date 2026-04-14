/**
 * Internal helper for product search UX (STAGE-1 recall safeguard).
 *
 * When users search for short tokens like "type-c" / "usb-c", MiniSearch BM25
 * scores can be low for otherwise relevant items. For the manual product UI
 * we want higher precision for long queries, but higher recall for short ones.
 *
 * STORY-173: Manual thresholds are user-tunable via Workspace Settings → Search
 * (`readSearchSettings`); AI-interpreted search stays recall-first (min 0).
 */

import { normalizeSearchQueryForPipeline } from './normalize-search-query';
import { readSearchSettings } from './search-settings-storage';

export type SearchSource = 'manual' | 'ai';

export function getCatalogMinScoreForQuery(query: string, source: SearchSource): number {
  if (source === 'ai') return 0; // AI-interpreted queries: recall-first

  const { longTenths, shortTenths } = readSearchSettings();
  const longMin = longTenths / 10;
  const shortMin = shortTenths / 10;

  const compact = normalizeSearchQueryForPipeline(query)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!compact) return longMin;

  // Recall-first for short tokens (e.g. "type-c" -> "typec", "usb-c" -> "usbc").
  if (compact.length <= 6) return shortMin;

  return longMin;
}

