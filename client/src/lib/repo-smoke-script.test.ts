import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** STORY-203: `pnpm run smoke` must stay defined (vitest + vite production build). */
const repoRoot = join(import.meta.dirname, "..", "..", "..");

describe("package.json smoke script", () => {
  it("runs vitest then vite build", () => {
    const raw = readFileSync(join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    const smoke = pkg.scripts?.smoke;
    expect(smoke, "scripts.smoke must be set").toBeDefined();
    expect(smoke).toMatch(/vitest\s+run/i);
    expect(smoke).toMatch(/vite\s+build/i);
  });
});
