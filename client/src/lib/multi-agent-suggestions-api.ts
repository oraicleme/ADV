/**
 * Multi-Agent Suggestions API Client
 * Calls backend tRPC procedures for real LLM-powered suggestions
 */

import type { AdCanvasState } from './ad-canvas-ai';
import type { MultiAgentSuggestion, MultiAgentSuggestionResult } from './multi-agent-suggestions';

/**
 * Request multi-agent suggestions from backend API
 */
export async function requestMultiAgentSuggestionsFromAPI(
  userMessage: string,
  canvasState: AdCanvasState,
  trpcClient: any, // tRPC client instance
): Promise<MultiAgentSuggestionResult> {
  const startTime = Date.now();

  try {
    // Call backend tRPC procedure
    const result = await trpcClient.agents.getSuggestions.mutate({
      userMessage,
      canvasState,
    });

    return {
      suggestions: result.suggestions || [],
      executionPlan: result.executionPlan || {
        agentsUsed: [],
        order: [],
      },
      estimatedImpact: result.estimatedImpact || 'Unknown',
      totalExecutionTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Failed to get multi-agent suggestions from API:', error);
    
    // Return empty result on error
    return {
      suggestions: [],
      executionPlan: {
        agentsUsed: [],
        order: [],
      },
      estimatedImpact: 'Error',
      totalExecutionTime: Date.now() - startTime,
    };
  }
}

/**
 * Request suggestion from a specific agent
 */
export async function requestAgentSuggestionFromAPI(
  agent: 'design-agent' | 'copy-agent' | 'product-agent' | 'brand-agent' | 'optimization-agent',
  userMessage: string,
  canvasState: AdCanvasState,
  trpcClient: any, // tRPC client instance
): Promise<MultiAgentSuggestion | null> {
  try {
    const result = await trpcClient.agents.getAgentSuggestion.mutate({
      agent,
      userMessage,
      canvasState,
    });

    return result || null;
  } catch (error) {
    console.error(`Failed to get suggestion from ${agent}:`, error);
    return null;
  }
}
