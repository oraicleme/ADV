/**
 * Optimization Agent - Handles conversion and performance optimization
 * Responsible for analyzing and improving ad effectiveness metrics
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export class OptimizationAgent extends BaseAgent {
  constructor(apiKey: string, apiUrl: string) {
    super('optimization-agent', 'meta-llama/Llama-3.3-70B-Instruct', apiKey, apiUrl);
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are a conversion rate optimization (CRO) specialist.
Your job is to analyze ads and provide recommendations to improve conversion rates and performance.

Guidelines:
- Analyze visual hierarchy and attention flow
- Evaluate CTA clarity and prominence
- Assess urgency and scarcity messaging
- Review social proof and credibility signals
- Identify friction points in the conversion path
- Suggest A/B testing opportunities

Respond with JSON containing optimization recommendations.`;

      const userPrompt = `User request: "${context.userMessage}"

Current ad analysis:
- Format: [ad format]
- Layout: [layout type]
- CTA: [current CTA]
- Urgency signals: [current signals]
- Social proof: [current proof]

Analyze the ad and provide optimization recommendations.`;

      const response = await this.callLLM(userPrompt, systemPrompt, 800);
      const parsed = this.parseJSON<{
        ctaOptimization?: string;
        urgencyRecommendations?: string[];
        socialProofSuggestions?: string[];
        visualHierarchyFeedback?: string;
        frictionPoints?: string[];
        abTestIdeas?: string[];
        estimatedLift?: string;
      }>(response);

      const suggestions: Suggestion[] = [];

      // Parse optimization suggestions from LLM response
      if (parsed?.ctaOptimization) {
        suggestions.push(
          this.createSuggestion(
            'optim-cta',
            'optimization',
            'CTA Optimization',
            parsed.ctaOptimization,
            'high',
            1,
            [
              {
                id: 'action-cta-optim',
                type: 'optimize_cta',
                params: { feedback: parsed.ctaOptimization },
              },
            ],
            'Improve CTA clarity and conversion potential',
          ),
        );
      }

      if (parsed?.urgencyRecommendations && Array.isArray(parsed.urgencyRecommendations)) {
        suggestions.push(
          this.createSuggestion(
            'optim-urgency',
            'optimization',
            'Urgency & Scarcity',
            parsed.urgencyRecommendations.join('; '),
            'high',
            2,
            [
              {
                id: 'action-urgency',
                type: 'add_urgency',
                params: { recommendations: parsed.urgencyRecommendations },
              },
            ],
            'Add urgency signals to drive immediate action',
          ),
        );
      }

      if (parsed?.socialProofSuggestions && Array.isArray(parsed.socialProofSuggestions)) {
        suggestions.push(
          this.createSuggestion(
            'optim-social-proof',
            'optimization',
            'Social Proof & Credibility',
            parsed.socialProofSuggestions.join('; '),
            'medium',
            3,
            [
              {
                id: 'action-social-proof',
                type: 'add_social_proof',
                params: { suggestions: parsed.socialProofSuggestions },
              },
            ],
            'Build trust with social proof and credibility signals',
          ),
        );
      }

      if (parsed?.visualHierarchyFeedback) {
        suggestions.push(
          this.createSuggestion(
            'optim-hierarchy',
            'optimization',
            'Visual Hierarchy',
            parsed.visualHierarchyFeedback,
            'medium',
            4,
            [
              {
                id: 'action-hierarchy',
                type: 'improve_hierarchy',
                params: { feedback: parsed.visualHierarchyFeedback },
              },
            ],
            'Improve visual hierarchy to guide attention',
          ),
        );
      }

      if (parsed?.frictionPoints && Array.isArray(parsed.frictionPoints)) {
        suggestions.push(
          this.createSuggestion(
            'optim-friction',
            'optimization',
            'Friction Point Removal',
            parsed.frictionPoints.join('; '),
            'medium',
            5,
            [
              {
                id: 'action-friction',
                type: 'remove_friction',
                params: { frictionPoints: parsed.frictionPoints },
              },
            ],
            'Eliminate barriers to conversion',
          ),
        );
      }

      if (parsed?.abTestIdeas && Array.isArray(parsed.abTestIdeas)) {
        suggestions.push(
          this.createSuggestion(
            'optim-ab-test',
            'optimization',
            'A/B Testing Opportunities',
            parsed.abTestIdeas.join('; '),
            'low',
            6,
            [
              {
                id: 'action-ab-test',
                type: 'create_ab_tests',
                params: { ideas: parsed.abTestIdeas },
              },
            ],
            'Test variations to find optimal performance',
          ),
        );
      }

      return {
        agent: this.name,
        status: suggestions.length > 0 ? 'success' : 'partial',
        suggestions,
        confidence: 0.86,
        executionTime: Date.now() - startTime,
        metadata: {
          estimatedLift: parsed?.estimatedLift ?? 'Unknown',
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
