import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAsset, getUserAssets, deleteAsset } from "../db";


export const assetsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["logo", "product-photo", "generated-ad"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allAssets = await getUserAssets(ctx.user.id);
      if (input.type) {
        return allAssets.filter((asset) => asset.type === input.type);
      }
      return allAssets;
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["logo", "product-photo", "generated-ad"]),
        url: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createAsset({
        userId: ctx.user.id,
        ...input,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    return await deleteAsset(input.id, ctx.user.id);
  }),

  getSignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate a unique file key for this upload
      const fileKey = `users/${ctx.user.id}/assets/${Date.now()}-${input.fileName}`;

      // Return the file key and upload URL
      // The client will use this to upload the file directly to storage
      return {
        fileKey,
      };
    }),
});
