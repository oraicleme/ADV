/**
 * Brand Agent - Handles brand consistency and guidelines
 * Responsible for ensuring ads align with brand identity and guidelines
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export class BrandAgent extends BaseAgent {
  constructor(apiKey: string, apiUrl: string) {
    super('brand-agent', 'meta-llama/Llama-3.3-70B-Instruct', apiKey, apiUrl);
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are a brand strategist and compliance officer.
Your job is to ensure ads align with brand guidelines and maintain brand consistency.

Guidelines:
- Verify color palette compliance
- Check typography consistency
- Validate tone of voice
- Ensure messaging alignment
- Confirm visual style consistency
- Flag any brand guideline violations

Respond with JSON containing brand compliance feedback.`;

      const userPrompt = `User request: "${context.userMessage}"

Brand guidelines:
- Brand name: [brand name]
- Primary colors: [colors]
- Typography: [fonts]
- Tone: [tone of voice]
- Values: [brand values]

Current ad:
- Colors used: [colors]
- Fonts used: [fonts]
- Messaging: [messaging]
- Visual style: [style]

Check compliance and provide feedback.`;

      const response = await this.callLLM(userPrompt, systemPrompt, 800);
      const parsed = this.parseJSON<{
        compliant?: boolean;
        violations?: string[];
        recommendations?: string[];
        colorFeedback?: string;
        typographyFeedback?: string;
        toneFeedback?: string;
        messagingFeedback?: string;
      }>(response);

      const suggestions: Suggestion[] = [];

      // Parse brand feedback from LLM response
      if (parsed?.violations && Array.isArray(parsed.violations) && parsed.violations.length > 0) {
        suggestions.push(
          this.createSuggestion(
            'brand-violations',
            'brand',
            'Brand Guideline Violations',
            parsed.violations.join('; '),
            'high',
            1,
            [
              {
                id: 'action-violations',
                type: 'review_violations',
                params: { violations: parsed.violations },
              },
            ],
            'Issues found that violate brand guidelines',
          ),
        );
      }

      if (parsed?.colorFeedback) {
        suggestions.push(
          this.createSuggestion(
            'brand-colors',
            'brand',
            'Color Palette Feedback',
            parsed.colorFeedback,
            parsed.compliant ? 'low' : 'medium',
            2,
            [
              {
                id: 'action-colors',
                type: 'review_colors',
                params: { feedback: parsed.colorFeedback },
              },
            ],
            'Review color choices for brand consistency',
          ),
        );
      }

      if (parsed?.typographyFeedback) {
        suggestions.push(
          this.createSuggestion(
            'brand-typography',
            'brand',
            'Typography Feedback',
            parsed.typographyFeedback,
            parsed.compliant ? 'low' : 'medium',
            3,
            [
              {
                id: 'action-typography',
                type: 'review_typography',
                params: { feedback: parsed.typographyFeedback },
              },
            ],
            'Review font choices for brand consistency',
          ),
        );
      }

      if (parsed?.toneFeedback) {
        suggestions.push(
          this.createSuggestion(
            'brand-tone',
            'brand',
            'Tone of Voice Feedback',
            parsed.toneFeedback,
            'medium',
            4,
            [
              {
                id: 'action-tone',
                type: 'review_tone',
                params: { feedback: parsed.toneFeedback },
              },
            ],
            'Review messaging tone for brand alignment',
          ),
        );
      }

      if (parsed?.messagingFeedback) {
        suggestions.push(
          this.createSuggestion(
            'brand-messaging',
            'brand',
            'Messaging Alignment',
            parsed.messagingFeedback,
            'medium',
            5,
            [
              {
                id: 'action-messaging',
                type: 'review_messaging',
                params: { feedback: parsed.messagingFeedback },
              },
            ],
            'Review messaging alignment with brand values',
          ),
        );
      }

      if (parsed?.recommendations && Array.isArray(parsed.recommendations)) {
        suggestions.push(
          this.createSuggestion(
            'brand-recommendations',
            'brand',
            'Brand Recommendations',
            parsed.recommendations.join('; '),
            'medium',
            6,
            [
              {
                id: 'action-recommendations',
                type: 'apply_recommendations',
                params: { recommendations: parsed.recommendations },
              },
            ],
            'Recommendations to improve brand consistency',
          ),
        );
      }

      return {
        agent: this.name,
        status: suggestions.length > 0 ? 'success' : 'partial',
        suggestions,
        confidence: 0.84,
        executionTime: Date.now() - startTime,
        metadata: {
          compliant: parsed?.compliant ?? true,
        },
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
