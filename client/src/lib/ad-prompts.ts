import type { ProductItem } from './ad-constants';
import type { LayoutId } from './ad-layouts/types';

/**
 * Build prompt for ad copy (headline, subheadline, CTA, product descriptions).
 * Use with a reasoning model (e.g. gpt-oss-120b).
 */
export function buildAdCopyPrompt(
  products: ProductItem[],
  layout: LayoutId,
  userPrompt: string
): string {
  const productList = products
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (code: ${p.code ?? 'N/A'}) — price: ${p.price ?? 'N/A'} ${p.currency ?? 'EUR'}`
    )
    .join('\n');

  return `You are an expert retail ad copywriter. Generate compelling ad content for a promotional creative.

Products:
${productList}

Layout: ${layout}
User instruction: ${userPrompt || 'Create a professional promotional ad'}

Return JSON only, no markdown:
{
  "headline": "Short, punchy headline (max 8 words)",
  "subheadline": "Supporting text (max 15 words)",
  "cta": "Call-to-action text (2-4 words)",
  "product_descriptions": ["short description for each product in order (max 10 words each)"]
}

Rules:
- Prices MUST be EXACTLY as provided — never change, round, or hallucinate prices
- Use the language that matches the product names (if Serbian/Croatian/Bosnian, write in that language)
- Keep it punchy, professional, retail-focused
- product_descriptions array length must match the number of products`;
}

export interface AdCopyResult {
  headline?: string;
  subheadline?: string;
  cta?: string;
  product_descriptions?: string[];
}

/**
 * Parse AI response into AdCopyResult. Tolerates markdown code fence.
 */
export function parseAdCopyResponse(content: string): AdCopyResult {
  const trimmed = content.trim();
  let jsonStr = trimmed;
  const codeMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();
  try {
    return JSON.parse(jsonStr) as AdCopyResult;
  } catch {
    return {};
  }
}

/**
 * Build prompt for vision model: describe product image for ad context.
 * Use with a vision model (e.g. Llama-4-Maverick or Qwen2.5-VL).
 */
export function buildVisionPromptForProduct(productName: string, productIndex: number): string {
  return `This image is product #${productIndex + 1} for a retail ad: "${productName}". In one short sentence (max 12 words), describe what the product looks like or the key visual (e.g. "Red sneakers on white background"). No price, no headline — just visual description for the designer.`;
}
