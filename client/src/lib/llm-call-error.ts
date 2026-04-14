/**
 * Structured errors for LLM HTTP calls (client-side).
 * STORY-192: io.net first; future providers reuse the same shape (provider + kind + optional modelId).
 */

export type LlmProviderId = 'io.net';

/** What the app was doing when the provider failed. */
export type LlmCallKind = 'list_models' | 'chat_completion';

export class LlmCallError extends Error {
  override readonly name = 'LlmCallError';

  readonly provider: LlmProviderId;

  readonly kind: LlmCallKind;

  /** Chat completion target model id (e.g. openai/gpt-oss-120b). */
  readonly modelId?: string;

  readonly httpStatus?: number;

  constructor(params: {
    provider: LlmProviderId;
    kind: LlmCallKind;
    message: string;
    modelId?: string;
    httpStatus?: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.provider = params.provider;
    this.kind = params.kind;
    this.modelId = params.modelId;
    this.httpStatus = params.httpStatus;
    if (params.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = params.cause;
    }
  }
}

export function isLlmCallError(e: unknown): e is LlmCallError {
  return e instanceof LlmCallError;
}

/**
 * One-line report for console, session logs, or UI (no raw request bodies).
 */
export function formatLlmCallErrorReport(e: unknown): string {
  if (isLlmCallError(e)) {
    const parts = [
      `[${e.provider}]`,
      e.kind,
      e.modelId ? `model=${e.modelId}` : null,
      e.httpStatus != null ? `HTTP ${e.httpStatus}` : null,
    ].filter(Boolean);
    return `${parts.join(' ')}: ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
