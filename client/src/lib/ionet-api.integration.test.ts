/**
 * Integration tests for the client io.net Intelligence API (listModels, chatCompletion).
 *
 * Run: `pnpm test:integration:client-ionet` (or full `pnpm test:integration`).
 * Requires VITE_IONET_API_KEY / IO_NET_API_TOKEN in `.env.local`. Skipped when no key.
 *
 * STORY-192: Failures throw `LlmCallError` — use `formatLlmCallErrorReport(err)` for a one-line report
 * (provider, kind, model, HTTP). Default Vitest timeout for integration is 45s (`vitest.integration.config.ts`).
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const apiKey =
  process.env.VITE_IONET_API_KEY ||
  process.env.PUBLIC_IONET_API_KEY ||
  process.env.IO_NET_API_TOKEN ||
  process.env.IONET_API_KEY;
const hasKey = Boolean(apiKey?.trim());

import { describe, it, expect, beforeAll } from "vitest";
import { formatLlmCallErrorReport, isLlmCallError } from "./llm-call-error";
import { listModels, chatCompletion } from "./ionet-client";

const BASE_URL = "https://api.intelligence.io.solutions/api/v1";

describe.skipIf(!hasKey)("io.net Intelligence API (integration)", () => {
  beforeAll(() => {
    if (!hasKey) return;
    console.warn(
      "[ionet-api.integration] VITE_IONET_API_KEY set — running client io.net tests against",
      BASE_URL
    );
  });

  it("1. env: VITE_IONET_API_KEY (or fallback) is set", () => {
    expect(apiKey).toBeDefined();
    expect(apiKey!.length).toBeGreaterThan(0);
    expect(apiKey).toMatch(/^io-v2-/);
  });

  it("2. listModels: GET /models returns 200 and array of models", async () => {
    const models = await listModels(apiKey!);
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  }, 15_000);

  it("3. listModels: each model has id", async () => {
    const models = await listModels(apiKey!);
    for (const m of models) {
      expect(m.id).toBeDefined();
      expect(typeof m.id).toBe("string");
    }
  }, 15_000);

  it("4. chatCompletion: minimal message returns choices", async () => {
    const res = await chatCompletion(apiKey!, {
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Reply with: OK" }],
      max_completion_tokens: 10,
    });
    expect(res.choices).toBeDefined();
    expect(res.choices.length).toBeGreaterThan(0);
    expect(res.choices[0].message?.content).toBeDefined();
  }, 30_000);

  it("5. chatCompletion: response has finish_reason", async () => {
    const res = await chatCompletion(apiKey!, {
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say hi in one word." }],
      max_completion_tokens: 5,
    });
    expect(res.choices[0].finish_reason).toBeDefined();
  }, 25_000);

  it("6. chatCompletion: smart model (gpt-oss-120b) when available", async () => {
    const models = await listModels(apiKey!);
    const ids = models.map((m) => m.id.toLowerCase());
    const smart = ids.includes("openai/gpt-oss-120b")
      ? "openai/gpt-oss-120b"
      : "openai/gpt-oss-20b";
    const res = await chatCompletion(apiKey!, {
      model: smart,
      messages: [{ role: "user", content: "1" }],
      max_completion_tokens: 5,
    });
    expect(res.choices[0].message?.content).toBeDefined();
  }, 45_000);

  it("7. chatCompletion: system + user messages", async () => {
    const res = await chatCompletion(apiKey!, {
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You answer only with TEST." },
        { role: "user", content: "What?" },
      ],
      max_completion_tokens: 10,
    });
    expect(res.choices[0].message?.content).toBeDefined();
  }, 30_000);

  it("8. chatCompletion: invalid key yields LlmCallError (401/403)", async () => {
    try {
      await chatCompletion("invalid-key-not-io-v2", {
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "Hi" }],
        max_completion_tokens: 5,
      });
      expect.fail("expected chatCompletion to reject");
    } catch (e) {
      expect(isLlmCallError(e)).toBe(true);
      const report = formatLlmCallErrorReport(e);
      expect(report).toMatch(/HTTP (401|403)/);
    }
  });

  it("9. chatCompletion: nonexistent model yields LlmCallError with model id", async () => {
    try {
      await chatCompletion(apiKey!, {
        model: "nonexistent-model-xyz-123",
        messages: [{ role: "user", content: "Hi" }],
        max_completion_tokens: 5,
      });
      expect.fail("expected chatCompletion to reject");
    } catch (e) {
      expect(isLlmCallError(e)).toBe(true);
      if (isLlmCallError(e)) {
        expect(e.modelId).toBe("nonexistent-model-xyz-123");
      }
    }
  });

  it("10. two sequential chatCompletion calls succeed", async () => {
    const r1 = await chatCompletion(apiKey!, {
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say A" }],
      max_completion_tokens: 5,
    });
    const r2 = await chatCompletion(apiKey!, {
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Say B" }],
      max_completion_tokens: 5,
    });
    expect(r1.choices[0].message?.content).toBeDefined();
    expect(r2.choices[0].message?.content).toBeDefined();
  }, 60_000);
});
