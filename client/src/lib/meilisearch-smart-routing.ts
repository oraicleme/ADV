/**
 * STORY-137 + STORY-199: Pure logic for skipping LLM `selectProducts` when Meilisearch hybrid
 * returns uniformly high _rankingScore values. Mirrors `resolveCatalogFilterActions` in AgentChat.
 */

/** Minimum Stage-1 hits required before smart-skip (avoids trivially small result sets). */
export const MIN_CANDIDATES_FOR_SMART_SKIP = 3;

export interface SmartRoutingHit {
  score: number;
}

/**
 * When hybrid search is active and every hit is at or above `confidenceThreshold`,
 * the client can skip the expensive `selectProducts` call and use Meilisearch order directly.
 */
export function shouldSkipSelectProductsLLM(opts: {
  hybridEnabled: boolean;
  /** From `catalog.getSearchProvider` — `meilisearch` when server search is configured. */
  searchProvider: string;
  hits: SmartRoutingHit[];
  /** Server `MEILI_CONFIDENCE_THRESHOLD` (default 0.85). */
  confidenceThreshold: number;
}): boolean {
  const { hybridEnabled, searchProvider, hits, confidenceThreshold } = opts;
  if (!hybridEnabled || searchProvider !== 'meilisearch') return false;
  if (hits.length < MIN_CANDIDATES_FOR_SMART_SKIP) return false;
  return hits.every((h) => h.score >= confidenceThreshold);
}
