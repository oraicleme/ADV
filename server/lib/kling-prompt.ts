/**
 * Grounded prompt for Kling video from canvas context (pure, no I/O).
 * STORY-180 Phase C — bounded copy; no raw system prompts.
 */
export type KlingCanvasPromptInput = {
  products: Array<{ name: string; category?: string; brand?: string }>;
  headline: string;
  cta?: string;
  formatLabel?: string;
  locale?: string;
  /** Optional product thumbnail URLs for documentation in metadata only (caller validates allowlist). */
  imageUrls?: string[];
};

export type KlingCanvasPromptResult = {
  prompt: string;
  negativePrompt: string;
  metadata: {
    productCount: number;
    productNamesSample: string[];
    hasReferenceImages: boolean;
    locale: string;
  };
};

const MAX_NAMES_IN_PROMPT = 8;
const MAX_PROMPT_CHARS = 2400;

export function buildKlingPromptFromCanvas(input: KlingCanvasPromptInput): KlingCanvasPromptResult {
  const locale = (input.locale ?? 'en').slice(0, 32);
  const names = input.products.map((p) => p.name.trim()).filter(Boolean);
  const sample = names.slice(0, MAX_NAMES_IN_PROMPT);
  const format = (input.formatLabel ?? 'square').trim() || 'square';
  const cta = (input.cta ?? '').trim().slice(0, 120);
  const headline = input.headline.trim().slice(0, 200);

  const categoryHints = input.products
    .map((p) => p.category?.trim())
    .filter((c): c is string => Boolean(c));
  const uniqueCat = [...new Set(categoryHints)].slice(0, 5);

  const parts: string[] = [
    'Professional retail advertisement video, clean lighting, premium social ad aesthetic.',
    `Format: ${format}.`,
  ];
  if (headline) parts.push(`Headline on screen: "${headline}".`);
  if (cta) parts.push(`Call to action: "${cta}".`);
  if (sample.length) {
    parts.push(`Featured products (ground truth): ${sample.join(', ')}.`);
  }
  if (uniqueCat.length) {
    parts.push(`Categories: ${uniqueCat.join(', ')}.`);
  }
  parts.push(
    'Show products clearly, brand-safe, no misleading claims, no extra text beyond the headline/CTA style described.',
  );

  let prompt = parts.join(' ');
  if (prompt.length > MAX_PROMPT_CHARS) {
    prompt = `${prompt.slice(0, MAX_PROMPT_CHARS - 3)}...`;
  }

  const negativePrompt =
    'low quality, blurry, watermark from unknown sources, distorted text, illegible typography, extra logos, offensive content, misleading pricing';

  return {
    prompt,
    negativePrompt,
    metadata: {
      productCount: names.length,
      productNamesSample: sample,
      hasReferenceImages: Boolean(input.imageUrls?.length),
      locale,
    },
  };
}
