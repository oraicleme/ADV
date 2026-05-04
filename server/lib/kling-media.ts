/**
 * Kling Media Generation — image-to-video and image generation (Kolors).
 * Extends kling-client.ts with new endpoints for:
 *   1. Image-to-Video: Animate a static ad screenshot into a short video
 *   2. Image Generation: Generate AI backgrounds/scenes for ads
 *
 * Both are opt-in (user-triggered), never auto-spawned.
 */
import { ENV } from '../_core/env';
import { createKlingApiToken } from './kling-jwt';
import { isKlingConfigured, hashKlingTaskRef } from './kling-client';
import type { KlingJobState, KlingTaskStatusResult } from './kling-client';

export { isKlingConfigured, hashKlingTaskRef };

/* ── Shared helpers ──────────────────────────────────────────────────── */

const IMAGE2VIDEO_PATH = '/v1/videos/image2video';
const IMAGE_GEN_PATH = '/v1/images/generations';

function baseUrl(): string {
  const u = ENV.klingApiBaseUrl.trim();
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

async function authHeader(): Promise<string> {
  const token = await createKlingApiToken({
    accessKey: ENV.klingAccessKey,
    secretKey: ENV.klingSecretKey,
  });
  return `Bearer ${token}`;
}

async function klingPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: await authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, text: text.slice(0, 500) };
  }

  if (!res.ok) {
    const err = new Error(
      `Kling request failed (${res.status}): ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 800) : text.slice(0, 500)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return json;
}

async function klingGet(path: string): Promise<unknown> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: await authHeader(),
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, text: text.slice(0, 500) };
  }

  if (!res.ok) {
    const err = new Error(
      `Kling query failed (${res.status}): ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 800) : text.slice(0, 500)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return json;
}

/* ── Response parsing ────────────────────────────────────────────────── */

function extractTaskId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.task_id === 'string') return d.task_id;
  }
  if (typeof o.task_id === 'string') return o.task_id;
  return null;
}

function extractStatusString(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.task_status === 'string') return d.task_status;
  }
  if (typeof o.task_status === 'string') return o.task_status;
  return '';
}

function normalizeState(raw: string): KlingJobState {
  const s = raw.toLowerCase();
  if (!s) return 'unknown';
  if (/(success|complete|succeed|done)/i.test(s)) return 'succeeded';
  if (/(fail|error|cancel)/i.test(s)) return 'failed';
  if (/(process|pend|submit|queue|run|ing)/i.test(s)) return 'processing';
  if (/(wait|init)/i.test(s)) return 'submitted';
  return 'unknown';
}

function extractResultUrls(json: unknown): string[] {
  const urls: string[] = [];
  const pushUrl = (u: unknown) => {
    if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
  };
  if (!json || typeof json !== 'object') return urls;
  const o = json as Record<string, unknown>;
  const data = o.data;
  const scan = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    pushUrl(n.url);
    pushUrl(n.video_url);
    if (Array.isArray(n.urls)) n.urls.forEach(pushUrl);
    if (Array.isArray(n.videos)) {
      for (const v of n.videos) {
        if (v && typeof v === 'object') pushUrl((v as Record<string, unknown>).url);
      }
    }
    if (Array.isArray(n.images)) {
      for (const img of n.images) {
        if (img && typeof img === 'object') pushUrl((img as Record<string, unknown>).url);
      }
    }
    if (n.task_result && typeof n.task_result === 'object') {
      const tr = n.task_result as Record<string, unknown>;
      pushUrl(tr.url);
      if (Array.isArray(tr.videos)) {
        for (const v of tr.videos) {
          if (v && typeof v === 'object') pushUrl((v as Record<string, unknown>).url);
        }
      }
      if (Array.isArray(tr.images)) {
        for (const img of tr.images) {
          if (img && typeof img === 'object') pushUrl((img as Record<string, unknown>).url);
        }
      }
    }
  };
  scan(o);
  scan(data);
  return [...new Set(urls)];
}

function extractErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.task_status_msg === 'string' && d.task_status_msg) return d.task_status_msg;
    if (typeof d.error_message === 'string') return d.error_message;
    if (typeof d.message === 'string') return d.message;
  }
  if (typeof o.message === 'string' && (o.code as number) !== 0) return o.message;
  return undefined;
}

/* ── Image-to-Video ──────────────────────────────────────────────────── */

export type KlingImage2VideoInput = {
  /** Base64 (raw, no data: prefix) or public URL of the ad screenshot */
  image: string;
  /** Optional end-frame image (Base64 or URL) */
  imageTail?: string;
  /** Motion/animation prompt (e.g. "Smooth zoom in, products glow") */
  prompt?: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Model: default kling-v2-6 */
  modelName?: string;
  /** Duration: "5" or "10" */
  duration?: '5' | '10';
  /** Mode: "std" (cheaper) or "pro" (higher quality) */
  mode?: 'std' | 'pro';
  /** Sound generation */
  sound?: 'on' | 'off';
};

export async function klingSubmitImage2Video(
  input: KlingImage2VideoInput,
): Promise<{ taskId: string; raw: unknown }> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }

  const body: Record<string, unknown> = {
    model_name: input.modelName || ENV.klingDefaultVideoModel,
    image: input.image,
    prompt: input.prompt || 'Smooth subtle animation, professional ad motion',
    duration: input.duration || '5',
    mode: input.mode || 'std',
    sound: input.sound || 'off',
  };

  if (input.imageTail) body.image_tail = input.imageTail;
  if (input.negativePrompt) body.negative_prompt = input.negativePrompt;

  const json = await klingPost(IMAGE2VIDEO_PATH, body);
  const taskId = extractTaskId(json);
  if (!taskId) {
    throw new Error('Kling image2video: missing task_id in response');
  }
  return { taskId, raw: json };
}

export async function klingGetImage2VideoTask(taskId: string): Promise<KlingTaskStatusResult> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }
  const path = `${IMAGE2VIDEO_PATH}/${encodeURIComponent(taskId)}`;
  const json = await klingGet(path);

  const rawStatus = extractStatusString(json);
  const state = normalizeState(rawStatus);
  const resultUrls = extractResultUrls(json);
  const errorMessage = extractErrorMessage(json);

  return { state, rawStatus: rawStatus || 'unknown', resultUrls, errorMessage, raw: json };
}

/* ── Image Generation (Kolors) ───────────────────────────────────────── */

export type KlingImageGenInput = {
  /** Text prompt for image generation */
  prompt: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Reference image (Base64 or URL) for image-to-image */
  referenceImage?: string;
  /** Model: default kling-v2-1 */
  modelName?: string;
  /** Number of images to generate (1-9) */
  count?: number;
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '3:2' | '2:3';
  /** Resolution */
  resolution?: '1k' | '2k';
};

export async function klingSubmitImageGeneration(
  input: KlingImageGenInput,
): Promise<{ taskId: string; raw: unknown }> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }

  const body: Record<string, unknown> = {
    model_name: input.modelName || ENV.klingDefaultImageModel,
    prompt: input.prompt,
    n: Math.min(9, Math.max(1, input.count || 1)),
    aspect_ratio: input.aspectRatio || '1:1',
    resolution: input.resolution || '1k',
  };

  if (input.negativePrompt) body.negative_prompt = input.negativePrompt;
  if (input.referenceImage) body.image = input.referenceImage;

  const json = await klingPost(IMAGE_GEN_PATH, body);
  const taskId = extractTaskId(json);
  if (!taskId) {
    throw new Error('Kling image generation: missing task_id in response');
  }
  return { taskId, raw: json };
}

export async function klingGetImageGenTask(taskId: string): Promise<KlingTaskStatusResult> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }
  const path = `${IMAGE_GEN_PATH}/${encodeURIComponent(taskId)}`;
  const json = await klingGet(path);

  const rawStatus = extractStatusString(json);
  const state = normalizeState(rawStatus);
  const resultUrls = extractResultUrls(json);
  const errorMessage = extractErrorMessage(json);

  return { state, rawStatus: rawStatus || 'unknown', resultUrls, errorMessage, raw: json };
}
