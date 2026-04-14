# Technical status & Guardian review — Oraicle Retail Promo (root app)

**Date:** 2026-03-23  
**Audience:** Senior engineers, AI coding agents, PM/tech leads validating direction  
**Scope:** Root app `oraicle-retail-promo` at repo root (not `packages/*` workspaces).  
**Authoritative IDs:** `docs/stories/TRACKER.md` (**next story number: 205**). Deferred / not-built: **`docs/deferred-features-registry.md`** (also **`docs/system-overview-vc.md`** § Operations — STORY-204). Smoke gate: **`pnpm run smoke`** (STORY-203).

---

## 1. Executive summary

| Area | State |
|------|--------|
| **Search roadmap (STORY-196 → STORY-201)** | **Shipped** in code + tests + docs. |
| **Investor / VC doc alignment (STORY-202)** | **Shipped** (`docs/system-overview-vc.md` v2.1, handoff dev-auth note, `vc-system-overview-doc.test.ts`). |
| **Deferred search work** | **Faza C** in `docs/search-rules-rag-roadmap.md` — server-side / indexed rules (Meilisearch or embeddings), **not** implemented. |
| **Tracker backlog** | **STORY-93–97** remain aspirational (older roadmap rows); **not** in active sprint. |
| **Parked stories** | **98, 99, 100, 103, 114–117, 126** — superseded by workspace chat (**183+**) unless PM reopens. |
| **Automated health (this review)** | `pnpm test`: **91 files, 999 passed, 1 skipped**; `pnpm exec vite build`: **success**. |
| **Guardian RAG sync** | `client/src/lib/guardian-rag-tracker-sync.test.ts`: **TRACKER.md** `**Next story number:**` must match **Section 14** of `.cursor/rules/guardian-agent.mdc`. |

**Direction check:** Shipping **196–201** plus **RAG-lite (client PoC)** and **deferring Faza C** is consistent with the documented roadmap: lexical similarity without a new server index, explicit opt-in, O(n) rules cost, and a written path for a future rule index if multilingual/paraphrase policies are required (`docs/search-rules-rag-roadmap.md` § Faza C vs § “Odbijanje punog vektorskog RAG-a”).

---

## 2. Guardian protocol — what was executed

Per `.cursor/rules/guardian-agent.mdc`:

1. **Tracker vs Section 14** — Next story id **203** is consistent between `docs/stories/TRACKER.md` and Section 14 after corrections (see §7).  
2. **Test health** — Full Vitest + Vite production build run successfully (timestamp of this document).  
3. **Doc drift guards** — `vc-system-overview-doc.test.ts` locks VC doc phrases; `guardian-rag-tracker-sync.test.ts` locks tracker ↔ guardian.  
4. **Issues found during review** — Duplicate/corrupt lines at end of `guardian-agent.mdc` **Packages** subsection (fixed). Stale “next id **202**” in Section 14 handoff bullet (fixed to **203**). `TRACKER.md` Parked note said “schedule ahead of **202+**” (fixed to **203+**). `docs/search-improvements-roadmap.md` tracker footer referenced old next id (aligned to “see tracker header”).

---

## 3. Done work — technical detail (retail-promo, recent)

### 3.1 Search pipeline (STORY-196 — STORY-201)

| Story | Technical delivery |
|-------|---------------------|
| **196** | `search-rules-storage.ts` — persisted rules (`queryPattern`, `productKey`, `action`). `apply-search-rules.ts` — **exact** match post-processing on manual indices and Stage-1 hits. UI: `SearchSettingsSection.tsx`. |
| **197** | `normalize-search-query.ts` — shared normalization for manual vs agent paths; matrix documented in `docs/search-architecture-technical-hr.md`. Server-backed manual Meilisearch **not** implemented (by design in story). |
| **198** | Optional LLM Stage-1 expansion: server `server/lib/expand-search-query-stage1.ts`, gates `STAGE1_QUERY_EXPANSION` + client `VITE_STAGE1_QUERY_EXPANSION`. |
| **199** | Hybrid routing: `meilisearch-smart-routing.ts` — `shouldSkipSelectProductsLLM`, `catalog.getSearchProvider`, confidence threshold; settings copy in Search UI. |
| **200** | `search-feedback.ts` — implicit (deselect) + explicit (thumbs) events; draft rule suggestion toward STORY-196. |
| **201** | **RAG-lite (client PoC):** `search-rules-rag-lite.ts` — token Jaccard + substring bonus; `search-rules-rag-lite-settings.ts` — `localStorage` key `oraicle-search-rules-rag-lite-v1`, event `SEARCH_RULES_RAG_LITE_CHANGED_EVENT`; `apply-search-rules.ts` merges **exact ∪ semantic** when enabled; `SearchSettingsSection.tsx` checkbox “Similar query matching (STORY-201)”; `ProductDataInput.tsx` listens for toggle to refilter. Tests: `search-rules-rag-lite.test.ts`, `search-rules-rag-lite-settings.test.ts`, extended `apply-search-rules.test.ts`. **Phased future work:** `docs/search-rules-rag-roadmap.md` **Faza C** (not built). |

**Primary references:**  
`docs/search-architecture-technical-hr.md` · `docs/search-improvements-roadmap.md` · `docs/search-rules-rag-roadmap.md`

### 3.2 STORY-202 (documentation & guards)

| Item | Detail |
|------|--------|
| VC overview | `docs/system-overview-vc.md` v2.1 — architecture row, roadmap §5 search bullet (196/200/201 + links), key file map row for search/rules modules. |
| Handoff | `docs/handoff-new-agent-2026-03-21.md` — **Dev session / auth** subsection (`[Auth] Missing session cookie` expected in dev without login); next id **203**. |
| Tests | `client/src/lib/vc-system-overview-doc.test.ts` — asserts presence of `docs/search-architecture-technical-hr.md`, `docs/search-rules-rag-roadmap.md`, STORY-196/201, `apply-search-rules.ts`, `search-rules-rag-lite.ts`. |

### 3.3 Workspace / agent (context for “what’s already there”)

- **183–187:** `ChatWorkspaceTools.tsx`, `.dark` embed, at-a-glance, collapsible a11y tests.  
- **189–195:** Starters, empty-actions telemetry, LLM errors, import respects search, Products tab seed from `catalog_filter`, `AGENT_SEARCH_ARCHITECTURE_PROMPT`.  
- **Settings storage modules (client):** `llm-api-key-storage.ts`, `search-settings-storage.ts`, `search-rules-rag-lite-settings.ts`, `catalog-api-settings-storage.ts`, `agent-brief-storage.ts`, `design-defaults-storage.ts`, `ionet-model-preferences-storage.ts`.

---

## 4. Undone / deferred / backlog

### 4.1 Search — Faza C (explicitly deferred)

From `docs/search-rules-rag-roadmap.md`:

- **Separate rule index** (Meilisearch `search_rules` or embedding index over rule text).  
- Hypothetical **`server/lib/search-rules-index.ts`** — ingest when rules become server-side.  
- **`server/routers/catalog.ts`** — e.g. `retrieveRulesForQuery` (BM25 + vector).  
- **Merge point** — context for `selectProducts` or Stage-1 filter (tenant-specific design).

**Why defer:** PoC (Faza B) is **O(n) rules**, no network, browser-local; Faza C adds ops (reindex, versioning) and is only justified if policies need **multilingual / paraphrase** beyond token overlap.

### 4.2 STORY-197 optional gap

- **Server-backed manual search** (same Meilisearch as agent) — **not** implemented; documented as intentional tradeoff (latency, offline, no extra tRPC load).

### 4.3 Tracker **Legacy aspirational** (93–97) — triaged STORY-203

**Not** active backlog. Rows live under **`docs/stories/TRACKER.md` → “Legacy aspirational”** with explanation. See **`docs/deferred-features-registry.md` §3**.

### 4.4 **Parked (legacy)** — do not treat as sprint unless PM reopens

98, 99, 100, 103, 114, 115, 116, 117, 126 — see `docs/stories/TRACKER.md` **🟦 Parked**.

### 4.5 Handoff Phase A (stability) — STORY-203

From `docs/handoff-new-agent-2026-03-21.md`:

| Item | Status |
|------|--------|
| Guardian Section 14 refresh | Ongoing; Vitest sync test enforces next id. |
| Automated smoke | **`pnpm run smoke`** — `vitest run && vite build`. |
| Manual browser smoke | **`docs/qa-manual-smoke-retail-promo.md`** checklist. |
| Flaky tests (product-index perf) | **Budgets widened** (`BUILD_MS` 3500, `QUERY_MS` 1200) for WSL/CI. |
| Dev OAuth/session docs | **STORY-202** + handoff. |
| Playwright / E2E in CI | **Still optional** — not added; manual QA doc is the formal human gate. |

### 4.6 Packages / monorepo

- Root has **no** `pnpm-workspace` — `packages/` apps (landing, control-panel, …) are **separate**; active retail-promo work is **root** client/server.

---

## 5. Automation matrix

| Test / gate | Role |
|-------------|------|
| `pnpm test` (vitest) | Full unit/integration suite — **999 passed**, **1 skipped** (at time of review). |
| `pnpm exec vite build` | Client production bundle gate. |
| `guardian-rag-tracker-sync.test.ts` | Fails if `TRACKER.md` next id ≠ Guardian §14 `**next story number:**`. |
| `vc-system-overview-doc.test.ts` | Fails if VC overview drops key search links or STORY markers. |

---

## 6. Environment variables (search-related, non-exhaustive)

| Variable | Purpose |
|----------|---------|
| `STAGE1_QUERY_EXPANSION` | Server gate for STORY-198 LLM sub-queries before Stage-1. |
| `VITE_STAGE1_QUERY_EXPANSION` | Client bundle must see `1` to enable UI path alignment (rebuild Vite after change). |
| Meilisearch / hybrid | See `server/_core/env.ts` and `docs/search-architecture-technical-hr.md` — confidence thresholds, embedder, etc. |

---

## 7. Issues found & resolution (this Guardian pass)

| Issue | Severity | Resolution |
|-------|----------|------------|
| `guardian-agent.mdc` duplicate lines under **Packages (when in use)** | **High** (RAG corruption / confusing agents) | Removed stray `tail Promo Designer...` fragment and duplicate Control-panel block. |
| Section 14 “next id **202**” in handoff queue bullet | **Medium** (contradicts TRACKER **203**) | Updated to **203**. |
| `TRACKER.md` Parked “**202+**” | **Low** | Updated to **203+**. |
| `search-improvements-roadmap.md` footer “sljedeći id **202**” | **Low** | Updated to point at tracker header (dynamic). |
| Guardian §14 “Done” list missing **STORY-202** | **Low** | Added **STORY-202** bullet in Stories & tracker snapshot. |

---

## 8. Recommendations for senior / AI review

1. **Confirm product stance on Faza C** — Accept deferred server-side rule index until scale or multilingual needs appear; otherwise schedule **STORY-203+** with explicit SLOs (latency, consistency with `localStorage` rules).  
2. **E2E coverage** — If release quality depends on chat + models + workspace tools, add a minimal Playwright/Cypress smoke or document manual QA as gate.  
3. **Flaky test audit** — Run `pnpm test` repeatedly or use vitest `--reporter=verbose` on suspected files (`product-index` mentioned in handoff).  
4. **Single source of truth** — Keep `TRACKER.md` header as canonical next id; any doc stating a number should say “see TRACKER” or be updated in the same PR as tracker changes.  
5. **Parked stories** — Before pulling 98–126 into sprint, diff intent against **183+** implementation to avoid duplicate work.

---

## 9. File index (this review)

| File | Relevance |
|------|-----------|
| `docs/stories/TRACKER.md` | Next id, Done/Pending/Parked tables. |
| `.cursor/rules/guardian-agent.mdc` | Full protocol + §14 snapshot (must stay sync’d). |
| `docs/search-architecture-technical-hr.md` | Manual vs AI search matrix, STORY references. |
| `docs/search-rules-rag-roadmap.md` | Faza A/B/C module list and data flow. |
| `docs/system-overview-vc.md` | Investor-facing summary (v2.1). |
| `docs/handoff-new-agent-2026-03-21.md` | Sprint phases, dev auth, health commands. |

---

*This document is a point-in-time audit. Re-run tests and re-read `TRACKER.md` after merges.*
