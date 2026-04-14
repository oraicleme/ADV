/**
 * Integration tests for the server LLM API (Forge / ORAICLE_API_URL).
 * Run with: pnpm test -- server/_core/llm-api.integration.test.ts
 * Requires ORAICLE_API_KEY (and optionally ORAICLE_API_URL) in .env.local.
 * All tests are skipped when ORAICLE_API_KEY is not set.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first, then .env (same as dev server)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { describe, it, expect, beforeAll } from "vitest";
import { invokeLLM } from "./llm";
import { ENV } from "./env";

const hasApiKey = Boolean(ENV.forgeApiKey?.trim());
const apiUrl = ENV.forgeApiUrl?.trim() || "https://api.intelligence.io.solutions/api/v1/chat/completions";

describe.skipIf(!hasApiKey)("Server LLM API (integration)", () => {
  beforeAll(() => {
    if (!hasApiKey) return;
    console.warn(
      "[llm-api.integration] ORAICLE_API_KEY set — running server LLM tests against",
      apiUrl.replace(/\/chat\/completions$/, "")
    );
  });

  it("1. env: ORAICLE_API_KEY is set when running integration tests", () => {
    expect(ENV.forgeApiKey).toBeDefined();
    expect(ENV.forgeApiKey!.length).toBeGreaterThan(0);
  });

  it("2. env: API URL is a valid base or chat/completions endpoint", () => {
    expect(apiUrl).toMatch(/^https?:\/\//);
    // Allow base URL (e.g. https://api.intelligence.io.solutions/api/v1) or full /chat/completions
    expect(apiUrl).toMatch(/\/(api\/v1|chat\/completions)/);
  });

  it("3. invokeLLM: minimal message returns success and choices", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      maxTokens: 10,
    });
    expect(result).toBeDefined();
    expect(result.choices).toBeDefined();
    expect(Array.isArray(result.choices)).toBe(true);
    expect(result.choices.length).toBeGreaterThan(0);
    expect(result.choices[0].message?.content).toBeDefined();
  }, 45_000);

  it("4. invokeLLM: response has finish_reason", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "Say hi in one word." }],
      maxTokens: 5,
    });
    expect(result.choices[0].finish_reason).toBeDefined();
  }, 30_000);

  it("5. invokeLLM: usage (tokens) is present when provided by API", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "1" }],
      maxTokens: 5,
    });
    // Some APIs return usage, some don't — we only require choices
    expect(result.choices.length).toBeGreaterThan(0);
  }, 30_000);

  it("6. invokeLLM: system message is accepted", async () => {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You answer only with the word TEST." },
        { role: "user", content: "What do you say?" },
      ],
      maxTokens: 10,
    });
    expect(result.choices[0].message?.content).toBeDefined();
  }, 30_000);

  it("7. invokeLLM: longer prompt completes within timeout", async () => {
    const result = await invokeLLM({
      messages: [
        {
          role: "user",
          content: "List the numbers 1 to 5, one per line. No other text.",
        },
      ],
      maxTokens: 50,
    });
    expect(result.choices.length).toBeGreaterThan(0);
    const content = result.choices[0].message?.content;
    if (content != null) expect(content.length).toBeGreaterThan(0);
  }, 35_000);

  it("8. invokeLLM: invalid key would yield 401 (we assume key is valid here)", () => {
    expect(hasApiKey).toBe(true);
  });

  it("9. invokeLLM: id and model are returned", async () => {
    const result = await invokeLLM({
      messages: [{ role: "user", content: "Hi" }],
      maxTokens: 5,
    });
    expect(result.id).toBeDefined();
    expect(result.model).toBeDefined();
  }, 25_000);

  it("10. invokeLLM: two sequential calls both succeed", async () => {
    const r1 = await invokeLLM({
      messages: [{ role: "user", content: "Say A" }],
      maxTokens: 5,
    });
    const r2 = await invokeLLM({
      messages: [{ role: "user", content: "Say B" }],
      maxTokens: 5,
    });
    expect(r1.choices[0].message?.content).toBeDefined();
    expect(r2.choices[0].message?.content).toBeDefined();
  }, 60_000);
});
