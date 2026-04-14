/**
 * Thin OpenAI-compatible client for io.net Intelligence API.
 * Base: https://api.intelligence.io.solutions/api/v1
 * Auth: Authorization: Bearer <key>
 *
 * STORY-192: Failures throw {@link LlmCallError} with provider/kind/model for reports and future non–io.net backends.
 */

import { LlmCallError } from './llm-call-error';

const BASE_URL = 'https://api.intelligence.io.solutions/api/v1';
const MODELS_TIMEOUT_MS = 30_000;
const CHAT_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs, ...rest } = init;
  const ms = timeoutMs ?? 30_000;

  // Older runtimes may not support AbortController; fall back to plain fetch.
  if (typeof AbortController === 'undefined' || !ms) {
    // eslint-disable-next-line no-restricted-globals
    return fetch(url, rest);
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);

  try {
    // eslint-disable-next-line no-restricted-globals
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') {
      throw new Error(`io.net request to ${url} timed out after ${ms}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export interface IonetModel {
  id: string;
  /** Optional; some APIs return object with different shape */
  object?: string;
  owned_by?: string;
  [key: string]: unknown;
}

export interface ListModelsResponse {
  object?: string;
  data: IonetModel[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id?: string;
  object?: string;
  choices: Array<{
    index?: number;
    message: { content: string; role?: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * List available models from io.net Intelligence API.
 * Use this to verify which reasoning and vision models are available.
 */
export async function listModels(apiKey: string): Promise<IonetModel[]> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeoutMs: MODELS_TIMEOUT_MS,
    });
  } catch (e) {
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'list_models',
      message: e instanceof Error ? e.message : String(e),
      cause: e,
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'list_models',
      message: text.slice(0, 500),
      httpStatus: res.status,
    });
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch (error) {
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'list_models',
      message: `JSON parse error: ${(error as Error).message ?? String(error)}`,
      cause: error,
    });
  }

  const data = parsed as ListModelsResponse;
  const list = data.data ?? [];
  return list.map((m) => ({
    ...m,
    id: (m as { id?: string; model_id?: string }).id ?? (m as { model_id?: string }).model_id ?? String(m),
  }));
}

/**
 * Call chat completions (text or vision). For vision, pass content as array
 * with type "image_url" and image_url.url as data URI (e.g. data:image/jpeg;base64,...).
 */
export async function chatCompletion(
  apiKey: string,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const modelId = request.model;

  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ stream: false, ...request }),
      timeoutMs: CHAT_TIMEOUT_MS,
    });
  } catch (e) {
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'chat_completion',
      modelId,
      message: e instanceof Error ? e.message : String(e),
      cause: e,
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'chat_completion',
      modelId,
      message: text.slice(0, 500),
      httpStatus: res.status,
    });
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch (error) {
    throw new LlmCallError({
      provider: 'io.net',
      kind: 'chat_completion',
      modelId,
      message: `JSON parse error: ${(error as Error).message ?? String(error)}`,
      cause: error,
    });
  }

  return parsed as ChatCompletionResponse;
}
