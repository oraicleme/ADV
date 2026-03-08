/**
 * Semantic Similarity Search for RAG
 * Finds similar past suggestions using text-based similarity metrics
 */

import { getDb } from './db';
import { suggestionHistory } from '../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { SuggestionHistory } from '../drizzle/schema';

/**
 * Simple text similarity using Levenshtein-like distance
 * Returns score between 0 and 1 (1 = exact match)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const s1 = text1.toLowerCase().trim();
  const s2 = text2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // Split into words and calculate Jaccard similarity
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Extract keywords from text for matching
 */
export function extractKeywords(text: string): string[] {
  // Common stop words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  ]);

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 20); // Limit to first 20 keywords
}

/**
 * Find similar suggestions from user history
 * Uses text similarity and keyword matching
 */
export async function findSimilarSuggestions(
  userId: number,
  userRequest: string,
  agent?: string,
  limit: number = 5
): Promise<Array<SuggestionHistory & { similarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(suggestionHistory.userId, userId)];
  if (agent) {
    conditions.push(eq(suggestionHistory.agent, agent));
  }

  const allSuggestions = await db
    .select()
    .from(suggestionHistory)
    .where(and(...conditions))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(100); // Get recent suggestions to search through

  // Calculate similarity scores
  const scored = allSuggestions
    .map((suggestion) => ({
      ...suggestion,
      similarity: calculateTextSimilarity(userRequest, suggestion.userRequest),
    }))
    .filter((s) => s.similarity > 0.2) // Filter out very dissimilar suggestions
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

/**
 * Find suggestions by keywords
 * Useful for "show me suggestions about X"
 */
export async function findSuggestionsByKeywords(
  userId: number,
  keywords: string[],
  agent?: string,
  limit: number = 5
): Promise<Array<SuggestionHistory & { matchCount: number; matchScore: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(suggestionHistory.userId, userId)];
  if (agent) {
    conditions.push(eq(suggestionHistory.agent, agent));
  }

  const allSuggestions = await db
    .select()
    .from(suggestionHistory)
    .where(and(...conditions))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(100);

  // Score by keyword matches
  const scored = allSuggestions
    .map((suggestion) => {
      const suggestionText = `${suggestion.userRequest} ${suggestion.title} ${suggestion.description}`.toLowerCase();
      const matches = keywords.filter((kw) => suggestionText.includes(kw.toLowerCase()));

      return {
        ...suggestion,
        matchCount: matches.length,
        matchScore: matches.length / keywords.length,
      };
    })
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.matchCount - a.matchCount;
    })
    .slice(0, limit);

  return scored;
}

/**
 * Find suggestions by agent and impact
 * Useful for "show me what design agent suggested that worked"
 */
export async function findHighImpactSuggestionsByAgent(
  userId: number,
  agent: string,
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
        eq(suggestionHistory.agent, agent),
        eq(suggestionHistory.applied, true),
        sql`${suggestionHistory.performanceImpact} >= ${minImpact}`
      )
    )
    .orderBy(desc(suggestionHistory.performanceImpact))
    .limit(limit);
}

/**
 * Find suggestions related to a specific canvas state
 * Useful for "show me suggestions for similar products"
 */
export async function findSuggestionsForSimilarContext(
  userId: number,
  productContext: string,
  agent?: string,
  limit: number = 5
): Promise<Array<SuggestionHistory & { contextSimilarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(suggestionHistory.userId, userId),
    sql`${suggestionHistory.productContext} IS NOT NULL`,
  ];
  if (agent) {
    conditions.push(eq(suggestionHistory.agent, agent));
  }

  const allSuggestions = await db
    .select()
    .from(suggestionHistory)
    .where(and(...conditions))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(100);

  const scored = allSuggestions
    .map((suggestion) => ({
      ...suggestion,
      contextSimilarity: suggestion.productContext
        ? calculateTextSimilarity(productContext, suggestion.productContext)
        : 0,
    }))
    .filter((s) => s.contextSimilarity > 0.3)
    .sort((a, b) => b.contextSimilarity - a.contextSimilarity)
    .slice(0, limit);

  return scored;
}

/**
 * Build a comprehensive search query combining multiple strategies
 */
export async function comprehensiveSearch(
  userId: number,
  userRequest: string,
  agent?: string,
  limit: number = 5
): Promise<SuggestionHistory[]> {
  const [similar, byKeywords, byAgent] = await Promise.all([
    findSimilarSuggestions(userId, userRequest, agent, limit),
    findSuggestionsByKeywords(userId, extractKeywords(userRequest), agent, limit),
    agent ? findHighImpactSuggestionsByAgent(userId, agent, 50, limit) : Promise.resolve([]),
  ]);

  // Combine and deduplicate by ID, keeping highest scored
  const combined = new Map<number, SuggestionHistory>();

  // Add similar suggestions (highest priority)
  for (const s of similar) {
    const { similarity, ...rest } = s;
    combined.set(rest.id, rest);
  }

  // Add keyword matches (medium priority)
  for (const s of byKeywords) {
    const { matchCount, matchScore, ...rest } = s;
    if (!combined.has(rest.id)) {
      combined.set(rest.id, rest);
    }
  }

  // Add high-impact agent suggestions (lower priority)
  for (const s of byAgent) {
    if (!combined.has(s.id)) {
      combined.set(s.id, s);
    }
  }

  return Array.from(combined.values()).slice(0, limit);
}

/**
 * Get trending suggestions (most applied recently)
 */
export async function getTrendingSuggestions(
  userId: number,
  agent?: string,
  limit: number = 5
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
    .orderBy(desc(suggestionHistory.updatedAt))
    .limit(limit);
}

/**
 * Get diverse suggestions (different agents/types)
 * Useful for "show me varied suggestions"
 */
export async function getDiverseSuggestions(
  userId: number,
  limit: number = 5
): Promise<SuggestionHistory[]> {
  const db = await getDb();
  if (!db) return [];

  // Get suggestions grouped by agent, taking top from each
  const allSuggestions = await db
    .select()
    .from(suggestionHistory)
    .where(eq(suggestionHistory.userId, userId))
    .orderBy(desc(suggestionHistory.createdAt))
    .limit(100);

  // Group by agent
  const byAgent = new Map<string, SuggestionHistory[]>();
  for (const s of allSuggestions) {
    if (!byAgent.has(s.agent)) {
      byAgent.set(s.agent, []);
    }
    byAgent.get(s.agent)!.push(s);
  }

  // Take top from each agent
  const diverse: SuggestionHistory[] = [];
  for (const suggestions of byAgent.values()) {
    if (diverse.length < limit) {
      diverse.push(suggestions[0]);
    }
  }

  return diverse.slice(0, limit);
}
