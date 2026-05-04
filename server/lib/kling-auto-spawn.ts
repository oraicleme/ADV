/**
 * Kling Auto-Spawn: Automatically generate a video ad in the background
 * when a user selects/applies an ad concept.
 *
 * Instead of hiding video generation in the Export menu, this module
 * spawns a Kling video job immediately after design selection, so the
 * video is ready by the time the user finishes reviewing the static ad.
 */

import { ENV } from '../_core/env';
import { buildKlingPromptFromCanvas, type KlingCanvasPromptInput } from './kling-prompt';
import { isKlingConfigured, klingSubmitTextToVideo, klingGetTextToVideoTask, hashKlingTaskRef } from './kling-client';

export interface KlingAutoSpawnInput {
  /** The selected ad concept headline */
  headline: string;
  /** CTA button text */
  cta?: string;
  /** Products to feature in the video */
  products: Array<{ name: string; category?: string; brand?: string }>;
  /** Ad format label (e.g., "Instagram Story", "Facebook Feed") */
  formatLabel?: string;
  /** User's locale for language matching */
  locale?: string;
  /** User ID for logging */
  userId?: number;
}

export interface KlingAutoSpawnResult {
  /** Whether the spawn was attempted */
  spawned: boolean;
  /** Task ID from Kling (null if not spawned) */
  taskId: string | null;
  /** Reason for not spawning (if applicable) */
  reason?: string;
  /** The generated prompt (for debugging) */
  prompt?: string;
}

/**
 * Determine the best aspect ratio based on format label.
 */
function inferAspectRatio(formatLabel?: string): string {
  if (!formatLabel) return '9:16';
  const lower = formatLabel.toLowerCase();
  if (lower.includes('story') || lower.includes('reel') || lower.includes('tiktok')) return '9:16';
  if (lower.includes('feed') || lower.includes('post') || lower.includes('square')) return '1:1';
  if (lower.includes('landscape') || lower.includes('banner') || lower.includes('youtube')) return '16:9';
  return '9:16'; // Default to vertical (most social ad formats)
}

/**
 * Auto-spawn a Kling video generation job in the background.
 * This is fire-and-forget — the caller doesn't need to wait for the video.
 * Returns the taskId so the client can poll for status later.
 */
export async function autoSpawnKlingVideo(input: KlingAutoSpawnInput): Promise<KlingAutoSpawnResult> {
  // Guard: Kling must be configured
  if (!isKlingConfigured()) {
    return { spawned: false, taskId: null, reason: 'Kling API not configured (missing KLING_ACCESS_KEY/SECRET_KEY)' };
  }

  // Guard: Must have at least one product
  if (!input.products || input.products.length === 0) {
    return { spawned: false, taskId: null, reason: 'No products provided for video generation' };
  }

  // Guard: Must have a headline
  if (!input.headline || input.headline.trim().length === 0) {
    return { spawned: false, taskId: null, reason: 'No headline provided for video generation' };
  }

  try {
    // Build the prompt from canvas context
    const promptInput: KlingCanvasPromptInput = {
      products: input.products,
      headline: input.headline,
      cta: input.cta,
      formatLabel: input.formatLabel,
      locale: input.locale,
    };

    const built = buildKlingPromptFromCanvas(promptInput);
    const aspectRatio = inferAspectRatio(input.formatLabel);

    // Submit the video job
    const { taskId } = await klingSubmitTextToVideo({
      model_name: ENV.klingDefaultVideoModel,
      prompt: built.prompt,
      negative_prompt: built.negativePrompt,
      mode: 'std', // Use standard mode for auto-spawn (faster, cheaper)
      duration: '5',
      sound: 'on',
      aspect_ratio: aspectRatio,
    });

    const ref = hashKlingTaskRef(taskId);
    console.log(
      `[kling-auto-spawn] Video job submitted: taskRef=${ref} user=${input.userId ?? 'anon'} products=${built.metadata.productCount}`,
    );

    return {
      spawned: true,
      taskId,
      prompt: built.prompt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[kling-auto-spawn] Failed to submit video job:', msg);
    return { spawned: false, taskId: null, reason: `Kling submission failed: ${msg}` };
  }
}

/**
 * Check the status of an auto-spawned Kling video job.
 * Convenience wrapper for the client to poll.
 */
export async function checkAutoSpawnStatus(taskId: string) {
  if (!isKlingConfigured()) {
    return { state: 'failed' as const, reason: 'Kling not configured' };
  }
  return klingGetTextToVideoTask(taskId);
}
