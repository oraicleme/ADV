import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** STORY-202 / STORY-204: VC doc must stay aligned with search stack + ops/deferred links. */
const repoRoot = join(import.meta.dirname, "..", "..", "..");

function vcOverviewMd(): string {
  return readFileSync(join(repoRoot, "docs", "system-overview-vc.md"), "utf8");
}

describe("docs/system-overview-vc.md", () => {
  it("mentions search architecture and phased RAG roadmap", () => {
    const md = vcOverviewMd();
    expect(md).toContain("docs/search-architecture-technical-hr.md");
    expect(md).toContain("docs/search-rules-rag-roadmap.md");
  });

  it("mentions STORY-196 rules and STORY-201 RAG-lite", () => {
    const md = vcOverviewMd();
    expect(md).toContain("STORY-196");
    expect(md).toContain("STORY-201");
    expect(md).toMatch(/RAG-lite|RAG‑lite/);
  });

  it("lists core search/rule modules in the file map", () => {
    const md = vcOverviewMd();
    expect(md).toContain("apply-search-rules.ts");
    expect(md).toContain("search-rules-rag-lite.ts");
  });

  it("links operations smoke, manual QA, and deferred-features registry", () => {
    const md = vcOverviewMd();
    expect(md).toContain("pnpm run smoke");
    expect(md).toContain("docs/qa-manual-smoke-retail-promo.md");
    expect(md).toContain("docs/deferred-features-registry.md");
  });
});
