/**
 * STORY-68: Vision-Powered Product Analyzer
 *
 * Silently analyzes up to 3 product images using an io.net vision model.
 * Returns structured metadata the AI agent uses to make data-aware creative decisions.
 * All failures are silent — vision is optional enrichment, never a blocker.
 */

import { chatCompletion } from './ionet-client';

// ------- Types -------

export interface ProductImageAnalysis {
  /** Detected product category */
  productCategory:
    | 'electronics'
    | 'fashion'
    | 'food'
    | 'sport'
    | 'luxury'
    | 'health'
    | 'home'
    | 'automotive'
    | 'retail'
    | 'unknown';
  /** Overall image quality assessment */
  imageQuality: 'high' | 'medium' | 'low';
  /** Whether images have white/light backgrounds (affects palette choice) */
  hasLightBackgrounds: boolean;
  /** Suggested palette name from the 8 named palettes */
  suggestedPalette:
    | 'Dark Premium'
    | 'Orange Energy'
    | 'Clean White'
    | 'Forest Fresh'
    | 'Luxury Dark'
    | 'Summer Warm'
    | 'Corporate Blue'
    | 'Red Sale';
  /** Issues detected in the images */
  issues: Array<'watermark' | 'blurry' | 'low_resolution' | 'white_background' | 'poor_lighting' | 'text_overlay'>;
  /** One-sentence summary for the AI to reference in its reasoning */
  summary: string;
}

// ------- Constants -------

const VISION_MODELS = {
  primary: 'Qwen/Qwen2.5-VL-32B-Instruct',
  fallback: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
};

const VISION_TIMEOUT_MS = 45_000;

const VISION_PROMPT = `You are a product photography analyst for a retail ad design tool.
Analyze these product images and return ONLY a JSON object — no explanation, no markdown.

{
  "productCategory": "electronics|fashion|food|sport|luxury|health|home|automotive|retail|unknown",
  "imageQuality": "high|medium|low",
  "hasLightBackgrounds": true|false,
  "suggestedPalette": "Dark Premium|Orange Energy|Clean White|Forest Fresh|Luxury Dark|Summer Warm|Corporate Blue|Red Sale",
  "issues": [],
  "summary": "One sentence describing what you see."
}

Palette selection guide:
- electronics/tech → Dark Premium
- sport/action/deals → Orange Energy
- modern/generic retail → Clean White
- eco/food/health → Forest Fresh
- premium/jewelry/luxury → Luxury Dark
- fashion/seasonal → Summer Warm
- B2B/corporate → Corporate Blue
- clearance/urgency → Red Sale

issues array values (include only what applies):
"watermark" = visible watermark/logo overlay
"blurry" = noticeably blurry or pixelated
"low_resolution" = very small/low-res images
"white_background" = images have white or near-white backgrounds
"poor_lighting" = dark, overexposed, or inconsistent lighting
"text_overlay" = price tags or text burned into the image

Respond with the JSON only.`;

// ------- Image utilities -------

/**
 * Resizes a data URI image to max 512px on the longest side using a canvas element.
 * Falls back to the original URI in non-browser environments or on error.
 */
export async function resizeImageDataUri(dataUri: string, maxPx = 512): Promise<string> {
  if (typeof document === 'undefined') return dataUri;

  return new Promise((resolve) => {
    // Fallback: if canvas resize doesn't complete within 100ms, use original URI.
    // In real browsers onload fires far sooner; this guard only matters in test envs.
    const timeout = setTimeout(() => resolve(dataUri), 100);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUri);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(dataUri);
    };
    img.src = dataUri;
  });
}

/**
 * Selects up to 3 images from the array using first/middle/last strategy
 * to cover product variety without exceeding token limits.
 */
export function sampleImages(imageDataUris: string[]): string[] {
  const n = imageDataUris.length;
  if (n === 0) return [];
  if (n === 1) return [imageDataUris[0]!];
  if (n === 2) return [imageDataUris[0]!, imageDataUris[1]!];

  const first = imageDataUris[0]!;
  const last = imageDataUris[n - 1]!;
  const mid = imageDataUris[Math.floor((n - 1) / 2)]!;
  return [first, mid, last];
}

// ------- Vision analysis -------

function tryParseAnalysis(text: string): ProductImageAnalysis | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    if (
      typeof parsed.productCategory !== 'string' ||
      typeof parsed.imageQuality !== 'string' ||
      typeof parsed.hasLightBackgrounds !== 'boolean' ||
      typeof parsed.suggestedPalette !== 'string' ||
      !Array.isArray(parsed.issues) ||
      typeof parsed.summary !== 'string'
    ) {
      return null;
    }
    return {
      productCategory: parsed.productCategory as ProductImageAnalysis['productCategory'],
      imageQuality: parsed.imageQuality as ProductImageAnalysis['imageQuality'],
      hasLightBackgrounds: parsed.hasLightBackgrounds,
      suggestedPalette: parsed.suggestedPalette as ProductImageAnalysis['suggestedPalette'],
      issues: parsed.issues as ProductImageAnalysis['issues'],
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
}

async function callVisionModel(
  apiKey: string,
  model: string,
  resizedUris: string[],
): Promise<ProductImageAnalysis | null> {
  const imageBlocks = resizedUris.map((uri) => ({
    type: 'image_url' as const,
    image_url: { url: uri },
  }));

  const response = await chatCompletion(apiKey, {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text' as const, text: VISION_PROMPT },
          ...imageBlocks,
        ],
      },
    ],
    max_completion_tokens: 400,
    temperature: 0,
  });

  const text = response.choices[0]?.message?.content ?? '';
  return tryParseAnalysis(text);
}

/**
 * Analyzes up to 3 product images using a vision model.
 * - Samples first/middle/last images
 * - Resizes to 512px max before sending (reduces token cost ~60%)
 * - Tries Qwen VL primary, falls back to Llama on failure
 * - Returns null if no images provided, or any failure (non-blocking)
 */
export async function analyzeProductImages(
  apiKey: string,
  imageDataUris: string[],
): Promise<ProductImageAnalysis | null> {
  const sampled = sampleImages(imageDataUris);
  if (sampled.length === 0) return null;

  // Resize images client-side to reduce latency and token cost
  const resized = await Promise.all(sampled.map((uri) => resizeImageDataUri(uri)));

  // Try primary model, fall back to secondary
  for (const model of [VISION_MODELS.primary, VISION_MODELS.fallback]) {
    try {
      const controller = typeof AbortController !== 'undefined'
        ? new AbortController()
        : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)
        : null;

      try {
        const result = await callVisionModel(apiKey, model, resized);
        if (result) return result;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch {
      // Try next model
    }
  }

  return null;
}
