/**
 * STORY-186: Regression guard for Settings → Models empty-key and empty-list copy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("IonetModelsSettingsSection copy", () => {
  it("mentions Chat Workspace tools and Connections for missing key", () => {
    const file = join(import.meta.dirname, "IonetModelsSettingsSection.tsx");
    const src = readFileSync(file, "utf8");
    expect(src).toContain("Chat → Workspace tools");
    expect(src).toContain("Connections here");
  });

  it("empty list message guides refresh", () => {
    const file = join(import.meta.dirname, "IonetModelsSettingsSection.tsx");
    const src = readFileSync(file, "utf8");
    expect(src).toContain("No models returned");
  });
});
