/**
 * RAG Service - Retrieval-Augmented Generation for personalized suggestions
 * Stores suggestion history and retrieves similar past suggestions for context
 */

import { getDb } from './db';
import { suggestionHistory, suggestionAnalytics } from '../drizzle/schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import type { InsertSuggestionHistory, SuggestionHistory, SuggestionAnalytics } from '../drizzle/schema';

/**
 * Store a new suggestion in the user's history
 */
export async function storeSuggestion(
  userId: number,
  data: Omit<InsertSuggestionHistory, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<SuggestionHistory> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.insert(suggestionHistory).values({
    ...data,
    userId,
  });

  // Get the last inserted suggestion
  const stored = await db
    .select()
    .from(suggestionHistory)
    .where(eq(suggestionHistory.userId, userId))
    .orderBy(desc(suggestionHistory.id))
    .limit(1)
    .then((rows: SuggestionHistory[]) => rows[0]);

  if (!stored) throw new Error('Failed to store suggestion');
  return stored as SuggestionHistory;
}

/**
 * Mark a suggestion as applied and record its performance impact
 */
export async function markSuggestionApplied(
  suggestionId: number,
  performanceImpact?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(suggestionHistory)
    .set({
      applied: true,
      performanceImpact,
      updatedAt: new Date(),
    })
    .where(eq(suggestionHistory.id, suggestionId));
}

/**
 * Get recent suggestions for a user (for context building)
 */
export async function getRecentSuggestions(
  userId: number,
  limit: number = 10,
  agent?: string
): Promise<SuggestionHistory[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(suggestionHistory.userId, userId)];
  if (agent) {
    conditions.push(eq(suggestionHistory.agent, agent));
  }

  return db
    .select()
    .from(suggestionHistory)
    .where(and(...conditions))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(limit);
}

/**
 * Get applied suggestions (high-quality examples for RAG context)
 */
export async function getAppliedSuggestions(
  userId: number,
  limit: number = 5,
  agent?: string
): Promise<SuggestionHistory[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(suggestionHistory.userId, userId),
    eq(suggestionHistory.applied, true),
  ];
  if (agent) {
    conditions.push(eq(suggestionHistory.agent, agent));
  }

  return db
    .select()
    .from(suggestionHistory)
    .where(and(...conditions))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(limit);
}

/**
 * Get suggestions with high performance impact (for learning what works)
 */
export async function getHighImpactSuggestions(
  userId: number,
  minImpact: number = 50,
  limit: number = 5
): Promise<SuggestionHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(suggestionHistory)
    .where(
      and(
        eq(suggestionHistory.userId, userId),
        eq(suggestionHistory.applied, true),
        sql`${suggestionHistory.performanceImpact} >= ${minImpact}`
      )
    )
    .orderBy(desc(suggestionHistory.performanceImpact))
    .limit(limit);
}

/**
 * Build RAG context from user's suggestion history
 * Returns recent applied suggestions grouped by agent
 */
export async function buildRagContext(
  userId: number,
  agent: string,
  limit: number = 3
): Promise<{
  recentApplied: SuggestionHistory[];
  highImpact: SuggestionHistory[];
  agentSpecific: SuggestionHistory[];
}> {
  const [recentApplied, highImpact, agentSpecific] = await Promise.all([
    getAppliedSuggestions(userId, limit),
    getHighImpactSuggestions(userId, 50, limit),
    getAppliedSuggestions(userId, limit, agent),
  ]);

  return {
    recentApplied,
    highImpact,
    agentSpecific,
  };
}

/**
 * Update or create analytics for a user/agent combination
 */
export async function updateSuggestionAnalytics(userId: number, agent: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get all suggestions for this user/agent
  const suggestions = await db
    .select()
    .from(suggestionHistory)
    .where(
      and(
        eq(suggestionHistory.userId, userId),
        eq(suggestionHistory.agent, agent)
      )
    );

  if (suggestions.length === 0) return;

  const appliedSuggestions = suggestions.filter((s: SuggestionHistory) => s.applied);
  const avgPerformanceImpact =
    appliedSuggestions.length > 0
      ? (
          appliedSuggestions.reduce((sum: number, s: SuggestionHistory) => sum + (s.performanceImpact || 0), 0) /
          appliedSuggestions.length
        ).toFixed(2)
      : '0';

  const applyRate = ((appliedSuggestions.length / suggestions.length) * 10000).toFixed(0); // 4 decimal places
  const avgConfidence = (
    suggestions.reduce((sum: number, s: SuggestionHistory) => sum + parseFloat(s.confidence), 0) / suggestions.length
  ).toFixed(2);

  // Upsert analytics
  const existing = await db
    .select()
    .from(suggestionAnalytics)
    .where(
      and(
        eq(suggestionAnalytics.userId, userId),
        eq(suggestionAnalytics.agent, agent)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(suggestionAnalytics)
      .set({
        totalSuggestions: suggestions.length,
        appliedSuggestions: appliedSuggestions.length,
        avgPerformanceImpact,
        applyRate: (parseInt(applyRate) / 10000).toFixed(4),
        avgConfidence,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(suggestionAnalytics.userId, userId),
          eq(suggestionAnalytics.agent, agent)
        )
      );
  } else {
    await db.insert(suggestionAnalytics).values({
      userId,
      agent,
      totalSuggestions: suggestions.length,
      appliedSuggestions: appliedSuggestions.length,
      avgPerformanceImpact,
      applyRate: (parseInt(applyRate) / 10000).toFixed(4),
      avgConfidence,
    });
  }
}

/**
 * Get analytics for a user/agent combination
 */
export async function getSuggestionAnalytics(
  userId: number,
  agent?: string
): Promise<SuggestionAnalytics[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(suggestionAnalytics.userId, userId)];
  if (agent) {
    conditions.push(eq(suggestionAnalytics.agent, agent));
  }

  return db
    .select()
    .from(suggestionAnalytics)
    .where(and(...conditions))
    .orderBy(desc(suggestionAnalytics.applyRate));
}

/**
 * Get user's top performing agents (by apply rate)
 */
export async function getTopPerformingAgents(userId: number, limit: number = 3): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const analytics: SuggestionAnalytics[] = await db
    .select()
    .from(suggestionAnalytics)
    .where(eq(suggestionAnalytics.userId, userId))
    .orderBy(desc(suggestionAnalytics.applyRate))
    .limit(limit);

  return analytics.map((a) => a.agent);
}

/**
 * Format RAG context for LLM prompt
 */
export function formatRagContextForPrompt(ragContext: {
  recentApplied: SuggestionHistory[];
  highImpact: SuggestionHistory[];
  agentSpecific: SuggestionHistory[];
}): string {
  let context = '';

  if (ragContext.agentSpecific.length > 0) {
    context += '\n## Recent Successful Suggestions for This Agent:\n';
    for (const suggestion of ragContext.agentSpecific) {
      context += `- **${suggestion.title}**: ${suggestion.description}\n`;
      if (suggestion.performanceImpact) {
        context += `  (Performance impact: +${suggestion.performanceImpact}%)\n`;
      }
    }
  }

  if (ragContext.highImpact.length > 0) {
    context += '\n## High-Impact Suggestions (Across All Agents):\n';
    for (const suggestion of ragContext.highImpact) {
      context += `- [${suggestion.agent}] **${suggestion.title}**: ${suggestion.description}\n`;
      if (suggestion.performanceImpact) {
        context += `  (Impact: +${suggestion.performanceImpact}%)\n`;
      }
    }
  }

  if (ragContext.recentApplied.length > 0) {
    context += '\n## Recent Applied Suggestions:\n';
    for (const suggestion of ragContext.recentApplied.slice(0, 3)) {
      context += `- [${suggestion.agent}] ${suggestion.title}\n`;
    }
  }

  return context;
}

/**
 * Calculate embedding for a suggestion (simplified - uses text hash)
 * In production, use a real embedding model
 */
export function calculateSuggestionEmbedding(suggestion: {
  userRequest: string;
  title: string;
  description: string;
  agent: string;
}): string {
  // Simplified: combine text fields for semantic search
  const combined = `${suggestion.userRequest} ${suggestion.title} ${suggestion.description} ${suggestion.agent}`;
  return combined.toLowerCase().split(/\s+/).slice(0, 50).join(' ');
}
