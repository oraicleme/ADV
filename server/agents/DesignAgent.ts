/**
 * Design Agent - Handles visual design decisions
 * Responsible for layout, colors, typography, spacing, and visual hierarchy
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export class DesignAgent extends BaseAgent {
  constructor(apiKey: string, apiUrl: string) {
    super('design-agent', 'meta-llama/Llama-3.3-70B-Instruct', apiKey, apiUrl);
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are an expert visual designer for retail advertisements.
Your job is to optimize visual design elements: layout, colors, typography, spacing, and visual hierarchy.

Guidelines:
- Layouts should guide the eye to the product and CTA
- Colors should create contrast and emotional impact
- Typography should be readable and establish hierarchy
- Spacing should create breathing room and focus
- Visual hierarchy should prioritize product → headline → CTA

Respond with JSON containing design suggestions.`;

      const userPrompt = `User request: "${context.userMessage}"

Current ad design:
- Layout: [current layout description]
- Colors: [current color scheme]
- Typography: [current font sizes and weights]
- Spacing: [current padding/margins]

Provide 3 specific design improvements with reasoning.`;

      const response = await this.callLLM(userPrompt, systemPrompt, 800);
      const parsed = this.parseJSON<{ suggestions?: Array<{ title?: string; description?: string; impact?: 'high' | 'medium' | 'low'; element?: string; change?: string; reasoning?: string }> }>(response);

      const suggestions: Suggestion[] = [];

      // Parse design suggestions from LLM response
      if (parsed?.suggestions && Array.isArray(parsed.suggestions)) {
        parsed.suggestions.forEach((suggestion: any, index: number) => {
          suggestions.push(
            this.createSuggestion(
              `design-${index + 1}`,
              'design',
              suggestion.title || `Design Improvement ${index + 1}`,
              suggestion.description || '',
              suggestion.impact || 'medium',
              index + 1,
              [
                {
                  id: `design-action-${index + 1}`,
                  type: 'update_design',
                  params: {
                    element: suggestion.element,
                    change: suggestion.change,
                  },
                },
              ],
              suggestion.reasoning || '',
            ),
          );
        });
      }

      return {
        agent: this.name,
        status: suggestions.length > 0 ? 'success' : 'partial',
        suggestions,
        confidence: 0.85,
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
