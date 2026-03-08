/**
 * Agent Orchestrator - Coordinates multiple agents and manages execution flow
 * Routes requests to appropriate agents, manages execution order, and aggregates results
 */

import { BaseAgent, type AgentContext, type AgentResponse, type Suggestion } from './BaseAgent';

export interface OrchestratorConfig {
  agents: Map<string, BaseAgent>;
  routingModel: string;
  apiKey: string;
  apiUrl: string;
  maxAgentsPerRequest: number;
}

export interface OrchestratorResult {
  suggestions: Suggestion[];
  executionPlan: ExecutionPlan;
  estimatedImpact: string;
  executionTime: number;
}

export interface ExecutionPlan {
  agentsUsed: string[];
  order: string[];
  dependencies: Record<string, string[]>;
}

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;
  private routingModel: string;
  private apiKey: string;
  private apiUrl: string;
  private maxAgentsPerRequest: number;

  constructor(config: OrchestratorConfig) {
    this.agents = config.agents;
    this.routingModel = config.routingModel;
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.maxAgentsPerRequest = config.maxAgentsPerRequest || 4;
  }

  /**
   * Handle a user request by routing to appropriate agents
   */
  async handleRequest(context: AgentContext): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Step 1: Route request to appropriate agents
      const agentsToUse = await this.routeRequest(context.userMessage);

      // Step 2: Execute agents in optimal order
      const results: AgentResponse[] = [];
      const executionPlan: ExecutionPlan = {
        agentsUsed: agentsToUse,
        order: [],
        dependencies: {},
      };

      for (const agentName of agentsToUse) {
        const agent = this.agents.get(agentName);
        if (!agent) {
          console.warn(`Agent not found: ${agentName}`);
          continue;
        }

        try {
          const response = await agent.process({
            ...context,
            previousResults: results,
          });

          results.push(response);
          executionPlan.order.push(agentName);
        } catch (error) {
          console.error(`Agent ${agentName} failed:`, error);
        }
      }

      // Step 3: Aggregate and prioritize results
      const aggregated = this.aggregateResults(results);

      // Step 4: Return to user
      return {
        suggestions: aggregated.suggestions,
        executionPlan,
        estimatedImpact: aggregated.estimatedImpact,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Orchestrator error:', error);
      throw error;
    }
  }

  /**
   * Route user request to appropriate agents using keyword matching
   */
  private async routeRequest(userMessage: string): Promise<string[]> {
    const lower = userMessage.toLowerCase();

    // Keyword-based routing rules
    const keywordMap: Record<string, string[]> = {
      'design-agent': ['color', 'layout', 'typography', 'spacing', 'design', 'visual'],
      'copy-agent': ['headline', 'text', 'cta', 'badge', 'copy', 'message'],
      'product-agent': ['product', 'image', 'feature', 'benefit', 'analyze'],
      'brand-agent': ['brand', 'guideline', 'consistency', 'compliance'],
      'optimization-agent': ['optim', 'convert', 'performance', 'improve', 'lift'],
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
      // Simple request: use single agent
      return ['copy-agent'];
    }

    // Respect max agents limit
    const result = Array.from(agentsToUse).slice(0, this.maxAgentsPerRequest);

    // Reorder for optimal execution
    return this.orderAgents(result);
  }

  /**
   * Order agents for optimal execution (dependencies first)
   */
  private orderAgents(agents: string[]): string[] {
    // Product agent should run first (analyzes data)
    // Design and Copy agents can run in parallel
    // Brand agent should run after design/copy (validation)
    // Optimization agent should run last (holistic review)

    const order: string[] = [];

    if (agents.includes('product-agent')) order.push('product-agent');
    if (agents.includes('design-agent')) order.push('design-agent');
    if (agents.includes('copy-agent')) order.push('copy-agent');
    if (agents.includes('brand-agent')) order.push('brand-agent');
    if (agents.includes('optimization-agent')) order.push('optimization-agent');

    return order;
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(results: AgentResponse[]): {
    suggestions: Suggestion[];
    estimatedImpact: string;
  } {
    // Combine suggestions from all agents
    const allSuggestions = results.flatMap((r) => r.suggestions);

    // Sort by priority and impact
    const sorted = allSuggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.priority - a.priority;
    });

    // Calculate estimated impact
    const highImpactCount = sorted.filter((s) => s.impact === 'high').length;
    const mediumImpactCount = sorted.filter((s) => s.impact === 'medium').length;
    const estimatedImpact =
      highImpactCount > 0
        ? `High (${highImpactCount} high-impact suggestions)`
        : mediumImpactCount > 0
          ? `Medium (${mediumImpactCount} medium-impact suggestions)`
          : 'Low';

    return {
      suggestions: sorted,
      estimatedImpact,
    };
  }

  /**
   * Add a new agent to the orchestrator
   */
  addAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
  }

  /**
   * Remove an agent from the orchestrator
   */
  removeAgent(name: string): void {
    this.agents.delete(name);
  }

  /**
   * Get list of available agents
   */
  getAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
