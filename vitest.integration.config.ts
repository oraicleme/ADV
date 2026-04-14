import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    /** io.net / LLM calls can exceed 5s — STORY-192 */
    testTimeout: 45_000,
    environment: "node",
    environmentMatchGlobs: [["client/**", "jsdom"]],
    include: [
      "server/**/*.integration.test.ts",
      "client/**/*.integration.test.ts",
    ],
    exclude: ["server/routers/agents.test.ts"],
  },
});
