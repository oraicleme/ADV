import { describe, expect, it } from 'vitest';
import { LlmCallError, formatLlmCallErrorReport, isLlmCallError } from './llm-call-error';

describe('LlmCallError', () => {
  it('formatLlmCallErrorReport includes provider, kind, model, HTTP', () => {
    const e = new LlmCallError({
      provider: 'io.net',
      kind: 'chat_completion',
      modelId: 'openai/x',
      httpStatus: 429,
      message: 'Too many requests',
    });
    expect(formatLlmCallErrorReport(e)).toBe(
      '[io.net] chat_completion model=openai/x HTTP 429: Too many requests',
    );
  });

  it('formatLlmCallErrorReport omits optional fields when absent', () => {
    const e = new LlmCallError({
      provider: 'io.net',
      kind: 'list_models',
      message: 'bad json',
    });
    expect(formatLlmCallErrorReport(e)).toBe('[io.net] list_models: bad json');
  });

  it('isLlmCallError distinguishes', () => {
    expect(isLlmCallError(new LlmCallError({ provider: 'io.net', kind: 'list_models', message: 'x' }))).toBe(
      true,
    );
    expect(isLlmCallError(new Error('x'))).toBe(false);
  });

  it('formatLlmCallErrorReport falls back for non-LlmError', () => {
    expect(formatLlmCallErrorReport(new Error('plain'))).toBe('plain');
    expect(formatLlmCallErrorReport(42)).toBe('42');
  });
});
