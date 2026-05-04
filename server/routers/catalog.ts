/**
 * Catalog management router
 * Handles external API integration, caching, and sync
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { ENV } from '../_core/env';
import { invokeLLM } from '../_core/llm';
import { UniversalExternalAPIConnector, type ExternalAPIConfig } from '../lib/external-api-connector';
import { getMobilelandImageMap } from '../lib/mobileland-api';
import { v4 as uuidv4 } from 'uuid';
import {
  isMeilisearchConfigured,
  isHybridConfigured,
  configureIndex,
  indexCatalog,
  searchCatalog,
  deleteDocuments,
  getIndexStats,
} from '../lib/meilisearch-service';
import { testExternalCatalogConnection } from '../lib/external-catalog-connection';
import { syncCatalogFromApi } from '../lib/catalog-api-sync';
import { getCatalogHealth, syncCatalog, cacheExcelProducts, getSyncState } from '../lib/catalog-health';
import { runExpandSearchQueryStage1 } from '../lib/expand-search-query-stage1';

const IONET_DEBUG_DIR = join(process.cwd(), '.tmp', 'ionet-selectProducts');

/**
 * Save raw io.net response and extracted content to .tmp for inspection and parser testing.
 * Does not throw; logs and ignores write errors. Skipped in test env.
 */
async function saveRawResponseForDebug(response: unknown, extractedContent: string | null): Promise<void> {
  if (process.env.VITEST === 'true') return;
  try {
    await mkdir(IONET_DEBUG_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(IONET_DEBUG_DIR, `response-${ts}.json`),
      JSON.stringify(response, null, 2),
      'utf-8',
    );
    if (extractedContent !== null) {
      await writeFile(
        join(IONET_DEBUG_DIR, `content-${ts}.txt`),
        extractedContent,
        'utf-8',
      );
    }
    console.warn('[selectProducts] Raw response saved to', join(IONET_DEBUG_DIR, `response-${ts}.json`));
  } catch (e) {
    console.warn('[selectProducts] Failed to save raw response to .tmp:', e);
  }
}

/**
 * Get a single string from io.net chat message (handles content as string, content as array of parts, and reasoning_content).
 * io.net can return: content (string), content (array of { type, text }), and/or reasoning_content.
 */
function getMessageContent(
  message: unknown,
): string | null {
  if (!message || typeof message !== 'object') return null;
  const m = message as Record<string, unknown>;

  const content = m.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (part && typeof part === 'object' && 'text' in part && typeof (part as { text: string }).text === 'string') {
        parts.push((part as { text: string }).text);
      }
    }
    if (parts.length > 0) return parts.join('\n');
  }

  const reasoning = m.reasoning_content;
  if (typeof reasoning === 'string' && reasoning.trim()) return reasoning;

  return null;
}

/**
 * Extract {"indices":[...],"reasoning":"..."} from a string that may contain reasoning text + JSON (e.g. io.net reasoning_content).
 */
function extractIndicesJson(text: string): string | null {
  const marker = '{"indices":';
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = '';
  for (let i = idx; i < text.length; i++) {
    const c = text[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return text.slice(idx, i + 1);
      } else if (c === '"' || c === "'") {
        inString = true;
        quote = c;
      }
      continue;
    }
    if (c === quote) inString = false;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const catalogRouter = router({
  /**
   * Return the in-memory Mobileland SKU→image URL map immediately.
   * Returns {} while the background cache is still warming up.
   * The client polls every 30s until the map is non-empty.
   */
  getMobilelandImages: publicProcedure.query(() => {
    return getMobilelandImageMap();
  }),

  /**
   * STORY-177: GET the configured catalog API URL from the server (CORS bypass + SSRF limits).
   * Does not persist credentials — caller sends URL/auth from Workspace Settings.
   */
  testExternalCatalogConnection: publicProcedure
    .input(
      z.object({
        baseUrl: z.string().max(2048),
        authHeaderName: z.string().max(128).optional(),
        authHeaderValue: z.string().max(8192).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return testExternalCatalogConnection(input);
    }),

  /**
   * STORY-178: Paginated GET + JSON field mapping → normalized product rows (server-side; SSRF-safe).
   */
  syncCatalogFromApi: publicProcedure
    .input(
      z.object({
        baseUrl: z.string().max(2048),
        authHeaderName: z.string().max(128).optional(),
        authHeaderValue: z.string().max(8192).optional(),
        itemsPath: z.string().max(256).default(''),
        paginationMode: z.enum(['offset', 'page']).default('offset'),
        offsetParam: z.string().max(64).default('offset'),
        limitParam: z.string().max(64).default('limit'),
        pageParam: z.string().max(64).default('page'),
        pageSizeParam: z.string().max(64).default('limit'),
        pageSize: z.number().int().min(1).max(500).default(100),
        firstPage: z.number().int().min(0).max(1).default(0),
        startOffset: z.number().int().nonnegative().default(0),
        maxPages: z.number().int().min(1).max(500).default(100),
        maxProducts: z.number().int().min(1).max(100000).default(10000),
        mapName: z.string().max(128).default('name'),
        mapCode: z.string().max(128).optional(),
        mapCategory: z.string().max(128).optional(),
        mapBrand: z.string().max(128).optional(),
        mapPrice: z.string().max(128).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return syncCatalogFromApi(input);
    }),

  /**
   * STORY-136 + STORY-138: Return which search provider is active.
   * STORY-138: Meilisearch is the only supported provider. 'unconfigured' is returned
   * when MEILI_HOST/MEILI_API_KEY are not set so the client can show an appropriate message.
   */
  getSearchProvider: publicProcedure.query(() => {
    const provider = isMeilisearchConfigured()
      ? ('meilisearch' as const)
      : ('unconfigured' as const);
    return {
      provider,
      /** true when OpenAI embedder is configured — hybrid BM25+vector search active. */
      hybridEnabled: isHybridConfigured(),
      /** _rankingScore threshold for skipping LLM selectProducts when confidence is high. */
      confidenceThreshold: ENV.meiliConfidenceThreshold,
    };
  }),

  /**
   * STORY-136 M1+M2: Index a catalog into Meilisearch.
   * Called by the client when products are loaded and provider is 'meilisearch'.
   * Sets index settings, replaces documents, updates synonyms. No-op if Meilisearch not configured.
   */
  indexProducts: publicProcedure
    .input(
      z.object({
        products: z.array(
          z.object({
            /**
             * STORY-139: Explicit Meilisearch document ID = position in the full catalog array.
             * Stable across incremental upserts — allows correct search result lookup and
             * targeted deletes without re-fetching the full index.
             */
            id: z.number().int().nonnegative(),
            name: z.string(),
            code: z.string().optional(),
            category: z.string().optional(),
            brand: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isMeilisearchConfigured()) {
        return { success: false, message: 'Meilisearch not configured' };
      }
      const docs = input.products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand ?? '',
        code: p.code ?? '',
        category: p.category ?? '',
      }));
      await indexCatalog(docs);
      // Cache for auto-resync recovery if Meilisearch is wiped
      cacheExcelProducts(docs);
      return { success: true, indexed: docs.length };
    }),

  /**
   * STORY-136 M3 + STORY-137 M2: Search catalog via Meilisearch.
   * Returns matching product indices with _rankingScore (and _semanticScore when hybrid active).
   * AgentChat uses scores for smart LLM routing (STORY-137 M3): skip selectProducts when
   * all top hits exceed confidenceThreshold.
   */
  searchProducts: publicProcedure
    .input(
      z.object({
        query: z.string(),
        maxResults: z.number().int().min(1).max(500).default(100),
        filter: z
          .object({
            category: z.string().optional(),
            brand: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isMeilisearchConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Meilisearch not configured — set MEILI_HOST and MEILI_API_KEY.',
        });
      }
      const hits = await searchCatalog(input.query, input.maxResults, input.filter);
      return hits;
    }),

  /**
   * Interpret natural-language product search using LLM.
   * Returns nameContains + category so the client can apply the same filter as catalog_filter.
   * Uses catalog vocabulary (categories, sampleNames) so the model returns exact category names.
   */
  interpretProductSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        categories: z.array(z.object({ name: z.string(), count: z.number() })),
        sampleNames: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { query, categories, sampleNames } = input;
      if (!query.trim()) {
        return { nameContains: '', category: '' };
      }
      const categoryList = categories.map((c) => c.name).join('\n');
      const sampleList = sampleNames.slice(0, 30).join('\n');
      const systemPrompt = `You are a product search interpreter. Given the user's search phrase and the catalog context, return a JSON object with exactly two string fields:
- nameContains: 1-2 word term from the catalog (brand, model, or product term). Use words from the sample product names when possible. Leave empty "" if the query is only about category.
- category: EXACTLY one of the category names from the list below, or "" if none apply. Do not invent category names.

Categories (use exact name):
${categoryList || '(none)'}

Sample product names (use similar wording for nameContains):
${sampleList || '(none)'}

Reply with ONLY valid JSON: {"nameContains":"...","category":"..."}`;
      const userPrompt = `User search: "${query.trim()}"`;
      try {
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 150,
          response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          return { nameContains: query.trim(), category: '' };
        }
        const parsed = JSON.parse(content) as { nameContains?: string; category?: string };
        const nameContains = typeof parsed.nameContains === 'string' ? parsed.nameContains.trim() : '';
        const category = typeof parsed.category === 'string' ? parsed.category.trim() : '';
        const validCategory = categories.some((c) => c.name === category) ? category : '';
        return { nameContains: nameContains || query.trim(), category: validCategory };
      } catch (err) {
        console.warn('[interpretProductSearch] LLM failed:', err);
        return { nameContains: query.trim(), category: '' };
      }
    }),

  /**
   * STORY-198: Optional LLM sub-queries before Meilisearch Stage-1 (`catalog_filter`).
   * Server: requires `STAGE1_QUERY_EXPANSION=1` and a configured LLM API key; otherwise returns `{ suggestions: [] }`.
   * Client: should only call when `VITE_STAGE1_QUERY_EXPANSION=1` to avoid extra round trips.
   * Output is merged in `AgentChat` with deterministic `buildExpandedSearchQueries` (LLM first, then lexical).
   */
  expandSearchQueryStage1: publicProcedure
    .input(
      z.object({
        query: z.string().max(500),
        vocabularyHints: z.array(z.string()).max(60),
      }),
    )
    .mutation(async ({ input }) => {
      const suggestions = await runExpandSearchQueryStage1(input.query, input.vocabularyHints);
      return { suggestions };
    }),

  /**
   * STORY-139: Delete products from the Meilisearch index by their numeric IDs.
   * Called by the client incremental indexing flow when products are removed from the catalog.
   * No-op if Meilisearch not configured or ids is empty.
   */
  deleteProducts: publicProcedure
    .input(z.object({ ids: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      if (!isMeilisearchConfigured() || input.ids.length === 0) {
        return { success: true, deleted: 0 };
      }
      await deleteDocuments(input.ids);
      return { success: true, deleted: input.ids.length };
    }),

  /**
   * STORY-139: Return the number of documents in the Meilisearch index.
   * Client uses this for health check: documentCount === 0 → force full re-index.
   * Returns { documentCount: 0 } when Meilisearch is not configured.
   * Implemented as mutation so it can be called imperatively from React effects.
   */
  getIndexStats: publicProcedure.mutation(async () => {
    if (!isMeilisearchConfigured()) {
      return { documentCount: 0 };
    }
    try {
      return await getIndexStats();
    } catch {
      return { documentCount: 0 };
    }
  }),
  /**
   * Catalog health check — returns full pipeline status.
   * Used by the client to show sync state and trigger manual resync.
   */
  getCatalogHealth: publicProcedure.query(async () => {
    return await getCatalogHealth();
  }),
  /**
   * Manual catalog resync — triggers re-fetch from active data source
   * and re-indexes into Meilisearch. Self-healing on demand.
   */
  resyncCatalog: publicProcedure.mutation(async () => {
    const result = await syncCatalog(true);
    return result;
  }),
  /**
   * Get current sync state (non-blocking, no Meilisearch call).
   */
  getSyncState: publicProcedure.query(async () => {
    return getSyncState();
  }),

  /**
   * STORY-140 M2: Configure the Meilisearch index settings + OpenAI embedder on app startup.
   * Idempotent — safe to call every time the client mounts.
   * This ensures the embedder is registered even when no catalog changes have occurred
   * since the last run (so incremental indexing does not skip embedder setup).
   */
  configureIndex: publicProcedure.mutation(async () => {
    if (!isMeilisearchConfigured()) {
      return { ok: false, reason: 'meilisearch_not_configured' as const };
    }
    try {
      await configureIndex();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[catalog.configureIndex] failed:', msg);
      return { ok: false, reason: msg };
    }
  }),

  /**
   * STORY-119: AI-driven product selection.
   * Receives a natural-language query + compact list of candidate products.
   * LLM reads the actual product names/brands from this catalog (any source, any vocabulary)
   * and returns the indices of candidates that match the query.
   * This replaces client-side fuzzy matching for agent-driven catalog_filter actions.
   */
  selectProducts: publicProcedure
    .input(
      z.object({
        query: z.string(),
        candidates: z.array(
          z.object({
            index: z.number(),
            name: z.string(),
            code: z.string().optional(),
            category: z.string().optional(),
            brand: z.string().optional(),
          }),
        ),
        maxSelect: z.number().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const { query, candidates, maxSelect } = input;

      if (!query.trim() || candidates.length === 0) {
        return { indices: [] as number[], reasoning: 'Empty query or no candidates.' };
      }

      const candidateList = candidates
        .map((c) => {
          const parts = [
            `index:${c.index}`,
            `name:"${c.name}"`,
            c.brand ? `brand:"${c.brand}"` : '',
            c.category ? `category:"${c.category}"` : '',
            c.code ? `code:${c.code}` : '',
          ].filter(Boolean);
          return `{${parts.join(', ')}}`;
        })
        .join('\n');

      const maxNote =
        maxSelect > 0
          ? ` Return at most ${maxSelect} indices.`
          : ' Return ALL matching indices (no limit).';

      // STORY-150: System prompt is category-agnostic and entity-strict (Role → Task → Constraints → Format).
      const systemPrompt = `Role
You are a product selection assistant for a retail advertising platform.

Task
Given a user search query and a list of product candidates (from any catalog — electronics, tools, apparel, or any other category), select which candidates genuinely match the query. Select ONLY from the provided candidate list; never invent or assume indices.

Constraints
1. Entity scope (strict): When the query names a specific model, variant, or specification (e.g. "iPhone 15", "Makita 18V", "Samsung S24"), include ONLY candidates that match that exact entity. EXCLUDE all other models, variants, or specs — even adjacent ones (e.g. for "iPhone 15" → exclude iPhone 14 and iPhone 16; for "18V battery" → exclude 12V and 20V batteries).
2. Vocabulary (inclusive): Treat synonyms and locale-translated equivalents as matches (e.g. "charger" = "punjač"; "case" = "futrola"; "drill" = "bušilica"). Map abbreviations to their full names (e.g. "USB-C" = "Type-C" = "USB Type-C").
3. Category scope: A product matches only if it fits the query's category AND any specified brand/model/spec. A product in a different category does not match (e.g. a cable is not a charger; a drill is not a drill bit).
4. No hallucination: Return only indices that appear in the provided candidate list. If no candidate matches, return empty indices.
5. Product family / part-type (high recall): When the query describes a **category of product** or **part** (tires, tubes, chargers, cases, batteries, filters, etc.) rather than one exact SKU, include **all** candidates that plausibly fit the **intent**. Include **variant forms** that appear in the catalog (e.g. solid vs pneumatic, inner vs outer, tubeless vs tubed, different local spellings or marketing words like "puna" vs "spoljašnja" for tires) **unless** the user explicitly excludes a variant ("only solid", "without inner tube").
6. Do not over-filter synonyms: If the user asks for "outer tires" / "spoljne gume", include every candidate that is an outer/scooter tire in the list — not only rows whose name repeats one specific adjective; exclude inner tubes only when the query asks for outer/exterior tires (inner tubes are a different part type).${maxNote}

Format
End your reply with exactly one line of valid JSON: {"indices":[<list of matching index values>],"reasoning":"<1 sentence>"}
Example: {"indices":[2,5],"reasoning":"Both match the requested model and category."}
No other format. The JSON may appear after your reasoning text.`;

      const userPrompt = `Query: "${query.trim()}"\n\nCandidates:\n${candidateList}`;

      const candidateIndexSet = new Set(candidates.map((c) => c.index));
      const MAX_LLM_ATTEMPTS = 3;
      const RETRY_DELAY_MS = 800;
      // Generous output limit so the model can finish (reasoning + full indices list + JSON). gpt-oss-120b has 128k context; we use 8k output to avoid unnecessary truncation.
      const SELECT_PRODUCTS_MAX_TOKENS = 8192;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
        if (attempt === 1) {
          console.warn(
            '[selectProducts] Request params:',
            { model: ENV.llmModel, max_tokens: SELECT_PRODUCTS_MAX_TOKENS, response_format: 'none (plain text)' },
          );
        }
        if (attempt > 1) {
          console.warn(`[selectProducts] Attempt ${attempt}/${MAX_LLM_ATTEMPTS} starting (retry).`);
        }
        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: SELECT_PRODUCTS_MAX_TOKENS,
          });

          // io.net can return: message.content (string), message.content (array of { type, text }), or message.reasoning_content
          const msg = response.choices[0]?.message;
          const content = getMessageContent(msg);
          await saveRawResponseForDebug(response, content);

          if (!content || typeof content !== 'string') {
            const fullRaw = JSON.stringify(response, null, 2);
            if (attempt < MAX_LLM_ATTEMPTS) {
              console.warn(
                `[selectProducts] Attempt ${attempt}/${MAX_LLM_ATTEMPTS}: io.net returned no content. Raw (first 1200 chars):`,
                fullRaw.slice(0, 1200),
              );
              console.warn(`[selectProducts] Retrying in ${RETRY_DELAY_MS}ms...`);
              await sleep(RETRY_DELAY_MS);
              continue;
            }
            console.warn(`[selectProducts] All ${MAX_LLM_ATTEMPTS} attempts returned no content. Full io.net response (no truncation):`);
            console.warn(fullRaw);
            return { indices: [] as number[], reasoning: 'LLM returned no content.' };
          }

          try {
            let parsed: { indices?: unknown; reasoning?: string };
            try {
              parsed = JSON.parse(content) as { indices?: unknown; reasoning?: string };
            } catch {
              const extracted = extractIndicesJson(content);
              parsed = extracted
                ? (JSON.parse(extracted) as { indices?: unknown; reasoning?: string })
                : (() => {
                    throw new Error('No JSON in response');
                  })();
            }

            const indices = Array.isArray(parsed.indices)
              ? (parsed.indices as unknown[])
                  .filter(
                    (v): v is number =>
                      typeof v === 'number' && Number.isInteger(v) && candidateIndexSet.has(v),
                  )
                  .slice(0, maxSelect > 0 ? maxSelect : undefined)
              : [];

            if (attempt > 1) {
              console.warn(`[selectProducts] Succeeded on attempt ${attempt}/${MAX_LLM_ATTEMPTS}, returning ${indices.length} indices.`);
            }
            return { indices, reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '' };
          } catch (parseErr) {
            const indicesMatch = content.match(/"indices"\s*:\s*\[([^\]]*)\]/);
            let recoveredIndices: number[] = [];
            if (indicesMatch && indicesMatch[1]) {
              recoveredIndices = indicesMatch[1]
                .split(',')
                .map((s) => Number(s.trim()))
                .filter(
                  (v): v is number =>
                    Number.isInteger(v) && candidateIndexSet.has(v),
                );
            }

            if (recoveredIndices.length > 0) {
              const reasoningMatch = content.match(/"reasoning"\s*:\s*"([^"]*)"/);
              const reasoning =
                (reasoningMatch && reasoningMatch[1]) ||
                'LLM returned non-strict JSON; indices recovered best-effort.';
              const limited = recoveredIndices.slice(
                0,
                maxSelect > 0 ? maxSelect : undefined,
              );
              return { indices: limited, reasoning };
            }

            if (attempt < MAX_LLM_ATTEMPTS) {
              console.warn(
                `[selectProducts] Attempt ${attempt}/${MAX_LLM_ATTEMPTS}: unrecoverable JSON, retrying...`,
                (parseErr as Error).message,
              );
              await sleep(RETRY_DELAY_MS);
              continue;
            }

            const fullResponseJson = JSON.stringify(response, null, 2);
            console.warn(
              '[selectProducts] Unable to recover indices. Content length:',
              content.length,
              '| Full content (no truncation):',
            );
            console.warn(content);
            console.warn('[selectProducts] Full io.net response object (no truncation):');
            console.warn(fullResponseJson);
            throw parseErr;
          }
        } catch (err) {
          const isLastAttempt = attempt === MAX_LLM_ATTEMPTS;
          if (!isLastAttempt) {
            console.warn(`[selectProducts] Attempt ${attempt}/${MAX_LLM_ATTEMPTS} failed:`, err);
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          console.warn('[selectProducts] LLM failed after all retries:', err);
          const message = err instanceof Error ? err.message : '';
          const reasoning =
            message.includes('not configured') ||
            message.includes('API key') ||
            message.includes('ORAICLE_API_KEY') ||
            message.includes('VITE_IONET_API_KEY')
              ? 'LLM not configured — set VITE_IONET_API_KEY (or ORAICLE_API_KEY) in .env.local for semantic selection.'
              : 'LLM error — no products selected.';
          return { indices: [] as number[], reasoning };
        }
      }

      console.warn('[selectProducts] All attempts exhausted, returning empty indices.');
      return { indices: [] as number[], reasoning: 'LLM error — no products selected.' };
    }),

  /**
   * Create new external API configuration
   */
  createAPIConfig: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.enum(['rest', 'graphql', 'soap', 'custom']),
        endpoint: z.string().url(),
        method: z.enum(['GET', 'POST']).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        auth: z
          .object({
            type: z.enum(['bearer', 'api-key', 'basic', 'oauth2', 'custom']),
            token: z.string().optional(),
            username: z.string().optional(),
            password: z.string().optional(),
            apiKey: z.string().optional(),
            apiKeyHeader: z.string().optional(),
            customHeader: z.string().optional(),
          })
          .optional(),
        responsePath: z.string().optional(),
        graphqlQuery: z.string().optional(),
        fieldMappings: z.record(z.string(), z.string().optional()),
        pagination: z
          .object({
            type: z.enum(['offset', 'cursor', 'page']),
            pageSize: z.number().optional(),
            pageParam: z.string().optional(),
            offsetParam: z.string().optional(),
            cursorParam: z.string().optional(),
            hasMorePath: z.string().optional(),
          })
          .optional(),
        rateLimit: z
          .object({
            requestsPerSecond: z.number().optional(),
            requestsPerMinute: z.number().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const configId = uuidv4();

      // Store configuration
      // TODO: Use database to store config
      // await db.externalAPIConfigs.insert({
      //   id: configId,
      //   userId: ctx.user.id,
      //   ...input,
      // });

      return {
        success: true,
        configId,
        message: 'API configuration created successfully',
      };
    }),

  /**
   * Test connection to external API
   */
  testAPIConnection: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        method: z.enum(['GET', 'POST']).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        auth: z
          .object({
            type: z.enum(['bearer', 'api-key', 'basic', 'oauth2', 'custom']),
            token: z.string().optional(),
            username: z.string().optional(),
            password: z.string().optional(),
            apiKey: z.string().optional(),
            apiKeyHeader: z.string().optional(),
            customHeader: z.string().optional(),
          })
          .optional(),
        responsePath: z.string().optional(),
        fieldMappings: z.record(z.string(), z.string().optional()),
      }),
    )
    .mutation(async ({ input }) => {
      const config: ExternalAPIConfig = {
        id: 'test',
        name: 'Test',
        type: 'rest',
        endpoint: input.endpoint,
        method: input.method,
        headers: input.headers as any,
        auth: input.auth,
        responsePath: input.responsePath,
        fieldMappings: input.fieldMappings as any,
      };

      const connector = new UniversalExternalAPIConnector(config);
      const result = await connector.testConnection();

      return {
        success: result.success,
        error: result.error,
        message: result.success ? 'Connection successful!' : `Connection failed: ${result.error}`,
      };
    }),

  /**
   * Fetch products from external API
   */
  fetchProducts: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        pageParam: z.string().or(z.number()).optional(),
        pageSize: z.number().default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      // TODO: Get config from database
      // const config = await db.externalAPIConfigs.findOne({
      //   id: input.configId,
      //   userId: ctx.user.id,
      // });

      // For now, return mock response
      return {
        success: false,
        products: [],
        error: 'Config not found',
      };
    }),

  /**
   * Sync catalog from external API
   */
  syncCatalog: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        fullSync: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const syncId = uuidv4();
      const startTime = Date.now();

      try {
        // TODO: Implement full sync logic
        // 1. Get config from database
        // 2. Create connector
        // 3. Fetch all products with pagination
        // 4. Insert/update in database
        // 5. Log sync results

        return {
          success: true,
          syncId,
          message: 'Sync started',
          estimatedTime: '5-10 minutes',
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMsg,
        };
      }
    }),

  /**
   * Get sync status
   */
  getSyncStatus: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Get sync status from database
      return {
        status: 'idle',
        lastSyncAt: null,
        lastSyncStatus: null,
        productCount: 0,
      };
    }),

  /**
   * Get catalog products
   */
  getCatalogProducts: publicProcedure
    .input(
      z.object({
        configId: z.string().optional(),
        search: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      // Try Meilisearch first, fall back to cached products
      const { getCachedProducts } = await import('../lib/catalog-health');
      const cached = getCachedProducts();

      if (isMeilisearchConfigured() && input.search) {
        try {
          const hits = await searchCatalog(
            input.search,
            { category: input.category, brand: input.brand },
            input.limit,
          );
          return {
            products: hits.map(h => {
              const product = cached[h.index];
              return product ? { ...product, score: h.score } : { id: h.index, name: 'Unknown', code: '', brand: '', category: '', score: h.score };
            }),
            total: hits.length,
            hasMore: false,
          };
        } catch {
          // Fall through to cache
        }
      }

      // Graceful degradation: serve from in-memory cache
      let filtered = cached;
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
        );
      }
      if (input.category) {
        filtered = filtered.filter(p => p.category === input.category);
      }
      if (input.brand) {
        filtered = filtered.filter(p => p.brand === input.brand);
      }
      const total = filtered.length;
      const page = filtered.slice(input.offset, input.offset + input.limit);
      return {
        products: page,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get API configurations for user
   */
  getAPIConfigs: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Get from database
    return {
      configs: [],
    };
  }),

  /**
   * Update API configuration
   */
  updateAPIConfig: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        name: z.string().optional(),
        endpoint: z.string().url().optional(),
        auth: z.object({}).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Update in database
      return {
        success: true,
        message: 'Configuration updated',
      };
    }),

  /**
   * Delete API configuration
   */
  deleteAPIConfig: protectedProcedure
    .input(z.object({ configId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Delete from database
      return {
        success: true,
        message: 'Configuration deleted',
      };
    }),

  /**
   * Set sync schedule
   */
  setSyncSchedule: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        frequency: z.enum(['manual', 'hourly', 'daily', 'weekly']),
        dayOfWeek: z.number().min(0).max(6).optional(),
        hourOfDay: z.number().min(0).max(23).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Save schedule to database
      return {
        success: true,
        message: 'Sync schedule updated',
      };
    }),

  /**
   * Get sync history
   */
  getSyncHistory: protectedProcedure
    .input(
      z.object({
        configId: z.string(),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // TODO: Get from database
      return {
        logs: [],
      };
    }),
});
