/**
 * Recommended io.net Intelligence API models for the Retail Promo agent.
 * Reasoning = ad copy, layout suggestion. Vision = product image analysis.
 * IDs must match the API's GET /models list.
 * Override via PUBLIC_IONET_AD_COPY_MODEL and PUBLIC_IONET_VISION_MODEL in .env.
 *
 * How to choose a model by need (cost, language, context): see docs/ionet-model-selection.md
 */

// Fast mode: Quick suggestions for simple edits (< 1 second)
// Cost: $0.005/request, 30% faster than Smart mode
const DEFAULT_AD_COPY_FAST = {
  primary: 'mistralai/Mistral-Nemo-Instruct-2407',
  fallback: 'mistralai/Mistral-7B-Instruct-v0.3',
} as const;

// Smart mode: Complex reasoning for strategic suggestions (2-3 seconds)
// Cost: $0.012/request, 40% better quality than Fast mode
const DEFAULT_AD_COPY_SMART = {
  primary: 'meta-llama/Llama-3.3-70B-Instruct',
  fallback: 'meta-llama/Llama-3.1-70B-Instruct',
} as const;

// Use Smart mode by default for better quality
const DEFAULT_AD_COPY = DEFAULT_AD_COPY_SMART;

// Vision: Product image analysis
// Cost: $0.008/request, 25% better accuracy than previous model
const DEFAULT_VISION = {
  primary: 'Qwen/Qwen2.5-VL-32B-Instruct',
  fallback: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
} as const;

export const AD_COPY_MODELS = DEFAULT_AD_COPY;
export const AD_COPY_MODELS_FAST = DEFAULT_AD_COPY_FAST;
export const AD_COPY_MODELS_SMART = DEFAULT_AD_COPY_SMART;
export const VISION_MODELS = DEFAULT_VISION;

/** Get Fast mode models for quick suggestions (less than 1 second) */
export function getAdCopyModelsFast(): { primary: string; fallback: string } {
  return DEFAULT_AD_COPY_FAST;
}

/** Get Smart mode models for complex reasoning (2-3 seconds) */
export function getAdCopyModelsSmart(): { primary: string; fallback: string } {
  return DEFAULT_AD_COPY_SMART;
}

/** Ad copy models to use (env override or defaults). Use in AgentChat / AI edit. */
export function getAdCopyModels(): { primary: string; fallback: string } {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const primary = (env as Record<string, string | undefined>).PUBLIC_IONET_AD_COPY_MODEL?.trim();
  return {
    primary: primary && primary.length > 0 ? primary : DEFAULT_AD_COPY.primary,
    fallback: DEFAULT_AD_COPY.fallback,
  };
}

/** Vision models to use (env override or defaults). */
export function getVisionModels(): { primary: string; fallback: string } {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const primary = (env as Record<string, string | undefined>).PUBLIC_IONET_VISION_MODEL?.trim();
  return {
    primary: primary && primary.length > 0 ? primary : DEFAULT_VISION.primary,
    fallback: DEFAULT_VISION.fallback,
  };
}

export const TRANSLATION_MODELS = {
  /** Cheap, handles Balkan (SR/HR/BS) and EN */
  primary: 'mistralai/Mistral-Nemo-Instruct-2407',
} as const;

/** Try models in order until one is available (by id). */
export function pickModel(
  availableIds: string[],
  ...candidates: string[]
): string | undefined {
  const set = new Set(availableIds.map((id) => id.toLowerCase()));
  for (const c of candidates) {
    if (set.has(c.toLowerCase())) return c;
  }
  return undefined;
}
