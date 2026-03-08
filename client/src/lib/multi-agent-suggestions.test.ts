import { describe, it, expect } from 'vitest';
import {
  requestMultiAgentSuggestions,
  type MultiAgentSuggestion,
  type MultiAgentSuggestionResult,
} from './multi-agent-suggestions';
import type { AdCanvasState } from './ad-canvas-ai';

describe('Multi-Agent Suggestions', () => {
  const mockCanvasState: AdCanvasState = {
    headline: 'Test Headline',
    titleFontSize: 44,
    emojiOrIcon: '',
    badgeText: '',
    ctaButtons: ['Shop Now'],
    disclaimerText: '',
    elementOrder: ['headline', 'products', 'cta'],
    layout: 'multi-grid',
    style: {
      backgroundColor: '#1a1a1a',
      accentColor: '#ff6b00',
      fontFamily: 'sans',
    },
    logoHeight: 32,
    logoAlignment: 'center',
    logoCompanion: 'none',
    productBlockOptions: {
      columns: 3,
      imageHeight: 150,
      showFields: {
        name: true,
        price: true,
        description: false,
      },
    },
    productCount: 6,
    format: { id: 'instagram-story', width: 1080, height: 1920 },
    dataQuality: {
      hasAllCapsNames: false,
      hasMissingPrices: false,
      hasOriginalPrices: true,
      hasDiscounts: true,
      avgDescriptionLength: 50,
      imageAnalysis: undefined,
    },
    catalogSummary: undefined,
  };

  describe('requestMultiAgentSuggestions', () => {
    it('returns suggestions for design-focused requests', async () => {
      const result = await requestMultiAgentSuggestions('Make the headline larger', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan.agentsUsed).toBeDefined();
      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('returns suggestions for copy-focused requests', async () => {
      const result = await requestMultiAgentSuggestions('Improve the headline text', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed).toContain('copy-agent');
    });

    it('returns suggestions for product-focused requests', async () => {
      const result = await requestMultiAgentSuggestions('Show all products in the grid', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed.length).toBeGreaterThan(0);
    });

    it('returns suggestions for optimization-focused requests', async () => {
      const result = await requestMultiAgentSuggestions('Increase conversion rate', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed).toContain('optimization-agent');
    });

    it('handles complex requests with multiple agents', async () => {
      const result = await requestMultiAgentSuggestions(
        'Make the ad more professional with better colors and text',
        mockCanvasState,
      );

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed.length).toBeGreaterThanOrEqual(1);
    });

    it('returns estimated impact based on suggestions', async () => {
      const result = await requestMultiAgentSuggestions('Optimize the ad', mockCanvasState);

      expect(result.estimatedImpact).toBeDefined();
      expect(['High', 'Medium', 'Low', 'Error']).toContain(result.estimatedImpact.split('(')[0].trim());
    });

    it('prioritizes suggestions by impact and priority', async () => {
      const result = await requestMultiAgentSuggestions('Improve everything', mockCanvasState);

      if (result.suggestions.length > 1) {
        // Check that high-impact suggestions come before low-impact
        let lastImpactValue = 3; // high = 3
        for (const suggestion of result.suggestions) {
          const impactValue = suggestion.impact === 'high' ? 3 : suggestion.impact === 'medium' ? 2 : 1;
          expect(impactValue).toBeLessThanOrEqual(lastImpactValue);
          lastImpactValue = impactValue;
        }
      }
    });

    it('includes reasoning for each suggestion', async () => {
      const result = await requestMultiAgentSuggestions('Improve the design', mockCanvasState);

      for (const suggestion of result.suggestions) {
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('includes confidence scores for suggestions', async () => {
      const result = await requestMultiAgentSuggestions('Suggest improvements', mockCanvasState);

      for (const suggestion of result.suggestions) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('handles empty user messages gracefully', async () => {
      const result = await requestMultiAgentSuggestions('', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('handles errors gracefully', async () => {
      const result = await requestMultiAgentSuggestions('Test error handling', mockCanvasState);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      // Should not throw, should return empty or error state
    });
  });

  describe('Suggestion structure', () => {
    it('suggestions have required fields', async () => {
      const result = await requestMultiAgentSuggestions('Test suggestion structure', mockCanvasState);

      for (const suggestion of result.suggestions) {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.agent).toBeDefined();
        expect(suggestion.title).toBeDefined();
        expect(suggestion.description).toBeDefined();
        expect(suggestion.impact).toMatch(/^(high|medium|low)$/);
        expect(suggestion.priority).toBeGreaterThanOrEqual(0);
        expect(suggestion.actions).toBeDefined();
        expect(Array.isArray(suggestion.actions)).toBe(true);
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.executionTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('suggestions have valid action types', async () => {
      const result = await requestMultiAgentSuggestions('Test actions', mockCanvasState);

      const validActionTypes = [
        'block_patch',
        'layout_change',
        'format_change',
        'style_change',
        'product_action',
        'element_reorder',
        'catalog_filter',
      ];

      for (const suggestion of result.suggestions) {
        for (const action of suggestion.actions) {
          expect(validActionTypes).toContain(action.type);
          expect(action.payload).toBeDefined();
        }
      }
    });
  });

  describe('Agent routing', () => {
    it('routes design keywords to design agent', async () => {
      const result = await requestMultiAgentSuggestions('Change the color and layout', mockCanvasState);

      expect(result.executionPlan.agentsUsed).toContain('design-agent');
    });

    it('routes copy keywords to copy agent', async () => {
      const result = await requestMultiAgentSuggestions('Rewrite the headline', mockCanvasState);

      expect(result.executionPlan.agentsUsed).toContain('copy-agent');
    });

    it('routes product keywords to product agent', async () => {
      const result = await requestMultiAgentSuggestions('Show product features', mockCanvasState);

      expect(result.executionPlan.agentsUsed).toContain('product-agent');
    });

    it('routes brand keywords to brand agent', async () => {
      const result = await requestMultiAgentSuggestions('Check brand compliance', mockCanvasState);

      expect(result.executionPlan.agentsUsed).toContain('brand-agent');
    });

    it('routes optimization keywords to optimization agent', async () => {
      const result = await requestMultiAgentSuggestions('Optimize for conversions', mockCanvasState);

      expect(result.executionPlan.agentsUsed).toContain('optimization-agent');
    });

    it('executes agents in optimal order', async () => {
      const result = await requestMultiAgentSuggestions('Improve everything', mockCanvasState);

      const order = result.executionPlan.order;
      // Product agent should come before design/copy if present
      if (order.includes('product-agent')) {
        const productIdx = order.indexOf('product-agent');
        const designIdx = order.indexOf('design-agent');
        const copyIdx = order.indexOf('copy-agent');
        if (designIdx >= 0) expect(productIdx).toBeLessThanOrEqual(designIdx);
        if (copyIdx >= 0) expect(productIdx).toBeLessThanOrEqual(copyIdx);
      }
    });
  });
});
