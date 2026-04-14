/**
 * STORY-136 + STORY-137 + STORY-138: Meilisearch service — internal module.
 * Only used by server/routers/catalog.ts.
 *
 * STORY-136: Catalog indexing + BM25 search.
 * STORY-137: Hybrid search (BM25 + vector) via configurable REST embedder.
 * STORY-138: Switched to OpenAI native embedder (text-embedding-3-small).
 *   - Removed catalog-derived vocabulary/synonyms — semantic embeddings handle
 *     vocabulary bridging automatically (kola=auto, futrola=case, etc.).
 *   - isHybridConfigured() now checks ENV.openAiApiKey instead of io.net creds.
 *   - Industry-standard index settings: typoTolerance + rankingRules.
 */

import { MeiliSearch, type Settings } from 'meilisearch';
import { ENV } from '../_core/env';

export const MEILI_INDEX = 'products';

/** Minimal product shape required for indexing. */
export interface MeiliProductDoc {
  id: number;
  name: string;
  brand: string;
  code: string;
  category: string;
}

export interface MeiliSearchFilter {
  category?: string;
  brand?: string;
}

/** A single search hit returned by searchCatalog — index maps to position in client products array. */
export interface MeiliSearchHit {
  index: number;
  /** Combined BM25+vector ranking score (0–1). Present when showRankingScore=true. */
  score: number;
  /** Semantic (vector) score component (0–1). Only set when hybrid search is active. */
  semanticScore?: number;
}

// ---------------------------------------------------------------------------
// Configuration guards
// ---------------------------------------------------------------------------

export function isMeilisearchConfigured(): boolean {
  return Boolean(ENV.meiliHost && ENV.meiliApiKey);
}

/**
 * STORY-138: Returns true when hybrid search is configured —
 * Meilisearch is configured AND an OpenAI API key is available.
 * Meilisearch will use OpenAI text-embedding-3-small at index and query time.
 */
export function isHybridConfigured(): boolean {
  return isMeilisearchConfigured() && Boolean(ENV.openAiApiKey);
}

/** Meilisearch embedder name registered in the index. */
const MEILI_EMBEDDER_NAME = 'openai';

// ---------------------------------------------------------------------------
// Client factory (lazy — created on demand)
// ---------------------------------------------------------------------------

function getClient(): MeiliSearch {
  return new MeiliSearch({ host: ENV.meiliHost, apiKey: ENV.meiliApiKey });
}

// ---------------------------------------------------------------------------
// Filter builder
// ---------------------------------------------------------------------------

function buildFilterExpr(filter?: MeiliSearchFilter): string | undefined {
  if (!filter) return undefined;
  const parts: string[] = [];
  if (filter.category) parts.push(`category = "${filter.category.replace(/"/g, '\\"')}"`);
  if (filter.brand) parts.push(`brand = "${filter.brand.replace(/"/g, '\\"')}"`);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
}

// ---------------------------------------------------------------------------
// Shared index settings
// ---------------------------------------------------------------------------

const INDEX_SETTINGS: Settings = {
  searchableAttributes: ['name', 'brand', 'code', 'category'],
  filterableAttributes: ['category', 'brand'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
  },
};

function buildEmbedderConfig() {
  return {
    [MEILI_EMBEDDER_NAME]: {
      source: 'openAi',
      apiKey: ENV.openAiApiKey,
      model: 'text-embedding-3-small',
      documentTemplate: '{{doc.name}} {{doc.brand}} {{doc.code}} {{doc.category}}',
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * STORY-140 M1: Configure index settings + OpenAI embedder WITHOUT touching documents.
 *
 * Idempotent — safe to call on every app startup. Ensures the embedder is registered
 * in Meilisearch before any search is attempted, regardless of whether documents
 * have been added or changed since the last run.
 *
 * This decouples embedder lifecycle from document upsert (STORY-139 gap fix).
 */
export async function configureIndex(): Promise<void> {
  const client = getClient();
  const index = client.index(MEILI_INDEX);

  const settingsTask = await index.updateSettings(INDEX_SETTINGS);
  await client.tasks.waitForTask(settingsTask.taskUid, { timeout: 30_000 });

  if (isHybridConfigured()) {
    try {
      const embedderTask = await index.updateEmbedders(
        buildEmbedderConfig() as Parameters<typeof index.updateEmbedders>[0],
      );
      const result = await client.tasks.waitForTask(embedderTask.taskUid, { timeout: 60_000 });
      if ((result as { status?: string }).status === 'failed') {
        const err = (result as { error?: { message?: string } }).error;
        console.warn('[Meilisearch] configureIndex: embedder failed:', err?.message ?? result);
      }
    } catch (embedErr) {
      console.warn('[Meilisearch] configureIndex: embedder error:', embedErr);
    }
  }
}

/**
 * Index a catalog into Meilisearch.
 *
 * Settings applied on every call:
 *   - searchableAttributes: name (primary), brand, code, category
 *   - filterableAttributes: category, brand
 *   - rankingRules: industry-standard ordering
 *   - typoTolerance: enabled for words ≥5 chars (one typo), ≥9 chars (two typos)
 *
 * When OPENAI_API_KEY is set (isHybridConfigured), configures the OpenAI native
 * embedder using text-embedding-3-small. Meilisearch calls OpenAI at index time
 * (once per document) and at query time — no vocabulary tables needed.
 *
 * Waits for all tasks to complete for consistency.
 */
export async function indexCatalog(docs: MeiliProductDoc[]): Promise<void> {
  const client = getClient();
  const index = client.index(MEILI_INDEX);

  const settingsTask = await index.updateSettings(INDEX_SETTINGS);
  await client.tasks.waitForTask(settingsTask.taskUid, { timeout: 30_000 });

  const docsTask = await index.addDocuments(docs, { primaryKey: 'id' });
  await client.tasks.waitForTask(docsTask.taskUid, { timeout: 60_000 });

  // Configure OpenAI embedder (belt-and-suspenders alongside configureIndex on startup).
  if (isHybridConfigured()) {
    try {
      const embedderTask = await index.updateEmbedders(
        buildEmbedderConfig() as Parameters<typeof index.updateEmbedders>[0],
      );
      const embedderResult = await client.tasks.waitForTask(embedderTask.taskUid, {
        timeout: 60_000,
      });
      if ((embedderResult as { status?: string }).status === 'failed') {
        const err = (embedderResult as { error?: { message?: string } }).error;
        console.warn('[Meilisearch] indexCatalog: embedder failed:', err?.message ?? embedderResult);
      }
    } catch (embedErr) {
      console.warn('[Meilisearch] indexCatalog: embedder error:', embedErr);
    }
  }
}

/**
 * STORY-139: Delete documents from the Meilisearch index by their numeric IDs.
 * No-op when ids is empty. Waits for the task to complete.
 */
export async function deleteDocuments(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const client = getClient();
  const index = client.index(MEILI_INDEX);
  const task = await index.deleteDocuments(ids);
  await client.tasks.waitForTask(task.taskUid, { timeout: 30_000 });
}

/**
 * STORY-139: Return the number of documents currently in the Meilisearch index.
 * Used for index health check: documentCount === 0 → force full re-index.
 */
export async function getIndexStats(): Promise<{ documentCount: number }> {
  const client = getClient();
  const index = client.index(MEILI_INDEX);
  const stats = await index.getStats();
  return { documentCount: stats.numberOfDocuments };
}

/**
 * Search catalog in Meilisearch.
 * Returns product indices sorted by relevance (best first).
 * When hybrid is configured, includes semanticScore per hit for smart LLM routing.
 */
export async function searchCatalog(
  query: string,
  maxResults: number,
  filter?: MeiliSearchFilter,
): Promise<MeiliSearchHit[]> {
  const client = getClient();
  const index = client.index(MEILI_INDEX);

  const filterExpr = buildFilterExpr(filter);
  const hybrid = isHybridConfigured();

  const buildSearchParams = (useHybrid: boolean) => ({
    limit: maxResults,
    ...(filterExpr ? { filter: filterExpr } : {}),
    attributesToRetrieve: ['id'],
    showRankingScore: true,
    showRankingScoreDetails: useHybrid,
    ...(useHybrid
      ? {
          hybrid: {
            embedder: MEILI_EMBEDDER_NAME,
            semanticRatio: ENV.meiliSemanticRatio,
          },
        }
      : {}),
  });

  let results: Awaited<ReturnType<typeof index.search>>;
  let usedHybrid = hybrid;

  try {
    results = await index.search(query, buildSearchParams(hybrid));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // STORY-140 M4: graceful BM25 fallback when the OpenAI embedder is not yet registered.
    if (hybrid && msg.toLowerCase().includes('cannot find embedder')) {
      console.warn('[Meilisearch] searchCatalog: embedder not found, falling back to BM25');
      results = await index.search(query, buildSearchParams(false));
      usedHybrid = false;
    } else {
      throw err;
    }
  }

  return results.hits.map((hit: Record<string, unknown>, i: number) => {
    const raw = hit;
    const rankingScore = raw['_rankingScore'];
    const score =
      typeof rankingScore === 'number'
        ? rankingScore
        : 1 - i / Math.max(results.hits.length, 1);

    let semanticScore: number | undefined;
    if (usedHybrid) {
      const details = raw['_rankingScoreDetails'] as Record<string, unknown> | undefined;
      const vectorPart = details?.['vectorSort'] as Record<string, unknown> | undefined;
      const vecScore = vectorPart?.['value'];
      if (typeof vecScore === 'number') semanticScore = vecScore;
    }

    return { index: raw['id'] as number, score, semanticScore };
  });
}
