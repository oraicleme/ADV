/**
 * ProductStructureExtractor
 * Intelligently parses unstructured product data using LLM
 * Extracts: brand, model, variant, type, specifications
 * Works with any product naming convention
 */

import { invokeLLM } from '../_core/llm';

export interface ExtractedProductStructure {
  originalName: string;
  brand?: string; // Apple, Samsung, Nike, etc.
  model?: string; // iPhone 15 Pro, Galaxy S24, etc.
  variant?: string; // Color, storage, size, etc.
  productType: 'phone' | 'accessory' | 'case' | 'charger' | 'screen_protector' | 'other';
  category: string; // Original category from data
  specs: Record<string, string>; // Extracted specifications
  tags: string[]; // Searchable tags
  confidence: number; // 0-1 confidence score
  reasoning: string; // Why we classified it this way
}

export class ProductStructureExtractor {
  /**
   * Parse a single product and extract its structure
   */
  static async extractProductStructure(
    productName: string,
    category: string,
    code?: string,
    additionalContext?: string
  ): Promise<ExtractedProductStructure> {
    const prompt = `You are a product data expert. Analyze this product and extract its structure.

Product Name: "${productName}"
Category: "${category}"
${code ? `Code: "${code}"` : ''}
${additionalContext ? `Additional Context: "${additionalContext}"` : ''}

Extract and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "brand": "Brand name or null",
  "model": "Model name or null",
  "variant": "Variant/color/size or null",
  "productType": "phone|accessory|case|charger|screen_protector|other",
  "specs": {"key": "value"},
  "tags": ["tag1", "tag2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification"
}

Rules:
- If it's a case/cover/accessory for a phone, set productType to "case" or "accessory"
- Extract brand (Apple, Samsung, etc.) if identifiable
- Extract model (iPhone 15 Pro, Galaxy S24) if identifiable
- Extract variant (color, storage, size) if present
- Create searchable tags (e.g., "iPhone", "15", "Pro", "case", "black")
- Confidence should reflect how certain you are about the classification
- Be strict about product type - only use the provided options`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content:
              'You are a product data expert that extracts structured information from unstructured product names. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('No response from LLM');
      }

      // Handle both string and array content types
      let content: string;
      if (typeof messageContent === 'string') {
        content = messageContent;
      } else if (Array.isArray(messageContent)) {
        const textItem = messageContent.find((item: any) => item.type === 'text');
        if (!textItem || !('text' in textItem)) {
          throw new Error('No text content in response');
        }
        content = (textItem as any).text;
      } else {
        throw new Error('Unexpected message format');
      }

      // Parse JSON response
      const extracted = JSON.parse(content);

      return {
        originalName: productName,
        brand: extracted.brand || undefined,
        model: extracted.model || undefined,
        variant: extracted.variant || undefined,
        productType: extracted.productType || 'other',
        category,
        specs: extracted.specs || {},
        tags: extracted.tags || [],
        confidence: extracted.confidence || 0.5,
        reasoning: extracted.reasoning || '',
      };
    } catch (error) {
      console.error('Error extracting product structure:', error);
      // Return a basic structure if extraction fails
      return {
        originalName: productName,
        productType: 'other',
        category,
        specs: {},
        tags: [productName.toLowerCase(), category.toLowerCase()],
        confidence: 0.1,
        reasoning: 'Extraction failed, using fallback structure',
      };
    }
  }

  /**
   * Batch extract structure for multiple products
   */
  static async extractBatch(
    products: Array<{
      name: string;
      category: string;
      code?: string;
    }>
  ): Promise<ExtractedProductStructure[]> {
    // Process in batches of 5 to avoid rate limiting
    const results: ExtractedProductStructure[] = [];
    const batchSize = 5;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((p) => this.extractProductStructure(p.name, p.category, p.code))
      );
      results.push(...batchResults);

      // Add small delay between batches
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Detect if a product is an accessory for another product
   */
  static detectAccessoryRelationship(
    product: ExtractedProductStructure,
    potentialMainProduct: ExtractedProductStructure
  ): boolean {
    // If product is marked as accessory/case
    if (['accessory', 'case', 'charger', 'screen_protector'].includes(product.productType)) {
      // Check if it mentions the main product's model
      if (potentialMainProduct.model) {
        const modelKeywords = potentialMainProduct.model.toLowerCase().split(' ');
        const productNameLower = product.originalName.toLowerCase();

        return modelKeywords.some((keyword) => productNameLower.includes(keyword));
      }
    }

    return false;
  }

  /**
   * Group products by model
   */
  static groupProductsByModel(
    products: ExtractedProductStructure[]
  ): Map<string, ExtractedProductStructure[]> {
    const groups = new Map<string, ExtractedProductStructure[]>();

    for (const product of products) {
      const key = product.model || product.brand || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(product);
    }

    return groups;
  }
}

export default ProductStructureExtractor;
