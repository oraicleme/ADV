/**
 * Kling generative media (STORY-180 + image-to-video + image generation).
 * BFF: credentials and vendor calls stay on the server.
 *
 * Endpoints:
 *   - health: check if Kling is configured
 *   - submitVideoJob: text-to-video (legacy)
 *   - submitImage2Video: image-to-video (opt-in, user clicks "Animate this ad")
 *   - submitImageGen: AI image generation (backgrounds, scenes)
 *   - getVideoJobStatus: poll text-to-video or image-to-video task
 *   - getImageGenStatus: poll image generation task
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
import {
  klingSubmitImage2Video,
  klingGetImage2VideoTask,
  klingSubmitImageGeneration,
  klingGetImageGenTask,
} from '../lib/kling-media';

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

/* ── Input schemas ───────────────────────────────────────────────────── */

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

const submitImage2VideoInput = z.object({
  /** Base64 (raw, no data: prefix) or public URL of the rendered ad image */
  image: z.string().min(1).max(20_000_000), // Base64 can be large
  /** Optional end-frame image */
  imageTail: z.string().max(20_000_000).optional(),
  /** Animation prompt */
  prompt: z.string().max(2500).optional(),
  /** Negative prompt */
  negativePrompt: z.string().max(2500).optional(),
  /** Duration: 5 or 10 seconds */
  duration: z.enum(['5', '10']).optional(),
  /** Mode: std (cheaper) or pro (higher quality) */
  mode: z.enum(['std', 'pro']).optional(),
  /** Sound generation */
  sound: z.enum(['on', 'off']).optional(),
});

const submitImageGenInput = z.object({
  /** Text prompt describing the desired image */
  prompt: z.string().min(1).max(2500),
  /** Negative prompt */
  negativePrompt: z.string().max(2500).optional(),
  /** Reference image for image-to-image (Base64 or URL) */
  referenceImage: z.string().max(20_000_000).optional(),
  /** Number of images to generate (1-4 for cost control) */
  count: z.number().int().min(1).max(4).optional(),
  /** Aspect ratio */
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3']).optional(),
  /** Resolution */
  resolution: z.enum(['1k', '2k']).optional(),
});

/* ── Router ──────────────────────────────────────────────────────────── */

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

  /* ── Text-to-Video (legacy) ──────────────────────────────────────── */

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
        vendor: process.env.NODE_ENV === 'development' ? raw : undefined,
      };
    } catch (e) {
      trpcFromKlingError(e);
    }
  }),

  /* ── Image-to-Video (opt-in: "Animate this ad") ─────────────────── */

  submitImage2Video: protectedProcedure.input(submitImage2VideoInput).mutation(async ({ input, ctx }) => {
    if (!isKlingConfigured()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Kling API is not configured on the server (KLING_ACCESS_KEY / KLING_SECRET_KEY).',
      });
    }

    try {
      const { taskId, raw } = await klingSubmitImage2Video({
        image: input.image,
        imageTail: input.imageTail,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        duration: input.duration as '5' | '10' | undefined,
        mode: input.mode,
        sound: input.sound,
      });

      const ref = hashKlingTaskRef(taskId);
      console.warn(
        `[kling] submitImage2Video user=${ctx.user.id} taskRef=${ref} mode=${input.mode ?? 'std'} duration=${input.duration ?? '5'}`,
      );

      return {
        taskId,
        vendor: process.env.NODE_ENV === 'development' ? raw : undefined,
      };
    } catch (e) {
      trpcFromKlingError(e);
    }
  }),

  /* ── Image Generation (AI backgrounds/scenes) ───────────────────── */

  submitImageGen: protectedProcedure.input(submitImageGenInput).mutation(async ({ input, ctx }) => {
    if (!isKlingConfigured()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Kling API is not configured on the server (KLING_ACCESS_KEY / KLING_SECRET_KEY).',
      });
    }

    try {
      const { taskId, raw } = await klingSubmitImageGeneration({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        referenceImage: input.referenceImage,
        count: input.count,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
      });

      const ref = hashKlingTaskRef(taskId);
      console.warn(
        `[kling] submitImageGen user=${ctx.user.id} taskRef=${ref} count=${input.count ?? 1}`,
      );

      return {
        taskId,
        vendor: process.env.NODE_ENV === 'development' ? raw : undefined,
      };
    } catch (e) {
      trpcFromKlingError(e);
    }
  }),

  /* ── Status polling (works for both video types) ─────────────────── */

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

  /** Poll image-to-video task status */
  getImage2VideoStatus: protectedProcedure
    .input(z.object({ taskId: z.string().min(1).max(512) }))
    .query(async ({ input, ctx }) => {
      if (!isKlingConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Kling API is not configured on the server.',
        });
      }
      try {
        const status = await klingGetImage2VideoTask(input.taskId);
        const ref = hashKlingTaskRef(input.taskId);
        if (status.state === 'failed') {
          console.warn(`[kling] img2video failed user=${ctx.user.id} taskRef=${ref} rawStatus=${status.rawStatus}`);
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

  /** Poll image generation task status */
  getImageGenStatus: protectedProcedure
    .input(z.object({ taskId: z.string().min(1).max(512) }))
    .query(async ({ input, ctx }) => {
      if (!isKlingConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Kling API is not configured on the server.',
        });
      }
      try {
        const status = await klingGetImageGenTask(input.taskId);
        const ref = hashKlingTaskRef(input.taskId);
        if (status.state === 'failed') {
          console.warn(`[kling] imageGen failed user=${ctx.user.id} taskRef=${ref} rawStatus=${status.rawStatus}`);
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
