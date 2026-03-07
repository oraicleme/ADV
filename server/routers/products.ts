import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createProduct, getUserProducts, deleteProduct } from "../db";

export const productsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserProducts(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.string().optional(),
        photoUrl: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createProduct({
        userId: ctx.user.id,
        ...input,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    return await deleteProduct(input.id, ctx.user.id);
  }),

  import: protectedProcedure
    .input(
      z.object({
        products: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            price: z.string().optional(),
            category: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.products.map((product) =>
          createProduct({
            userId: ctx.user.id,
            ...product,
          })
        )
      );
      return { imported: results.length };
    }),
});
