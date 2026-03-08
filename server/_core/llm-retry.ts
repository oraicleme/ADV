/**
 * LLM Retry & Timeout Utilities
 * Handles timeouts, retries with exponential backoff, and fallback strategies
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  timeoutMs: 30000, // 30 seconds per request
  backoffMultiplier: 2,
};

/**
 * Wrap a fetch request with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = Math.min(
    initialDelayMs * Math.pow(backoffMultiplier, attempt),
    maxDelayMs
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if it's a client error (4xx) or timeout
      if (
        lastError.message.includes("Request timeout") ||
        lastError.message.includes("AbortError")
      ) {
        console.warn(
          `[LLM Retry] Timeout on attempt ${attempt + 1}/${opts.maxRetries + 1}`
        );
      } else {
        console.warn(
          `[LLM Retry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed:`,
          lastError.message
        );
      }

      if (attempt < opts.maxRetries) {
        const delayMs = calculateBackoffDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );
        console.log(`[LLM Retry] Waiting ${Math.round(delayMs)}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`
  );
}

/**
 * Circuit breaker for LLM calls
 */
export class LLMCircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private resetTimeoutMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        console.log("[CircuitBreaker] Transitioning to half-open state");
        this.state = "half-open";
        this.successCount = 0;
      } else {
        throw new Error(
          "Circuit breaker is open - LLM service temporarily unavailable"
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === "half-open") {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          console.log("[CircuitBreaker] Transitioning to closed state");
          this.state = "closed";
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        console.error(
          `[CircuitBreaker] Failure threshold reached (${this.failureCount}/${this.failureThreshold}), opening circuit`
        );
        this.state = "open";
      }

      throw error;
    }
  }

  getState(): string {
    return `${this.state} (failures: ${this.failureCount}/${this.failureThreshold})`;
  }
}

// Global circuit breaker instance
export const llmCircuitBreaker = new LLMCircuitBreaker(5, 2, 60000);
