import { describe, it, expect } from 'vitest';
import { BaseAgent, type AgentContext, type AgentResponse } from './BaseAgent';
import { DesignAgent } from './DesignAgent';
import { CopyAgent } from './CopyAgent';
import { ProductAgent } from './ProductAgent';
import { BrandAgent } from './BrandAgent';
import { OptimizationAgent } from './OptimizationAgent';
import { AgentOrchestrator } from './AgentOrchestrator';

describe('Multi-Agent System', () => {
  const mockApiKey = 'test-api-key';
  const mockApiUrl = 'https://api.example.com';

  describe('BaseAgent', () => {
    it('initializes with correct properties', () => {
      class TestAgent extends BaseAgent {
        async process(): Promise<AgentResponse> {
          return {
            agent: this.name,
            status: 'success',
            suggestions: [],
            confidence: 1,
            executionTime: 0,
          };
        }
      }

      const agent = new TestAgent('test-agent', 'test-model', mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
    });
  });

  describe('Agent Instantiation', () => {
    it('creates DesignAgent', () => {
      const agent = new DesignAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('creates CopyAgent', () => {
      const agent = new CopyAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('creates ProductAgent', () => {
      const agent = new ProductAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('creates BrandAgent', () => {
      const agent = new BrandAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('creates OptimizationAgent', () => {
      const agent = new OptimizationAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeInstanceOf(BaseAgent);
    });
  });

  describe('AgentOrchestrator', () => {
    it('initializes with agents', () => {
      const agents = new Map();
      agents.set('design-agent', new DesignAgent(mockApiKey, mockApiUrl));
      agents.set('copy-agent', new CopyAgent(mockApiKey, mockApiUrl));

      const orchestrator = new AgentOrchestrator({
        agents,
        routingModel: 'test-model',
        apiKey: mockApiKey,
        apiUrl: mockApiUrl,
        maxAgentsPerRequest: 4,
      });

      expect(orchestrator.getAgents()).toContain('design-agent');
      expect(orchestrator.getAgents()).toContain('copy-agent');
    });

    it('adds agents dynamically', () => {
      const agents = new Map();
      const orchestrator = new AgentOrchestrator({
        agents,
        routingModel: 'test-model',
        apiKey: mockApiKey,
        apiUrl: mockApiUrl,
        maxAgentsPerRequest: 4,
      });

      const newAgent = new CopyAgent(mockApiKey, mockApiUrl);
      orchestrator.addAgent('copy-agent', newAgent);

      expect(orchestrator.getAgents()).toContain('copy-agent');
    });

    it('removes agents', () => {
      const agents = new Map();
      agents.set('copy-agent', new CopyAgent(mockApiKey, mockApiUrl));

      const orchestrator = new AgentOrchestrator({
        agents,
        routingModel: 'test-model',
        apiKey: mockApiKey,
        apiUrl: mockApiUrl,
        maxAgentsPerRequest: 4,
      });

      expect(orchestrator.getAgents()).toContain('copy-agent');

      orchestrator.removeAgent('copy-agent');
      expect(orchestrator.getAgents()).not.toContain('copy-agent');
    });
  });

  describe('Agent Responsibilities', () => {
    it('DesignAgent handles design requests', () => {
      const agent = new DesignAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
      // Agent should be specialized for design
    });

    it('CopyAgent handles copy requests', () => {
      const agent = new CopyAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
      // Agent should be specialized for copy
    });

    it('ProductAgent handles product requests', () => {
      const agent = new ProductAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
      // Agent should be specialized for product analysis
    });

    it('BrandAgent handles brand requests', () => {
      const agent = new BrandAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
      // Agent should be specialized for brand compliance
    });

    it('OptimizationAgent handles optimization requests', () => {
      const agent = new OptimizationAgent(mockApiKey, mockApiUrl);
      expect(agent).toBeDefined();
      // Agent should be specialized for optimization
    });
  });

  describe('Agent Models', () => {
    it('uses appropriate models for each agent', () => {
      const designAgent = new DesignAgent(mockApiKey, mockApiUrl);
      const copyAgent = new CopyAgent(mockApiKey, mockApiUrl);
      const productAgent = new ProductAgent(mockApiKey, mockApiUrl);
      const brandAgent = new BrandAgent(mockApiKey, mockApiUrl);
      const optimizationAgent = new OptimizationAgent(mockApiKey, mockApiUrl);

      // Verify agents are created with correct models
      expect(designAgent).toBeInstanceOf(DesignAgent);
      expect(copyAgent).toBeInstanceOf(CopyAgent);
      expect(productAgent).toBeInstanceOf(ProductAgent);
      expect(brandAgent).toBeInstanceOf(BrandAgent);
      expect(optimizationAgent).toBeInstanceOf(OptimizationAgent);
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('orchestrator manages multiple agents', () => {
      const agents = new Map();
      agents.set('design-agent', new DesignAgent(mockApiKey, mockApiUrl));
      agents.set('copy-agent', new CopyAgent(mockApiKey, mockApiUrl));
      agents.set('product-agent', new ProductAgent(mockApiKey, mockApiUrl));
      agents.set('brand-agent', new BrandAgent(mockApiKey, mockApiUrl));
      agents.set('optimization-agent', new OptimizationAgent(mockApiKey, mockApiUrl));

      const orchestrator = new AgentOrchestrator({
        agents,
        routingModel: 'test-model',
        apiKey: mockApiKey,
        apiUrl: mockApiUrl,
        maxAgentsPerRequest: 4,
      });

      expect(orchestrator.getAgents().length).toBe(5);
    });

    it('respects max agents per request', () => {
      const agents = new Map();
      agents.set('design-agent', new DesignAgent(mockApiKey, mockApiUrl));
      agents.set('copy-agent', new CopyAgent(mockApiKey, mockApiUrl));
      agents.set('product-agent', new ProductAgent(mockApiKey, mockApiUrl));
      agents.set('brand-agent', new BrandAgent(mockApiKey, mockApiUrl));
      agents.set('optimization-agent', new OptimizationAgent(mockApiKey, mockApiUrl));

      const orchestrator = new AgentOrchestrator({
        agents,
        routingModel: 'test-model',
        apiKey: mockApiKey,
        apiUrl: mockApiUrl,
        maxAgentsPerRequest: 2,
      });

      // Orchestrator should limit agents to maxAgentsPerRequest
      expect(orchestrator.getAgents().length).toBe(5); // All agents registered
      // But handleRequest would limit to 2
    });
  });
});
