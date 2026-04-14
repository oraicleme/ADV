/**
 * STORY-185: Ensure embedded workspace tools scope shadcn dark tokens (see ChatWorkspaceTools.tsx).
 * File-based so we do not depend on Radix Collapsible open state in jsdom.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ChatWorkspaceTools embedded dark scope", () => {
  it("wraps Search / Agent brief / API key in .dark with data-testid", () => {
    const file = join(import.meta.dirname, "ChatWorkspaceTools.tsx");
    const src = readFileSync(file, "utf8");
    expect(src).toContain('data-testid="chat-workspace-embedded-dark"');
    expect(src).toContain("STORY-185");
    expect(src).toMatch(/className=\"[^\"]*\bdark\b[^\"]*\"/);
  });

  it("STORY-186: at-a-glance strip with role=status and data-testid", () => {
    const file = join(import.meta.dirname, "ChatWorkspaceTools.tsx");
    const src = readFileSync(file, "utf8");
    expect(src).toContain('data-testid="chat-workspace-at-glance"');
    expect(src).toContain('role="status"');
    expect(src).toContain("At a glance");
  });
});
