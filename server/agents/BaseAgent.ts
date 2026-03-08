/**
 * Base Agent Class - Foundation for all specialized agents
 * Provides common functionality for LLM integration, response parsing, and logging
 */

export interface AgentContext {
  userMessage: string;
  previousResults: AgentResponse[];
  conversationHistory: ConversationMessage[];
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  agent: string;
  status: 'success' | 'error' | 'partial';
  suggestions: Suggestion[];
  confidence: number;
  executionTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  actions: Action[];
  reasoning: string;
}

export interface Action {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export abstract class BaseAgent {
  protected name: string;
  protected model: string;
  protected apiKey: string;
  protected apiUrl: string;

  constructor(name: string, model: string, apiKey: string, apiUrl: string) {
    this.name = name;
    this.model = model;
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Process a request and return suggestions
   */
  abstract process(context: AgentContext): Promise<AgentResponse>;

  /**
   * Call LLM with the configured model
   */
  protected async callLLM(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 500,
  ): Promise<string> {
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse JSON response from LLM
   */
  protected parseJSON<T>(content: string): T {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }

  /**
   * Create a suggestion from agent output
   */
  protected createSuggestion(
    id: string,
    type: string,
    title: string,
    description: string,
    impact: 'high' | 'medium' | 'low',
    priority: number,
    actions: Action[],
    reasoning: string,
  ): Suggestion {
    return {
      id,
      type,
      title,
      description,
      impact,
      priority,
      actions,
      reasoning,
    };
  }

  /**
   * Log agent execution
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`, data || '');
  }
}
