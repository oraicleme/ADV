/**
 * Product Agent - Handles product data and image analysis
 * Responsible for extracting product features, benefits, and visual insights
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export class ProductAgent extends BaseAgent {
  constructor(apiKey: string, apiUrl: string) {
    super('product-agent', 'Qwen/Qwen2.5-VL-32B-Instruct', apiKey, apiUrl);
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are a product analyst for retail advertisements.
Your job is to analyze product data and images to extract key features, benefits, and visual insights.

Guidelines:
- Identify key product features and specifications
- Highlight unique selling points
- Extract visual characteristics from images
- Suggest product positioning and messaging
- Identify target customer segments

Respond with JSON containing product insights.`;

      const userPrompt = `User request: "${context.userMessage}"

Product data available:
- Name: [product name]
- Category: [category]
- Price: [price]
- Code: [product code]
- Images: [image count]

Analyze the product and provide insights for ad creation.`;

      const response = await this.callLLM(userPrompt, systemPrompt, 800);
      const parsed = this.parseJSON<{
        features?: string[];
        benefits?: string[];
        positioning?: string;
        targetSegment?: string;
        visualInsights?: string;
      }>(response);

      const suggestions: Suggestion[] = [];

      // Parse product insights from LLM response
      if (parsed?.features && Array.isArray(parsed.features)) {
        suggestions.push(
          this.createSuggestion(
            'product-features',
            'product',
            'Key Product Features',
            parsed.features.join(', '),
            'high',
            1,
            [
              {
                id: 'action-features',
                type: 'highlight_features',
                params: { features: parsed.features },
              },
            ],
            'Identified key features to emphasize in the ad',
          ),
        );
      }

      if (parsed?.benefits && Array.isArray(parsed.benefits)) {
        suggestions.push(
          this.createSuggestion(
            'product-benefits',
            'product',
            'Customer Benefits',
            parsed.benefits.join(', '),
            'high',
            2,
            [
              {
                id: 'action-benefits',
                type: 'highlight_benefits',
                params: { benefits: parsed.benefits },
              },
            ],
            'Identified customer benefits to communicate',
          ),
        );
      }

      if (parsed?.positioning) {
        suggestions.push(
          this.createSuggestion(
            'product-positioning',
            'product',
            'Product Positioning',
            parsed.positioning,
            'medium',
            3,
            [
              {
                id: 'action-positioning',
                type: 'set_positioning',
                params: { positioning: parsed.positioning },
              },
            ],
            'Recommended product positioning for the market',
          ),
        );
      }

      if (parsed?.targetSegment) {
        suggestions.push(
          this.createSuggestion(
            'product-segment',
            'product',
            'Target Customer Segment',
            parsed.targetSegment,
            'medium',
            4,
            [
              {
                id: 'action-segment',
                type: 'set_target_segment',
                params: { segment: parsed.targetSegment },
              },
            ],
            'Identified primary target customer segment',
          ),
        );
      }

      if (parsed?.visualInsights) {
        suggestions.push(
          this.createSuggestion(
            'product-visual',
            'product',
            'Visual Insights',
            parsed.visualInsights,
            'medium',
            5,
            [
              {
                id: 'action-visual',
                type: 'apply_visual_insights',
                params: { insights: parsed.visualInsights },
              },
            ],
            'Visual characteristics to highlight in design',
          ),
        );
      }

      return {
        agent: this.name,
        status: suggestions.length > 0 ? 'success' : 'partial',
        suggestions,
        confidence: 0.82,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log('error', 'Process failed', error);
      return {
        agent: this.name,
        status: 'error',
        suggestions: [],
        confidence: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
