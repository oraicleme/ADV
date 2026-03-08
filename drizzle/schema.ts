import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
/**
 * Suggestion History Table - Stores all suggestions generated for users
 * Used for building personalized RAG context
 */
export const suggestionHistory = mysqlTable(
  "suggestionHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Agent that generated the suggestion (design-agent, copy-agent, etc.) */
    agent: varchar("agent", { length: 64 }).notNull(),
    /** The user's request that prompted this suggestion */
    userRequest: text("userRequest").notNull(),
    /** The suggestion title */
    title: text("title").notNull(),
    /** The suggestion description */
    description: text("description").notNull(),
    /** Impact level: high, medium, low */
    impact: varchar("impact", { length: 20 }).notNull(),
    /** Reasoning behind the suggestion */
    reasoning: text("reasoning"),
    /** Confidence score (0-1) */
    confidence: decimal("confidence", { precision: 3, scale: 2, mode: "string" }).notNull(),
    /** Whether the user applied this suggestion */
    applied: boolean("applied").default(false).notNull(),
    /** If applied, the performance impact (0-100 scale) */
    performanceImpact: int("performanceImpact"),
    /** Embedding vector for semantic similarity search (stored as JSON string) */
    embedding: text("embedding"),
    /** Canvas state context when suggestion was made */
    canvasStateSnapshot: text("canvasStateSnapshot"),
    /** Product data context */
    productContext: text("productContext"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("userIdIdx").on(table.userId),
    agentIdx: index("agentIdx").on(table.agent),
    appliedIdx: index("appliedIdx").on(table.applied),
  })
);

export type SuggestionHistory = typeof suggestionHistory.$inferSelect;
export type InsertSuggestionHistory = typeof suggestionHistory.$inferInsert;

/**
 * Suggestion Analytics Table - Tracks aggregate metrics for optimization
 */
export const suggestionAnalytics = mysqlTable(
  "suggestionAnalytics",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Agent name */
    agent: varchar("agent", { length: 64 }).notNull(),
    /** Total suggestions generated */
    totalSuggestions: int("totalSuggestions").default(0).notNull(),
    /** Total suggestions applied by user */
    appliedSuggestions: int("appliedSuggestions").default(0).notNull(),
    /** Average performance impact of applied suggestions */
    avgPerformanceImpact: decimal("avgPerformanceImpact", { precision: 5, scale: 2, mode: "string" }),
    /** Apply rate (applied / total) */
    applyRate: decimal("applyRate", { precision: 5, scale: 4, mode: "string" }),
    /** Average confidence of suggestions */
    avgConfidence: decimal("avgConfidence", { precision: 3, scale: 2, mode: "string" }),
    /** Last updated */
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userAgentIdx: index("userAgentIdx").on(table.userId, table.agent),
  })
);

export type SuggestionAnalytics = typeof suggestionAnalytics.$inferSelect;
export type InsertSuggestionAnalytics = typeof suggestionAnalytics.$inferInsert;

// TODO: Add your tables here
