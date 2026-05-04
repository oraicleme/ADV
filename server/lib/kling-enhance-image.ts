/**
 * Kling Product Image Enhancement
 *
 * Two modes:
 *   1. image-to-image: product already has an image URL → Kling enhances it with
 *      a clean studio background, better lighting, professional product shot.
 *   2. text-to-image: no image → Kling generates one from product name/category/brand.
 *
 * Output: a public image URL from Kling CDN, ready to be used as imageDataUri.
 * Cost: ~$0.028 per image (Kling Kolors 1K).
 */

import { klingSubmitImageGeneration, klingGetImageGenTask } from './kling-media';

export type KlingEnhanceProductInput = {
  /** Product name */
  name: string;
  /** Product category (e.g. "Smartphones", "Laptops") */
  category?: string;
  /** Brand name */
  brand?: string;
  /** Existing image URL (if available — triggers image-to-image enhancement) */
  existingImageUrl?: string;
  /** Desired aspect ratio for the output image */
  aspectRatio?: '1:1' | '4:3' | '3:4';
  /** Style hint: 'studio' (clean white bg) | 'lifestyle' (contextual scene) | 'minimal' */
  style?: 'studio' | 'lifestyle' | 'minimal';
};

export type KlingEnhanceProductResult = {
  /** Public URL of the generated/enhanced image */
  imageUrl: string;
  /** The prompt used */
  prompt: string;
  /** Whether this was an enhancement (true) or fresh generation (false) */
  wasEnhancement: boolean;
};

/**
 * Build a product photography prompt for Kling Kolors.
 * Optimized for e-commerce/retail advertising use cases.
 */
function buildProductPrompt(input: KlingEnhanceProductInput): { prompt: string; negativePrompt: string } {
  const { name, category, brand, style = 'studio' } = input;

  const productDesc = [brand, name, category].filter(Boolean).join(' ');

  let styleDesc: string;
  switch (style) {
    case 'lifestyle':
      styleDesc =
        'lifestyle photography, natural environment, warm ambient lighting, shallow depth of field, bokeh background, editorial feel';
      break;
    case 'minimal':
      styleDesc =
        'minimalist product photography, pure white background, soft diffused lighting, clean shadows, flat lay style';
      break;
    case 'studio':
    default:
      styleDesc =
        'professional studio product photography, clean white or light gradient background, soft box lighting, sharp focus, commercial quality, no text, no watermarks';
  }

  const prompt = `${productDesc}, ${styleDesc}, high resolution, advertising quality, premium retail product shot`;

  const negativePrompt =
    'blurry, low quality, watermark, text overlay, logo overlay, distorted, ugly, bad anatomy, extra objects, cluttered background, dark, overexposed, cartoon, illustration, painting';

  return { prompt, negativePrompt };
}

/**
 * Poll a Kling image generation task until it completes or times out.
 * Returns the first result URL on success.
 */
async function pollUntilDone(
  taskId: string,
  maxWaitMs = 90_000,
  intervalMs = 3_000,
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const status = await klingGetImageGenTask(taskId);
    if (status.state === 'succeeded') {
      const url = status.resultUrls[0];
      if (!url) throw new Error('Kling image generation succeeded but returned no URL');
      return url;
    }
    if (status.state === 'failed') {
      throw new Error(`Kling image generation failed: ${status.errorMessage ?? status.rawStatus}`);
    }
    // still processing — continue polling
  }
  throw new Error(`Kling image generation timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Enhance or generate a product image using Kling Kolors.
 * Blocks until the image is ready (server-side polling).
 * Suitable for use in a tRPC mutation with a reasonable timeout.
 */
export async function enhanceProductImage(
  input: KlingEnhanceProductInput,
): Promise<KlingEnhanceProductResult> {
  const { prompt, negativePrompt } = buildProductPrompt(input);
  const wasEnhancement = Boolean(input.existingImageUrl);

  const { taskId } = await klingSubmitImageGeneration({
    prompt,
    negativePrompt,
    // If existing image is provided, use it as reference for image-to-image
    referenceImage: input.existingImageUrl,
    count: 1,
    aspectRatio: input.aspectRatio ?? '1:1',
    resolution: '1k',
  });

  const imageUrl = await pollUntilDone(taskId);

  return { imageUrl, prompt, wasEnhancement };
}
