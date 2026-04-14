/**
 * STORY-192: io.net client — no real network; fetch is mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listModels, chatCompletion } from './ionet-client';
import { isLlmCallError } from './llm-call-error';

function jsonResponse(data: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as Response;
}

describe('ionet-client (mocked fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listModels: returns normalized models on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        data: [{ id: 'openai/gpt-oss-20b', object: 'model' }],
      }),
    );
    const models = await listModels('test-key');
    expect(models).toHaveLength(1);
    expect(models[0]!.id).toBe('openai/gpt-oss-20b');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://api.intelligence.io.solutions/api/v1/models',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('listModels: throws LlmCallError on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
      json: async () => ({}),
    } as Response);

    await expect(listModels('bad-key')).rejects.toSatisfy(
      (e: unknown) => isLlmCallError(e) && e.httpStatus === 401 && e.kind === 'list_models',
    );
  });

  it('listModels: throws LlmCallError on invalid JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad');
      },
      text: async () => 'not json',
    } as Response);

    await expect(listModels('k')).rejects.toMatchObject({
      kind: 'list_models',
      provider: 'io.net',
    });
  });

  it('chatCompletion: returns parsed body on 200', async () => {
    const body = {
      choices: [
        {
          message: { content: 'OK', role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));

    const res = await chatCompletion('k', {
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.choices[0]!.message.content).toBe('OK');
  });

  it('chatCompletion: LlmCallError includes model id on failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    } as Response);

    await expect(
      chatCompletion('k', {
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'x' }],
      }),
    ).rejects.toMatchObject({
      kind: 'chat_completion',
      modelId: 'openai/gpt-oss-120b',
      httpStatus: 503,
    });
  });

  it('chatCompletion: network/timeout wrapped as LlmCallError', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('io.net request to … timed out after 60000ms'));

    await expect(
      chatCompletion('k', {
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
      }),
    ).rejects.toMatchObject({
      kind: 'chat_completion',
      modelId: 'm',
    });
  });
});
