/**
 * Multi-Agent Suggestions Router
 * Provides tRPC procedures for getting real LLM-powered suggestions from multiple specialized agents
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import type { Message } from "../_core/llm";
import { buildRagContext, formatRagContextForPrompt, storeSuggestion } from "../db-rag";
import { comprehensiveSearch } from "../db-rag-search";

// Schema for canvas state (matches client-side AdCanvasState)
const CanvasStateSchema = z.object({
  headline: z.string(),
  titleFontSize: z.number(),
  emojiOrIcon: z.string(),
  badgeText: z.string(),
  ctaButtons: z.array(z.string()),
  disclaimerText: z.string(),
  elementOrder: z.array(z.string()),
  layout: z.string(),
  style: z.object({
    backgroundColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
  }),
  logoHeight: z.number(),
  logoAlignment: z.string(),
  logoCompanion: z.string(),
  productBlockOptions: z.object({
    columns: z.number(),
    imageHeight: z.number(),
    showFields: z.object({
      name: z.boolean(),
      price: z.boolean(),
      description: z.boolean(),
    }),
  }),
  productCount: z.number(),
  format: z.object({
    id: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  dataQuality: z.object({
    hasAllCapsNames: z.boolean(),
    hasMissingPrices: z.boolean(),
    hasOriginalPrices: z.boolean(),
    hasDiscounts: z.boolean(),
    avgDescriptionLength: z.number(),
    imageAnalysis: z.any().optional(),
  }),
  catalogSummary: z.any().optional(),
});

// Agent suggestion schema
const AgentSuggestionSchema = z.object({
  id: z.string(),
  agent: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  priority: z.number(),
  actions: z.array(
    z.object({
      type: z.string(),
      payload: z.any(),
    })
  ),
  reasoning: z.string(),
  confidence: z.number(),
  executionTime: z.number(),
});

const MultiAgentSuggestionResultSchema = z.object({
  suggestions: z.array(AgentSuggestionSchema),
  executionPlan: z.object({
    agentsUsed: z.array(z.string()),
    order: z.array(z.string()),
  }),
  estimatedImpact: z.string(),
  totalExecutionTime: z.number(),
});

// System prompts for each agent
const AGENT_PROMPTS = {
  "design-agent": `You are a Senior Visual Design Expert specializing in retail advertising. Analyze the current ad canvas state and suggest ONE improvement focused on visual design, layout, colors, typography, or spatial hierarchy.

Return a JSON object with:
{
  "title": "Brief title of the suggestion",
  "description": "One-sentence description of the improvement",
  "impact": "high|medium|low",
  "reasoning": "2-3 sentences explaining why this matters",
  "actions": [array of design actions to apply]
}

Focus on visual hierarchy, color psychology, and layout optimization.`,

  "copy-agent": `You are a Senior Copywriter specializing in high-converting retail ads. Analyze the current ad canvas state and suggest ONE improvement focused on headlines, CTAs, badges, or messaging.

Return a JSON object with:
{
  "title": "Brief title of the suggestion",
  "description": "One-sentence description of the improvement",
  "impact": "high|medium|low",
  "reasoning": "2-3 sentences explaining why this matters",
  "actions": [array of text/copy actions to apply]
}

Focus on persuasive messaging, urgency, and call-to-action effectiveness.`,

  "product-agent": `You are a Product Analysis Expert specializing in e-commerce advertising. Analyze the current ad canvas state and suggest ONE improvement focused on product display, images, or product information.

Return a JSON object with:
{
  "title": "Brief title of the suggestion",
  "description": "One-sentence description of the improvement",
  "impact": "high|medium|low",
  "reasoning": "2-3 sentences explaining why this matters",
  "actions": [array of product-related actions to apply]
}

Focus on product visibility, image optimization, and information hierarchy.`,

  "brand-agent": `You are a Brand Compliance Expert specializing in maintaining brand consistency in advertising. Analyze the current ad canvas state and suggest ONE improvement focused on brand guidelines, colors, fonts, or brand identity.

Return a JSON object with:
{
  "title": "Brief title of the suggestion",
  "description": "One-sentence description of the improvement",
  "impact": "high|medium|low",
  "reasoning": "2-3 sentences explaining why this matters",
  "actions": [array of brand-related actions to apply]
}

Focus on brand consistency, guidelines compliance, and brand identity.`,

  "optimization-agent": `You are a Conversion Rate Optimization Expert specializing in retail advertising. Analyze the current ad canvas state and suggest ONE improvement focused on conversion optimization, urgency, or performance.

Return a JSON object with:
{
  "title": "Brief title of the suggestion",
  "description": "One-sentence description of the improvement",
  "impact": "high|medium|low",
  "reasoning": "2-3 sentences explaining why this matters",
  "actions": [array of optimization actions to apply]
}

Focus on conversion potential, urgency signals, and performance optimization.`,
};

/**
 * Call a single agent via LLM with RAG context
 */
async function callAgent(
  agentName: keyof typeof AGENT_PROMPTS,
  userMessage: string,
  canvasState: z.infer<typeof CanvasStateSchema>,
  userId?: number
): Promise<z.infer<typeof AgentSuggestionSchema> | null> {
  const startTime = Date.now();

  try {
    let systemPrompt = AGENT_PROMPTS[agentName];
    let ragContext = "";

    // Build RAG context from user's suggestion history
    if (userId) {
      try {
        const context = await buildRagContext(userId, agentName, 3);
        ragContext = formatRagContextForPrompt(context);
      } catch (error) {
        console.warn(`[RAG] Failed to build context for ${agentName}:`, error);
      }
    }

    // Enhance system prompt with RAG context
    if (ragContext) {
      systemPrompt += `\n\n## User's Successful Past Suggestions${ragContext}\n\nUse these successful suggestions as inspiration and reference when making your recommendation.`;
    }

    const userContent = `User Request: "${userMessage}"

Current Canvas State:
${JSON.stringify(canvasState, null, 2)}

Analyze this request and canvas state. Provide ONE specific, actionable suggestion in JSON format.`;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    const response = await invokeLLM({
      messages,
      max_tokens: 1500,
      response_format: {
        type: "json_object",
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      console.error(`[${agentName}] Empty response from LLM`);
      return null;
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${agentName}] Failed to parse JSON response:`, content.substring(0, 200), parseError);
      return null;
    }

    // Validate required fields
    if (!parsed.title || !parsed.description) {
      console.error(`[${agentName}] Missing required fields in response:`, parsed);
      return null;
    }

    const suggestion = {
      id: `${agentName}-${Date.now()}`,
      agent: agentName,
      title: parsed.title || "Suggestion",
      description: parsed.description || "",
      impact: parsed.impact || "medium",
      priority: parsed.priority || 1,
      actions: parsed.actions || [],
      reasoning: parsed.reasoning || "",
      confidence: 0.85,
      executionTime: Date.now() - startTime,
    };

    // Store suggestion in RAG history for future reference
    if (userId) {
      try {
        await storeSuggestion(userId, {
          agent: agentName,
          userRequest: userMessage,
          title: suggestion.title,
          description: suggestion.description,
          impact: suggestion.impact,
          reasoning: suggestion.reasoning,
          confidence: suggestion.confidence.toString(),
          canvasStateSnapshot: JSON.stringify(canvasState),
          productContext: canvasState.catalogSummary ? JSON.stringify(canvasState.catalogSummary) : undefined,
        });
      } catch (error) {
        console.warn(`[RAG] Failed to store suggestion for ${agentName}:`, error);
      }
    }

    return suggestion;
  } catch (error) {
    console.error(`Agent ${agentName} failed:`, error);
    return null;
  }
}

/**
 * Route user message to appropriate agents
 */
function routeRequest(userMessage: string): (keyof typeof AGENT_PROMPTS)[] {
  const lower = userMessage.toLowerCase();

  const keywordMap: Record<keyof typeof AGENT_PROMPTS, string[]> = {
    "design-agent": ["color", "layout", "typography", "spacing", "design", "visual", "arrange"],
    "copy-agent": ["headline", "text", "cta", "badge", "copy", "message", "write", "say"],
    "product-agent": ["product", "image", "feature", "benefit", "analyze", "show", "display"],
    "brand-agent": ["brand", "guideline", "consistency", "compliance", "style", "identity"],
    "optimization-agent": ["optim", "convert", "performance", "improve", "lift", "better", "enhance"],
  };

  const agentsToUse = new Set<keyof typeof AGENT_PROMPTS>();

  // Check for keyword matches
  for (const [agent, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      agentsToUse.add(agent as keyof typeof AGENT_PROMPTS);
    }
  }

  // If no agents matched, use default strategy
  if (agentsToUse.size === 0) {
    // Complex request: use multiple agents
    if (userMessage.length > 50 || userMessage.includes("and")) {
      return ["design-agent", "copy-agent"];
    }
    // Simple request: use copy agent
    return ["copy-agent"];
  }

  // Reorder for optimal execution
  const order: (keyof typeof AGENT_PROMPTS)[] = [];
  if (agentsToUse.has("product-agent")) order.push("product-agent");
  if (agentsToUse.has("design-agent")) order.push("design-agent");
  if (agentsToUse.has("copy-agent")) order.push("copy-agent");
  if (agentsToUse.has("brand-agent")) order.push("brand-agent");
  if (agentsToUse.has("optimization-agent")) order.push("optimization-agent");

  return order;
}

export const agentsRouter = router({
  /**
   * Get multi-agent suggestions for a user request
   */
  getSuggestions: protectedProcedure
    .input(
      z.object({
        userMessage: z.string(),
        canvasState: CanvasStateSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const { userMessage, canvasState } = input;
      const userId = ctx.user?.id;

      try {
        // Route to appropriate agents
        const agentsToUse = routeRequest(userMessage);

        // Call agents in parallel for speed
        const suggestionPromises = agentsToUse.map((agentName) =>
          callAgent(agentName, userMessage, canvasState, userId)
        );

        const results = await Promise.all(suggestionPromises);
        const suggestions = results.filter((s) => s !== null) as z.infer<typeof AgentSuggestionSchema>[];

        // Sort by impact and priority
        suggestions.sort((a, b) => {
          const impactOrder = { high: 3, medium: 2, low: 1 };
          const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
          if (impactDiff !== 0) return impactDiff;
          return b.priority - a.priority;
        });

        // Calculate estimated impact
        const highImpactCount = suggestions.filter((s) => s.impact === "high").length;
        const mediumImpactCount = suggestions.filter((s) => s.impact === "medium").length;
        let estimatedImpact = "Low";
        if (highImpactCount > 0) {
          estimatedImpact = `High (${highImpactCount} high-impact suggestions)`;
        } else if (mediumImpactCount > 0) {
          estimatedImpact = `Medium (${mediumImpactCount} medium-impact suggestions)`;
        }

        return {
          suggestions,
          executionPlan: {
            agentsUsed: agentsToUse,
            order: agentsToUse,
          },
          estimatedImpact,
          totalExecutionTime: Date.now() - startTime,
        };
      } catch (error) {
        console.error("Multi-agent suggestions failed:", error);
        throw new Error("Failed to generate suggestions");
      }
    }),

  /**
   * Get suggestions from a specific agent
   */
  getAgentSuggestion: protectedProcedure
    .input(
      z.object({
        agent: z.enum(["design-agent", "copy-agent", "product-agent", "brand-agent", "optimization-agent"]),
        userMessage: z.string(),
        canvasState: CanvasStateSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { agent, userMessage, canvasState } = input;
      const userId = ctx.user?.id;

      try {
        const suggestion = await callAgent(agent, userMessage, canvasState, userId);
        if (!suggestion) {
          throw new Error(`Agent ${agent} failed to generate suggestion`);
        }
        return suggestion;
      } catch (error) {
        console.error(`Agent ${agent} error:`, error);
        throw new Error(`Failed to get suggestion from ${agent}`);
      }
    }),

  /**
   * Get RAG-enhanced suggestions based on user's history
   */
  getRagEnhancedSuggestions: protectedProcedure
    .input(
      z.object({
        userMessage: z.string(),
        canvasState: CanvasStateSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userMessage, canvasState } = input;
      const userId = ctx.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      try {
        // Get similar past suggestions from user's history
        const similarSuggestions = await comprehensiveSearch(userId, userMessage, undefined, 3);

        // Route to appropriate agents
        const agentsToUse = routeRequest(userMessage);
        const suggestionPromises = agentsToUse.map((agentName) =>
          callAgent(agentName, userMessage, canvasState, userId)
        );
        const results = await Promise.all(suggestionPromises);
        const suggestions = results.filter((s) => s !== null) as z.infer<typeof AgentSuggestionSchema>[];

        return {
          suggestions,
          similarPastSuggestions: similarSuggestions,
          ragEnhanced: similarSuggestions.length > 0,
        };
      } catch (error) {
        console.error("[getRagEnhancedSuggestions] Error:", error);
        throw new Error("Failed to get RAG-enhanced suggestions");
      }
    }),
});
