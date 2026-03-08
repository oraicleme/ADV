/**
 * Copy Agent - Handles text content optimization
 * Responsible for headlines, CTAs, badges, disclaimers, and product descriptions
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export class CopyAgent extends BaseAgent {
  constructor(apiKey: string, apiUrl: string) {
    super('copy-agent', 'mistralai/Mistral-Nemo-Instruct-2407', apiKey, apiUrl);
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are a high-converting copywriter for retail ads.
Your job is to optimize headlines, badges, CTA buttons, and disclaimers.

Guidelines:
- Headlines should be compelling and action-oriented
- Badges should create urgency (LIMITED TIME, EXCLUSIVE, etc.)
- CTAs should be clear and benefit-focused
- Disclaimers should be concise but complete
- All copy should drive conversions

Respond with JSON containing copy suggestions.`;

      const userPrompt = `User request: "${context.userMessage}"

Current ad copy:
- Headline: [current headline]
- Badge: [current badge]
- CTA: [current CTA]
- Disclaimer: [current disclaimer]

Provide 3 variations for each element with reasoning.`;

      const response = await this.callLLM(userPrompt, systemPrompt, 800);
      const parsed = this.parseJSON<{
        headline?: { value?: string; description?: string; reasoning?: string };
        badge?: { value?: string; description?: string; reasoning?: string };
        cta?: { value?: string; description?: string; reasoning?: string };
        disclaimer?: { value?: string; description?: string; reasoning?: string };
      }>(response);

      const suggestions: Suggestion[] = [];

      // Parse copy suggestions from LLM response
      if (parsed?.headline) {
        suggestions.push(
          this.createSuggestion(
            'copy-headline',
            'copy',
            'Headline Optimization',
            parsed.headline.description || '',
            'high',
            1,
            [
              {
                id: 'action-headline',
                type: 'update_headline',
                params: { text: parsed.headline.value },
              },
            ],
            parsed.headline.reasoning || '',
          ),
        );
      }

      if (parsed?.badge) {
        suggestions.push(
          this.createSuggestion(
            'copy-badge',
            'copy',
            'Badge Optimization',
            parsed.badge.description || '',
            'medium',
            2,
            [
              {
                id: 'action-badge',
                type: 'update_badge',
                params: { text: parsed.badge.value },
              },
            ],
            parsed.badge.reasoning || '',
          ),
        );
      }

      if (parsed?.cta) {
        suggestions.push(
          this.createSuggestion(
            'copy-cta',
            'copy',
            'CTA Optimization',
            parsed.cta.description || '',
            'high',
            3,
            [
              {
                id: 'action-cta',
                type: 'update_cta',
                params: { text: parsed.cta.value },
              },
            ],
            parsed.cta.reasoning || '',
          ),
        );
      }

      if (parsed?.disclaimer) {
        suggestions.push(
          this.createSuggestion(
            'copy-disclaimer',
            'copy',
            'Disclaimer Optimization',
            parsed.disclaimer.description || '',
            'low',
            4,
            [
              {
                id: 'action-disclaimer',
                type: 'update_disclaimer',
                params: { text: parsed.disclaimer.value },
              },
            ],
            parsed.disclaimer.reasoning || '',
          ),
        );
      }

      return {
        agent: this.name,
        status: suggestions.length > 0 ? 'success' : 'partial',
        suggestions,
        confidence: 0.88,
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
