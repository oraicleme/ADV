import { describe, it, expect } from 'vitest';

/**
 * STORY-192: No live io.net calls here — avoids flaky CI and Vitest default timeouts.
 * Real API checks: `pnpm test:integration` → `client/src/lib/ionet-api.integration.test.ts`
 * Unit coverage for HTTP client: `ionet-client.test.ts` (mocked fetch).
 */
describe('IO.NET env (unit)', () => {
  it('when VITE_IONET_API_KEY is set, it matches the io-v2- prefix', () => {
    const apiKey = import.meta.env.VITE_IONET_API_KEY;
    if (!apiKey) return;
    expect(apiKey).toMatch(/^io-v2-/);
  });
});
