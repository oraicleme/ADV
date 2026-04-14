import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Repo root: client/src/lib → ../../../ */
const repoRoot = join(import.meta.dirname, "..", "..", "..");

function trackerNextStory(): number {
  const tracker = readFileSync(join(repoRoot, "docs", "stories", "TRACKER.md"), "utf8");
  const m = tracker.match(/\*\*Next story number:\*\*\s*(\d+)/);
  if (!m) throw new Error("TRACKER.md: could not parse **Next story number:**");
  return Number(m[1]);
}

function guardianSection14NextStory(): number {
  const guardian = readFileSync(join(repoRoot, ".cursor", "rules", "guardian-agent.mdc"), "utf8");
  const start = guardian.indexOf("## 14. Current State");
  if (start === -1) throw new Error("guardian-agent.mdc: missing ## 14. Current State");
  const section = guardian.slice(start, start + 8000);
  const m = section.match(/\*\*next story number:\s*(\d+)\*\*/i);
  if (!m) {
    throw new Error(
      "guardian-agent.mdc Section 14: expected **next story number: <n>** (bold) for RAG sync",
    );
  }
  return Number(m[1]);
}

describe("Guardian RAG vs TRACKER", () => {
  it("Section 14 next story number matches TRACKER.md", () => {
    expect(guardianSection14NextStory()).toBe(trackerNextStory());
  });
});
