import { describe, expect, it } from "vitest";

/**
 * Test IO.NET API connectivity and credentials
 * This validates that the IO_NET_API_TOKEN is correctly configured
 */
describe("IO.NET API Integration", () => {
  it("should connect to IO.NET API and list available models", async () => {
    const apiToken = process.env.IO_NET_API_TOKEN;
    
    if (!apiToken) {
      throw new Error("IO_NET_API_TOKEN is not set");
    }

    const response = await fetch("https://api.intelligence.io.solutions/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(Array.isArray(data) || data.data || data.models).toBeTruthy();
  });

  it("should successfully call a chat completion with IO.NET API", async () => {
    const apiToken = process.env.IO_NET_API_TOKEN;
    
    if (!apiToken) {
      throw new Error("IO_NET_API_TOKEN is not set");
    }

    const response = await fetch("https://api.intelligence.io.solutions/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-Large-Instruct-2411",
        messages: [
          {
            role: "user",
            content: "Say 'API connection successful' in exactly those words.",
          },
        ],
        max_tokens: 20,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.choices).toBeDefined();
    expect(data.choices[0].message.content).toBeDefined();
  });
});
