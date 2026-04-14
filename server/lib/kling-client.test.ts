/**
 * Kling HTTP helpers — mocked fetch, no real API keys.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../_core/env', () => ({
  ENV: {
    klingAccessKey: 'ak-test',
    klingSecretKey: 'sk-test',
    klingApiBaseUrl: 'https://api-singapore.klingai.com',
    klingDefaultVideoModel: 'kling-v2-6',
  },
}));

import { klingSubmitTextToVideo, klingGetTextToVideoTask, klingText2VideoTaskPath } from './kling-client';

describe('klingText2VideoTaskPath', () => {
  it('encodes task id for path segment', () => {
    expect(klingText2VideoTaskPath('abc-123')).toBe('/v1/videos/text2video/abc-123');
  });
});

describe('klingSubmitTextToVideo', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify({ data: { task_id: 'task-xyz' } }), { status: 200 });
      }) as typeof fetch,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = origFetch;
  });

  it('POSTs JSON and returns task id from data.task_id', async () => {
    const r = await klingSubmitTextToVideo({
      model_name: 'm',
      prompt: 'test',
    });
    expect(r.taskId).toBe('task-xyz');
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[0]).toBe('https://api-singapore.klingai.com/v1/videos/text2video');
    expect(call[1]?.method).toBe('POST');
    expect((call[1]?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});

describe('klingGetTextToVideoTask', () => {
  const origFetch = globalThis.fetch;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = origFetch;
  });

  it('GETs task path and maps succeeded status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: { task_status: 'succeed', task_result: { url: 'https://cdn.example.com/v.mp4' } },
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    );

    const r = await klingGetTextToVideoTask('tid-1');
    expect(r.state).toBe('succeeded');
    expect(r.resultUrls).toContain('https://cdn.example.com/v.mp4');
  });
});
