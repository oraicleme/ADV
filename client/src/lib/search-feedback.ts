/**
 * STORY-200: Privacy-first search relevance feedback (implicit + explicit).
 * Uses hashed fingerprints only — no raw catalog_filter text or product names in events.
 */

import type { AgentAction } from './agent-actions';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';
import { logRetailPromoEvent } from './retail-promo-log';

/**
 * STORY-169-style djb2 fingerprint as 8 hex chars (normalized input).
 */
export function hashSearchFeedbackFingerprint(raw: string): string {
  const k = raw
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ');
  let h = 5381;
  for (let i = 0; i < k.length; i++) {
    h = (h * 33) ^ k.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Hash normalized search query for telemetry. */
export function hashSearchFeedbackQuery(normalizedQuery: string): string {
  return hashSearchFeedbackFingerprint(normalizedQuery);
}

/** Hash product code or name (lowercase) for telemetry. */
export function hashSearchFeedbackProductKey(codeOrName: string): string {
  return hashSearchFeedbackFingerprint(codeOrName.trim().toLowerCase());
}

/**
 * Collect Meilisearch/LLM-resolved indices from catalog_filter actions (post-resolveCatalogFilterActions).
 */
export function collectResolvedIndicesFromCatalogActions(actions: AgentAction[]): Set<number> | null {
  const out = new Set<number>();
  for (const a of actions) {
    if (a.type !== 'catalog_filter') continue;
    const p = a.payload as { resolvedIndices?: number[] };
    if (!Array.isArray(p.resolvedIndices)) continue;
    for (const i of p.resolvedIndices) {
      if (typeof i === 'number' && Number.isInteger(i) && i >= 0) out.add(i);
    }
  }
  return out.size > 0 ? out : null;
}

export type SearchFeedbackProductRef = {
  code?: string;
  name?: string;
};

function productKeyForRule(p: SearchFeedbackProductRef): string {
  const c = p.code?.trim();
  if (c) return c;
  return p.name?.trim() ?? '';
}

/**
 * Map negative feedback to STORY-196 rule draft (caller may open Settings or copy).
 */
export function buildSuggestedExcludeRuleDraft(
  queryRaw: string,
  product: SearchFeedbackProductRef,
): { queryPattern: string; productKey: string; action: 'exclude' } | null {
  const queryPattern = normalizeSearchQueryForPipeline(queryRaw).toLowerCase();
  const productKey = productKeyForRule(product);
  if (!queryPattern || !productKey) return null;
  return { queryPattern, productKey, action: 'exclude' };
}

/**
 * Implicit negative signal: user deselected a row that was part of the last agent catalog_filter resolution.
 */
export function logSearchFeedbackImplicitDeselect(opts: {
  queryRaw: string;
  product: SearchFeedbackProductRef;
}): void {
  const qn = normalizeSearchQueryForPipeline(opts.queryRaw).trim();
  if (!qn) return;
  const pk = productKeyForRule(opts.product);
  if (!pk) return;
  logRetailPromoEvent('search_feedback_implicit', {
    queryHash: hashSearchFeedbackQuery(qn),
    productKeyHash: hashSearchFeedbackProductKey(pk),
    source: 'deselect_after_agent',
  });
}

export function logSearchFeedbackExplicit(opts: {
  queryRaw: string;
  product: SearchFeedbackProductRef;
  relevant: boolean;
}): void {
  const qn = normalizeSearchQueryForPipeline(opts.queryRaw).trim();
  if (!qn) return;
  const pk = productKeyForRule(opts.product);
  if (!pk) return;
  logRetailPromoEvent('search_feedback_explicit', {
    queryHash: hashSearchFeedbackQuery(qn),
    productKeyHash: hashSearchFeedbackProductKey(pk),
    relevant: opts.relevant,
  });
}
