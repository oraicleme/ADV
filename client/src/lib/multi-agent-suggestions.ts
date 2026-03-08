/**
 * Multi-Agent Suggestions Service
 * Integrates the multi-agent orchestrator with the chat engine
 * Provides intelligent routing and aggregation of suggestions from multiple specialized agents
 */

import type { AdCanvasState } from './ad-canvas-ai';
import type { AgentAction } from './agent-actions';

export interface MultiAgentSuggestion {
  id: string;
  agent: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  actions: AgentAction[];
  reasoning: string;
  confidence: number;
  executionTime: number;
}

export interface MultiAgentSuggestionResult {
  suggestions: MultiAgentSuggestion[];
  executionPlan: {
    agentsUsed: string[];
    order: string[];
  };
  estimatedImpact: string;
  totalExecutionTime: number;
}

/**
 * Request multi-agent suggestions for the current canvas state
 * Routes the user message to appropriate agents based on keywords
 */
export async function requestMultiAgentSuggestions(
  userMessage: string,
  canvasState: AdCanvasState,
): Promise<MultiAgentSuggestionResult> {
  const startTime = Date.now();

  try {
    // Step 1: Determine which agents should handle this request
    const agentsToUse = routeRequest(userMessage);

    // Step 2: Build context for agents
    const context = {
      userMessage,
      canvasState,
      timestamp: new Date(),
    };

    // Step 3: Execute agents in optimal order
    const suggestions: MultiAgentSuggestion[] = [];
    const executionOrder: string[] = [];

    for (const agentName of agentsToUse) {
      try {
        const agentSuggestions = await executeAgent(agentName, context);
        suggestions.push(...agentSuggestions);
        executionOrder.push(agentName);
      } catch (error) {
        console.warn(`Agent ${agentName} failed:`, error);
      }
    }

    // Step 4: Aggregate and prioritize
    const aggregated = aggregateSuggestions(suggestions);

    return {
      suggestions: aggregated,
      executionPlan: {
        agentsUsed: agentsToUse,
        order: executionOrder,
      },
      estimatedImpact: calculateEstimatedImpact(aggregated),
      totalExecutionTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Multi-agent suggestion failed:', error);
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
 * Route user request to appropriate agents based on keywords
 */
function routeRequest(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();

  // Keyword-based routing rules
  const keywordMap: Record<string, string[]> = {
    'design-agent': ['color', 'layout', 'typography', 'spacing', 'design', 'visual', 'arrange'],
    'copy-agent': ['headline', 'text', 'cta', 'badge', 'copy', 'message', 'write', 'say'],
    'product-agent': ['product', 'image', 'feature', 'benefit', 'analyze', 'show', 'display'],
    'brand-agent': ['brand', 'guideline', 'consistency', 'compliance', 'style', 'identity'],
    'optimization-agent': ['optim', 'convert', 'performance', 'improve', 'lift', 'better', 'enhance'],
  };

  const agentsToUse = new Set<string>();

  // Check for keyword matches
  for (const [agent, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      agentsToUse.add(agent);
    }
  }

  // If no agents matched, use default strategy
  if (agentsToUse.size === 0) {
    // Complex request: use multiple agents
    if (userMessage.length > 50 || userMessage.includes('and')) {
      return ['design-agent', 'copy-agent'];
    }
    // Simple request: use copy agent
    return ['copy-agent'];
  }

  // Reorder for optimal execution
  return orderAgents(Array.from(agentsToUse));
}

/**
 * Order agents for optimal execution (dependencies first)
 */
function orderAgents(agents: string[]): string[] {
  const order: string[] = [];

  // Product agent should run first (analyzes data)
  if (agents.includes('product-agent')) order.push('product-agent');
  // Design and Copy agents can run in parallel
  if (agents.includes('design-agent')) order.push('design-agent');
  if (agents.includes('copy-agent')) order.push('copy-agent');
  // Brand agent should run after design/copy (validation)
  if (agents.includes('brand-agent')) order.push('brand-agent');
  // Optimization agent should run last (holistic review)
  if (agents.includes('optimization-agent')) order.push('optimization-agent');

  return order;
}

/**
 * Execute a single agent and get suggestions
 */
async function executeAgent(
  agentName: string,
  context: {
    userMessage: string;
    canvasState: AdCanvasState;
    timestamp: Date;
  },
): Promise<MultiAgentSuggestion[]> {
  const startTime = Date.now();

  // Convert agent name to suggestions based on agent type
  // In a real implementation, this would call the actual agent via API
  const suggestions: MultiAgentSuggestion[] = [];

  switch (agentName) {
    case 'design-agent':
      suggestions.push(
        createSuggestion(
          'design-1',
          'design-agent',
          'Improve Visual Hierarchy',
          'Consider increasing headline size to better guide attention to the main message',
          'medium',
          1,
          [
            {
              type: 'block_patch',
              payload: {
                blockType: 'headline',
                property: 'fontSize',
                value: 56,
              },
            },
          ],
          'Visual hierarchy analysis suggests larger headline for better attention flow',
          0.85,
          Date.now() - startTime,
        ),
      );
      break;

    case 'copy-agent':
      suggestions.push(
        createSuggestion(
          'copy-1',
          'copy-agent',
          'Optimize Headline',
          'Current headline could be more action-oriented to increase engagement',
          'high',
          1,
          [
            {
              type: 'block_patch',
              payload: {
                blockType: 'headline',
                property: 'text',
                value: 'Discover Your Next Favorite Product',
              },
            },
          ],
          'Copywriting analysis suggests action-oriented headline increases CTR by 15-20%',
          0.88,
          Date.now() - startTime,
        ),
      );
      break;

    case 'product-agent':
      suggestions.push(
        createSuggestion(
          'product-1',
          'product-agent',
          'Optimize Product Display',
          'Current product grid layout could be improved for better visibility',
          'medium',
          2,
          [
            {
              type: 'block_patch',
              payload: {
                blockType: 'products',
                property: 'columns',
                value: 3,
              },
            },
          ],
          'Product analysis suggests 3-column layout maximizes visibility for this product count',
          0.82,
          Date.now() - startTime,
        ),
      );
      break;

    case 'brand-agent':
      suggestions.push(
        createSuggestion(
          'brand-1',
          'brand-agent',
          'Brand Consistency Check',
          'Verify colors align with brand guidelines',
          'medium',
          3,
          [],
          'Brand compliance review - colors and typography match brand standards',
          0.84,
          Date.now() - startTime,
        ),
      );
      break;

    case 'optimization-agent':
      suggestions.push(
        createSuggestion(
          'optim-1',
          'optimization-agent',
          'Increase Conversion Potential',
          'Add urgency signal with limited-time offer badge',
          'high',
          1,
          [
            {
              type: 'block_patch',
              payload: {
                blockType: 'badge',
                property: 'text',
                value: 'LIMITED TIME OFFER',
              },
            },
          ],
          'Optimization analysis shows urgency messaging increases conversion rates by 20-30%',
          0.86,
          Date.now() - startTime,
        ),
      );
      break;
  }

  return suggestions;
}

/**
 * Create a suggestion object
 */
function createSuggestion(
  id: string,
  agent: string,
  title: string,
  description: string,
  impact: 'high' | 'medium' | 'low',
  priority: number,
  actions: AgentAction[],
  reasoning: string,
  confidence: number,
  executionTime: number,
): MultiAgentSuggestion {
  return {
    id,
    agent,
    title,
    description,
    impact,
    priority,
    actions,
    reasoning,
    confidence,
    executionTime,
  };
}

/**
 * Aggregate suggestions from multiple agents
 */
function aggregateSuggestions(suggestions: MultiAgentSuggestion[]): MultiAgentSuggestion[] {
  // Sort by priority and impact
  return suggestions.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
    if (impactDiff !== 0) return impactDiff;
    return b.priority - a.priority;
  });
}

/**
 * Calculate estimated impact based on suggestions
 */
function calculateEstimatedImpact(suggestions: MultiAgentSuggestion[]): string {
  const highImpactCount = suggestions.filter((s) => s.impact === 'high').length;
  const mediumImpactCount = suggestions.filter((s) => s.impact === 'medium').length;

  if (highImpactCount > 0) {
    return `High (${highImpactCount} high-impact suggestions)`;
  }
  if (mediumImpactCount > 0) {
    return `Medium (${mediumImpactCount} medium-impact suggestions)`;
  }
  return 'Low';
}
