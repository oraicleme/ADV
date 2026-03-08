import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';
import type { AdCanvasState } from '../../client/src/lib/ad-canvas-ai';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Agents Router - Backend API Integration', () => {
  const mockCanvasState: AdCanvasState = {
    headline: 'Premium Smartphone',
    titleFontSize: 44,
    emojiOrIcon: '📱',
    badgeText: 'Sale',
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

  describe('getSuggestions mutation', () => {
    it('returns suggestions for design-focused requests', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Make the design more professional',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan.agentsUsed).toBeDefined();
      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('returns suggestions for copy-focused requests', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Improve the headline text',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed).toContain('copy-agent');
    });

    it('returns suggestions for product-focused requests', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Show product features better',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed.length).toBeGreaterThan(0);
    });

    it('returns suggestions for optimization-focused requests', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Increase conversion rate',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed).toContain('optimization-agent');
    });

    it('handles complex multi-agent requests', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Make the ad more professional with better colors and text',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.executionPlan.agentsUsed.length).toBeGreaterThanOrEqual(1);
    });

    it('returns estimated impact based on suggestions', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Optimize everything',
        canvasState: mockCanvasState,
      });

      expect(result.estimatedImpact).toBeDefined();
      expect(
        ['High', 'Medium', 'Low', 'Error'].some((impact) =>
          result.estimatedImpact.includes(impact)
        )
      ).toBe(true);
    });

    it('prioritizes suggestions by impact', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Improve the ad',
        canvasState: mockCanvasState,
      });

      if (result.suggestions.length > 1) {
        // High-impact suggestions should come before low-impact
        let lastImpactValue = 3; // high = 3
        for (const suggestion of result.suggestions) {
          const impactValue =
            suggestion.impact === 'high' ? 3 : suggestion.impact === 'medium' ? 2 : 1;
          expect(impactValue).toBeLessThanOrEqual(lastImpactValue);
          lastImpactValue = impactValue;
        }
      }
    });

    it('includes required fields in suggestions', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Test suggestion structure',
        canvasState: mockCanvasState,
      });

      for (const suggestion of result.suggestions) {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.agent).toBeDefined();
        expect(suggestion.title).toBeDefined();
        expect(suggestion.description).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(suggestion.impact);
        expect(suggestion.priority).toBeGreaterThanOrEqual(0);
        expect(suggestion.actions).toBeDefined();
        expect(Array.isArray(suggestion.actions)).toBe(true);
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.executionTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getAgentSuggestion mutation', () => {
    it('returns suggestion from design agent', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getAgentSuggestion({
        agent: 'design-agent',
        userMessage: 'Improve the design',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('design-agent');
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('returns suggestion from copy agent', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getAgentSuggestion({
        agent: 'copy-agent',
        userMessage: 'Improve the copy',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('copy-agent');
      expect(result.title).toBeDefined();
    });

    it('returns suggestion from product agent', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getAgentSuggestion({
        agent: 'product-agent',
        userMessage: 'Analyze products',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('product-agent');
    });

    it('returns suggestion from brand agent', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getAgentSuggestion({
        agent: 'brand-agent',
        userMessage: 'Check brand compliance',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('brand-agent');
    });

    it('returns suggestion from optimization agent', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getAgentSuggestion({
        agent: 'optimization-agent',
        userMessage: 'Optimize for conversions',
        canvasState: mockCanvasState,
      });

      expect(result).toBeDefined();
      expect(result.agent).toBe('optimization-agent');
    });
  });

  describe('Agent routing', () => {
    it('routes design keywords correctly', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Change the color and layout',
        canvasState: mockCanvasState,
      });

      expect(result.executionPlan.agentsUsed).toContain('design-agent');
    });

    it('routes copy keywords correctly', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Rewrite the headline',
        canvasState: mockCanvasState,
      });

      expect(result.executionPlan.agentsUsed).toContain('copy-agent');
    });

    it('executes agents in optimal order', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.agents.getSuggestions({
        userMessage: 'Improve everything',
        canvasState: mockCanvasState,
      });

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
