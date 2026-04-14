/**
 * Kling HTTP client — server-only. Proxies to api-singapore.klingai.com (or KLING_API_BASE_URL).
 * Does not log secrets or full prompts in production paths (use hashed task refs only).
 */
import { createHash } from 'node:crypto';
import { ENV } from '../_core/env';
import { createKlingApiToken } from './kling-jwt';

export const KLING_TEXT2VIDEO_PATH = '/v1/videos/text2video';

/** Official docs: query single task by id in path (text-to-video resource). */
export function klingText2VideoTaskPath(taskId: string): string {
  const id = encodeURIComponent(taskId);
  return `${KLING_TEXT2VIDEO_PATH}/${id}`;
}

export function hashKlingTaskRef(taskId: string): string {
  return createHash('sha256').update(taskId, 'utf8').digest('hex').slice(0, 16);
}

function baseUrl(): string {
  const u = ENV.klingApiBaseUrl.trim();
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

export function isKlingConfigured(): boolean {
  return Boolean(ENV.klingAccessKey.trim() && ENV.klingSecretKey.trim());
}

async function authHeader(): Promise<string> {
  const token = await createKlingApiToken({
    accessKey: ENV.klingAccessKey,
    secretKey: ENV.klingSecretKey,
  });
  return `Bearer ${token}`;
}

export type KlingSubmitTextToVideoBody = {
  model_name: string;
  prompt: string;
  negative_prompt?: string;
  mode?: 'std' | 'pro';
  duration?: string;
  sound?: string;
  aspect_ratio?: string;
  callback_url?: string;
  external_task_id?: string;
};

export async function klingSubmitTextToVideo(
  body: KlingSubmitTextToVideoBody,
): Promise<{ taskId: string; raw: unknown }> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }
  const url = `${baseUrl()}${KLING_TEXT2VIDEO_PATH}`;
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
      `Kling text2video failed (${res.status}): ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 800) : text.slice(0, 500)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const taskId = extractTaskId(json);
  if (!taskId) {
    throw new Error('Kling text2video: missing task_id in response');
  }
  return { taskId, raw: json };
}

export type KlingJobState = 'submitted' | 'processing' | 'succeeded' | 'failed' | 'unknown';

export type KlingTaskStatusResult = {
  state: KlingJobState;
  rawStatus: string;
  resultUrls: string[];
  errorMessage?: string;
  raw: unknown;
};

function extractTaskId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.task_id === 'string') return d.task_id;
    if (typeof d.taskId === 'string') return d.taskId;
  }
  if (typeof o.task_id === 'string') return o.task_id;
  if (typeof o.taskId === 'string') return o.taskId;
  return null;
}

function extractStatusString(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.task_status === 'string') return d.task_status;
    if (typeof d.status === 'string') return d.status;
    if (typeof d.state === 'string') return d.state;
  }
  if (typeof o.task_status === 'string') return o.task_status;
  if (typeof o.status === 'string') return o.status;
  return '';
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
    if (n.task_result && typeof n.task_result === 'object') {
      const tr = n.task_result as Record<string, unknown>;
      pushUrl(tr.url);
      if (Array.isArray(tr.videos)) tr.videos.forEach(pushUrl);
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
    if (typeof d.error_message === 'string') return d.error_message;
    if (typeof d.message === 'string') return d.message;
  }
  if (typeof o.message === 'string') return o.message;
  return undefined;
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

export async function klingGetTextToVideoTask(taskId: string): Promise<KlingTaskStatusResult> {
  if (!isKlingConfigured()) {
    throw new Error('Kling API is not configured');
  }
  const url = `${baseUrl()}${klingText2VideoTaskPath(taskId)}`;
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
      `Kling task query failed (${res.status}): ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 800) : text.slice(0, 500)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const rawStatus = extractStatusString(json);
  const state = normalizeState(rawStatus);
  const resultUrls = extractResultUrls(json);
  const errorMessage = extractErrorMessage(json);

  return {
    state,
    rawStatus: rawStatus || 'unknown',
    resultUrls,
    errorMessage,
    raw: json,
  };
}
