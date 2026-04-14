import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

/** JSX transform for client tests that import `.tsx` components; Vitest pins older Vite types than root — runtime is compatible. */
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vitest vs root Vite major mismatch in types only
  plugins: [react()] as any,
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
    ],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.ts",
    ],
    exclude: [
      "**/*.integration.test.ts",
      "server/routers/agents.test.ts",
    ],
    // AI API integration: pnpm test:integration (10 server LLM + 10 client io.net)
  },
});
