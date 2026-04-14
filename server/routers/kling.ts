/**
 * Kling generative video (STORY-180) — BFF: credentials and vendor calls stay on the server.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { ENV } from '../_core/env';
import { buildKlingPromptFromCanvas } from '../lib/kling-prompt';
import {
  hashKlingTaskRef,
  isKlingConfigured,
  klingGetTextToVideoTask,
  klingSubmitTextToVideo,
} from '../lib/kling-client';

function trpcFromKlingError(err: unknown, code: 'BAD_REQUEST' | 'INTERNAL_SERVER_ERROR' = 'INTERNAL_SERVER_ERROR'): never {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    if (status === 429) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Kling rate limit — try again shortly.' });
    }
    if (status === 401 || status === 403) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Kling API rejected credentials.' });
    }
  }
  const msg = err instanceof Error ? err.message : 'Kling request failed';
  throw new TRPCError({ code, message: msg });
}

const submitInput = z.object({
  headline: z.string().max(500).default(''),
  cta: z.string().max(200).optional(),
  locale: z.string().max(32).optional(),
  formatLabel: z.string().max(64).optional(),
  products: z
    .array(
      z.object({
        name: z.string().max(500),
        category: z.string().max(200).optional(),
        brand: z.string().max(200).optional(),
      }),
    )
    .max(50),
  mode: z.enum(['std', 'pro']).optional(),
  aspect_ratio: z.string().max(16).optional(),
  duration: z.string().max(8).optional(),
  sound: z.enum(['on', 'off']).optional(),
});

export const klingRouter = router({
  health: protectedProcedure.query(() => {
    const configured = isKlingConfigured();
    let baseUrlHost = '';
    try {
      baseUrlHost = new URL(ENV.klingApiBaseUrl.trim() || 'https://api-singapore.klingai.com').host;
    } catch {
      baseUrlHost = '(invalid KLING_API_BASE_URL)';
    }
    return {
      configured,
      baseUrlHost,
    } as const;
  }),

  submitVideoJob: protectedProcedure.input(submitInput).mutation(async ({ input, ctx }) => {
    if (!isKlingConfigured()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Kling API is not configured on the server (KLING_ACCESS_KEY / KLING_SECRET_KEY).',
      });
    }

    const built = buildKlingPromptFromCanvas({
      products: input.products,
      headline: input.headline,
      cta: input.cta,
      formatLabel: input.formatLabel,
      locale: input.locale,
    });

    try {
      const { taskId, raw } = await klingSubmitTextToVideo({
        model_name: ENV.klingDefaultVideoModel,
        prompt: built.prompt,
        negative_prompt: built.negativePrompt,
        mode: input.mode ?? 'pro',
        duration: input.duration ?? '5',
        sound: input.sound ?? 'on',
        aspect_ratio: input.aspect_ratio ?? '9:16',
      });

      const ref = hashKlingTaskRef(taskId);
      console.warn(
        `[kling] submitVideoJob user=${ctx.user.id} taskRef=${ref} productCount=${built.metadata.productCount}`,
      );

      return {
        taskId,
        metadata: built.metadata,
        /** Opaque vendor payload shape — for debugging only; do not rely on in UI. */
        vendor: process.env.NODE_ENV === 'development' ? raw : undefined,
      };
    } catch (e) {
      trpcFromKlingError(e);
    }
  }),

  getVideoJobStatus: protectedProcedure
    .input(z.object({ taskId: z.string().min(1).max(512) }))
    .query(async ({ input, ctx }) => {
      if (!isKlingConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Kling API is not configured on the server.',
        });
      }
      try {
        const status = await klingGetTextToVideoTask(input.taskId);
        const ref = hashKlingTaskRef(input.taskId);
        if (status.state === 'failed') {
          console.warn(`[kling] task failed user=${ctx.user.id} taskRef=${ref} rawStatus=${status.rawStatus}`);
        }
        return {
          state: status.state,
          rawStatus: status.rawStatus,
          resultUrls: status.resultUrls,
          errorMessage: status.errorMessage,
          terminal: status.state === 'succeeded' || status.state === 'failed',
          vendor: process.env.NODE_ENV === 'development' ? status.raw : undefined,
        };
      } catch (e) {
        trpcFromKlingError(e);
      }
    }),
});
