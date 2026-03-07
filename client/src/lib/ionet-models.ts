/**
 * Recommended io.net Intelligence API models for the Retail Promo agent.
 * Reasoning = ad copy, layout suggestion. Vision = product image analysis.
 * IDs must match the API's GET /models list.
 * Override via PUBLIC_IONET_AD_COPY_MODEL and PUBLIC_IONET_VISION_MODEL in .env.
 *
 * How to choose a model by need (cost, language, context): see docs/ionet-model-selection.md
 */

const DEFAULT_AD_COPY = {
  primary: 'openai/gpt-oss-120b',
  fallback: 'openai/gpt-oss-20b',
} as const;

const DEFAULT_VISION = {
  primary: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
  fallback: 'Qwen/Qwen2.5-VL-32B-Instruct',
} as const;

export const AD_COPY_MODELS = DEFAULT_AD_COPY;
export const VISION_MODELS = DEFAULT_VISION;

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
