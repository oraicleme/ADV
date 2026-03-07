import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createAd, getUserAds, getAdById, updateAd, deleteAd } from "../db";
import { notifyOwner } from "../_core/notification";

export const adsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserAds(ctx.user.id);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    return await getAdById(input.id, ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        headline: z.string().optional(),
        badge: z.string().optional(),
        ctaButtons: z.string().optional(),
        disclaimer: z.string().optional(),
        layout: z.enum(["single-hero", "grid-2-6", "category-groups", "sale-discount"]).optional(),
        format: z.enum(["viber-ig-story", "instagram-post", "facebook-ad", "custom"]).optional(),
        customWidth: z.number().optional(),
        customHeight: z.number().optional(),
        backgroundColor: z.string().optional(),
        accentColor: z.string().optional(),
        fontFamily: z.string().optional(),
        logoUrl: z.string().optional(),
        productIds: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ad = await createAd({
        userId: ctx.user.id,
        ...input,
      });

      // Notify owner of new ad creation
      await notifyOwner({
        title: "New Ad Created",
        content: `User ${ctx.user.name || ctx.user.email} created a new ad with headline: "${input.headline || "Untitled"}"`,
      });

      return ad;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        headline: z.string().optional(),
        badge: z.string().optional(),
        ctaButtons: z.string().optional(),
        disclaimer: z.string().optional(),
        layout: z.enum(["single-hero", "grid-2-6", "category-groups", "sale-discount"]).optional(),
        format: z.enum(["viber-ig-story", "instagram-post", "facebook-ad", "custom"]).optional(),
        customWidth: z.number().optional(),
        customHeight: z.number().optional(),
        backgroundColor: z.string().optional(),
        accentColor: z.string().optional(),
        fontFamily: z.string().optional(),
        logoUrl: z.string().optional(),
        productIds: z.string().optional(),
        generatedUrl: z.string().optional(),
        htmlContent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return await updateAd(id, ctx.user.id, updates);
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    return await deleteAd(input.id, ctx.user.id);
  }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        headline: z.string(),
        badge: z.string().optional(),
        ctaButtons: z.string().optional(),
        disclaimer: z.string().optional(),
        layout: z.enum(["single-hero", "grid-2-6", "category-groups", "sale-discount"]),
        format: z.enum(["viber-ig-story", "instagram-post", "facebook-ad", "custom"]),
        customWidth: z.number().optional(),
        customHeight: z.number().optional(),
        backgroundColor: z.string(),
        accentColor: z.string(),
        fontFamily: z.string(),
        logoUrl: z.string().optional(),
        productIds: z.string().optional(),
        generatedUrl: z.string().optional(),
        htmlContent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...adData } = input;

      if (id) {
        await updateAd(id, ctx.user.id, adData);
      } else {
        await createAd({
          userId: ctx.user.id,
          ...adData,
        });
      }

      // Notify owner of ad save
      await notifyOwner({
        title: "Ad Saved",
        content: `User ${ctx.user.name || ctx.user.email} saved an ad: "${input.headline}"`,
      });

      return { success: true };
    }),
});
