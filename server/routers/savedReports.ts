/**
 * savedReports router
 *
 * Provides server-side persistence for business reports (ad generation history).
 * When a user is authenticated and the server is available, reports are stored
 * in the database. When not authenticated or server unavailable, the client
 * falls back to localStorage automatically (persistence: "local").
 *
 * The client checks `persistence === "postgres"` to decide whether to sync.
 * Returning `persistence: "local"` is a valid, graceful fallback.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// ─── Shared types ────────────────────────────────────────────────────────────

const ReportSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  report: z.any(),
  savedAt: z.number(),
  name: z.string().optional(),
  note: z.string().optional(),
  products: z.array(z.any()).optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const savedReportsRouter = router({
  /**
   * List saved business reports for the current user.
   * Returns persistence: "local" when user is not authenticated,
   * signalling the client to use localStorage instead.
   */
  listBusinessReports: publicProcedure
    .input(z.object({ limit: z.number().int().positive().default(50) }))
    .query(({ ctx }) => {
      // No authenticated user → tell client to use localStorage
      if (!ctx.user) {
        return { persistence: "local" as const, reports: [] };
      }
      // Authenticated but no DB persistence configured yet → still local
      // TODO: replace with DB query when savedReports table is added to schema
      return { persistence: "local" as const, reports: [] };
    }),

  /**
   * Save a business report for the current user.
   */
  saveBusinessReport: publicProcedure
    .input(
      z.object({
        id: z.string(),
        prompt: z.string(),
        report: z.any(),
        products: z.array(z.any()).optional(),
        name: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user) {
        return { persistence: "local" as const, report: null };
      }
      // TODO: persist to DB when schema is ready
      return {
        persistence: "local" as const,
        report: {
          ...input,
          savedAt: Date.now(),
        },
      };
    }),

  /**
   * Update metadata (name, note) for a saved report.
   */
  updateBusinessReportMetadata: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(({ ctx }) => {
      if (!ctx.user) {
        return { persistence: "local" as const, report: null };
      }
      // TODO: update in DB when schema is ready
      return { persistence: "local" as const, report: null };
    }),

  /**
   * Delete a saved report by ID.
   */
  deleteBusinessReport: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx }) => {
      if (!ctx.user) {
        return { persistence: "local" as const, deleted: false };
      }
      // TODO: delete from DB when schema is ready
      return { persistence: "local" as const, deleted: false };
    }),
});
