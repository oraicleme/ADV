/**
 * Multi-Agent System Exports
 * Central hub for all agents and orchestrator
 */

export { BaseAgent, type AgentContext, type AgentResponse, type Suggestion, type Action } from './BaseAgent';
export { DesignAgent } from './DesignAgent';
export { CopyAgent } from './CopyAgent';
export { ProductAgent } from './ProductAgent';
export { BrandAgent } from './BrandAgent';
export { OptimizationAgent } from './OptimizationAgent';
export {
  AgentOrchestrator,
  type OrchestratorConfig,
  type OrchestratorResult,
  type ExecutionPlan,
} from './AgentOrchestrator';

/**
 * Factory function to create all agents
 */
export function createAgents(apiKey: string, apiUrl: string) {
  const agents = new Map();
  agents.set('design-agent', new (require('./DesignAgent').DesignAgent)(apiKey, apiUrl));
  agents.set('copy-agent', new (require('./CopyAgent').CopyAgent)(apiKey, apiUrl));
  agents.set('product-agent', new (require('./ProductAgent').ProductAgent)(apiKey, apiUrl));
  agents.set('brand-agent', new (require('./BrandAgent').BrandAgent)(apiKey, apiUrl));
  agents.set('optimization-agent', new (require('./OptimizationAgent').OptimizationAgent)(apiKey, apiUrl));
  return agents;
}

/**
 * Factory function to create orchestrator with all agents
 */
export function createOrchestrator(apiKey: string, apiUrl: string) {
  const agents = createAgents(apiKey, apiUrl);
  return new (require('./AgentOrchestrator').AgentOrchestrator)({
    agents,
    routingModel: 'mistralai/Mistral-Nemo-Instruct-2407',
    apiKey,
    apiUrl,
    maxAgentsPerRequest: 4,
  });
}
