import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first (takes precedence), then .env as fallback
// Must happen before ENV object is created
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.ORAICLE_API_URL ?? process.env.BUILT_IN_FORGE_API_URL ?? "",
  /** LLM API key: io.net token or ORAICLE/Forge. Any of these work for server LLM (selectProducts, etc.). */
  forgeApiKey:
    process.env.IO_NET_API_TOKEN ??
    process.env.ORAICLE_API_KEY ??
    process.env.BUILT_IN_FORGE_API_KEY ??
    process.env.IONET_API_KEY ??
    process.env.VITE_IONET_API_KEY ??
    "",
  /** Model for server LLM calls (selectProducts, interpretProductSearch). Default = io.net Fast. */
  llmModel:
    process.env.ORAICLE_LLM_MODEL ??
    process.env.IONET_LLM_MODEL ??
    "mistralai/Mistral-Nemo-Instruct-2407",
  /** Per-request timeout for LLM API (ms). io.net can be slow (queue + generation); default 60s. */
  llmRequestTimeoutMs: Math.max(
    15000,
    parseInt(process.env.LLM_REQUEST_TIMEOUT_MS ?? "60000", 10) || 60000
  ),
  // Meilisearch (STORY-136 + STORY-137 + STORY-138)
  meiliHost: process.env.MEILI_HOST ?? "",
  meiliApiKey: process.env.MEILI_API_KEY ?? "",
  /** STORY-138: OpenAI API key for text-embedding-3-small hybrid search embedder. */
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  /**
   * Legacy: STORY-137 io.net REST embedder name. After STORY-138, hybrid uses OpenAI
   * (`OPENAI_API_KEY`) in `meilisearch-service.ts`; this field is not read for `isHybridConfigured()`.
   */
  meiliEmbeddingModel: process.env.MEILI_EMBEDDING_MODEL ?? "",
  /** STORY-137: BM25/vector balance for hybrid search. 0 = pure BM25, 1 = pure vector. Default 0.5. */
  meiliSemanticRatio: Math.max(
    0,
    Math.min(1, parseFloat(process.env.MEILI_SEMANTIC_RATIO ?? "0.5") || 0.5)
  ),
  /**
   * STORY-137: Meilisearch _rankingScore threshold for smart LLM routing.
   * If all top-N hits exceed this threshold, selectProducts is skipped.
   * Default 0.85. Set to 1.0 to always use LLM rerank.
   */
  meiliConfidenceThreshold: Math.max(
    0,
    Math.min(1, parseFloat(process.env.MEILI_CONFIDENCE_THRESHOLD ?? "0.85") || 0.85)
  ),
  // Mobileland.me Magento REST API (OAuth 1.0)
  mobilelandBaseUrl: process.env.MOBILELAND_BASE_URL ?? "",
  mobilelandConsumerKey: process.env.MOBILELAND_CONSUMER_KEY ?? "",
  mobilelandConsumerSecret: process.env.MOBILELAND_CONSUMER_SECRET ?? "",
  mobilelandAccessToken: process.env.MOBILELAND_ACCESS_TOKEN ?? "",
  mobilelandAccessTokenSecret: process.env.MOBILELAND_ACCESS_TOKEN_SECRET ?? "",
  /** STORY-180: Kling AI — server-only; never expose to client. */
  klingAccessKey: process.env.KLING_ACCESS_KEY ?? "",
  klingSecretKey: process.env.KLING_SECRET_KEY ?? "",
  /**
   * Kling API host (default Singapore region for servers outside China).
   * @see https://app.klingai.com/global/dev/document-api/apiReference/commonInfo
   */
  klingApiBaseUrl: process.env.KLING_API_BASE_URL ?? "https://api-singapore.klingai.com",
  /** Default model_name for text-to-video (override via env). */
  klingDefaultVideoModel: process.env.KLING_DEFAULT_VIDEO_MODEL ?? "kling-v2-6",
  /** Default model_name for image generation (Kolors). */
  klingDefaultImageModel: process.env.KLING_DEFAULT_IMAGE_MODEL ?? "kling-v2-1",
  /**
   * STORY-198: Optional LLM query expansion before Meilisearch Stage-1 (agent catalog_filter).
   * Requires forgeApiKey. Set STAGE1_QUERY_EXPANSION=1 to enable (extra LLM cost per search).
   */
  stage1QueryExpansionEnabled:
    process.env.STAGE1_QUERY_EXPANSION === "1" ||
    process.env.STAGE1_QUERY_EXPANSION === "true",
};
