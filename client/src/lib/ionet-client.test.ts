import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listModels, chatCompletion } from './ionet-client';

describe('ionet-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('listModels', () => {
    it('sends GET to /models with Bearer auth', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'openai/gpt-oss-120b' }] }),
      } as Response);

      await listModels('sk-test-key');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.intelligence.io.solutions/api/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer sk-test-key' },
        })
      );
    });

    it('returns normalized model list', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'openai/gpt-oss-120b' },
              { model_id: 'Qwen/Qwen2.5-VL-32B-Instruct' },
            ],
          }),
      } as Response);

      const models = await listModels('key');
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('openai/gpt-oss-120b');
      expect(models[1].id).toBe('Qwen/Qwen2.5-VL-32B-Instruct');
    });

    it('throws on non-ok response', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(listModels('bad-key')).rejects.toThrow(/401/);
    });
  });

  describe('chatCompletion', () => {
    it('sends POST to /chat/completions with JSON body', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }],
          }),
      } as Response);

      await chatCompletion('sk-key', {
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Hello' }],
        max_completion_tokens: 100,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.intelligence.io.solutions/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-key',
          },
        })
      );
      const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string);
      expect(body.stream).toBe(false);
      expect(body.model).toBe('openai/gpt-oss-120b');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(body.max_completion_tokens).toBe(100);
    });

    it('returns choices and usage', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: { content: '{"headline":"Sale"}', role: 'assistant' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      } as Response);

      const res = await chatCompletion('key', {
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: 'Generate ad' }],
      });

      expect(res.choices[0].message.content).toBe('{"headline":"Sale"}');
      expect(res.usage?.total_tokens).toBe(15);
    });

    it('throws on API error', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      } as Response);

      await expect(
        chatCompletion('key', {
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow(/429/);
    });
  });
});
