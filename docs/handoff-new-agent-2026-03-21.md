# Handoff: New Agent — Oraicle Retail Promo (March 2026)

Use this document when starting a **fresh chat** so context fits in memory. It follows the **Guardian Agent Protocol** (`.cursor/rules/guardian-agent.mdc`): read tracker → health checks → audit → next steps.

**Multi-agent coordination (share with other agents):** `docs/agent-multi-agent-context.md` — repo purpose, stack, LLM split, tracker rules, key paths.

---

## 1. Project snapshot (root app)

| Item | Value |
|------|--------|
| **Primary app** | `oraicle-retail-promo` at repo root — **not** `packages/` workspace |
| **Stack** | Vite 7 + React 19, Express + tRPC 11, MySQL (Drizzle) |
| **Dev** | `pnpm dev` → `http://localhost:3000` |
| **Retail Promo entry** | `/agents/retail-promo` → `AgentChat.tsx` + `AdCanvasEditor.tsx` |
| **Stories** | `docs/stories/STORY-*.md`, tracker `docs/stories/TRACKER.md` |
| **Next story #** | **Always read `docs/stories/TRACKER.md` header** (e.g. **210** as of last edit — do not trust a stale number here). |
| **What to pick up first** | **Not** the old “In Progress” rows (98–117, 126) — those are **Parked (legacy)** in `TRACKER.md`. Current priorities: **Phase A** below, then **new stories** at the tracker’s next id. Deferred / not-built features: **`docs/deferred-features-registry.md`** (also summarized in **`docs/system-overview-vc.md`** § Operations). |

**Important:** Guardian RAG **Section 14** must match **`docs/stories/TRACKER.md`** on **next story number** — Vitest `client/src/lib/guardian-rag-tracker-sync.test.ts` enforces this. **Search roadmap (done 196–201):** rules, normalization, Stage-1 expansion, hybrid routing, **STORY-200** feedback (`search-feedback.ts`, session log events, ProductTable thumbs), **STORY-201** RAG-lite (`search-rules-rag-lite.ts`, opt-in in Search settings). See `docs/search-improvements-roadmap.md`, **`docs/search-rules-rag-roadmap.md`**, and baseline `docs/search-architecture-technical-hr.md`.

### STORY-198 — optional LLM query expansion (dev)

Off by default (no extra LLM cost). To exercise in dev:

1. **`STAGE1_QUERY_EXPANSION=1`** in root `.env.local` (server gate).
2. **`VITE_STAGE1_QUERY_EXPANSION=1`** in `.env.local` (client must rebuild / restart Vite so the bundle sees it).
3. Server **LLM key** configured (`IO_NET_API_TOKEN` / `ORAICLE_API_KEY` / etc. — same as `selectProducts`).

Then agent `catalog_filter` Stage-1 merges LLM sub-queries ahead of deterministic `buildExpandedSearchQueries` (cap 8 sub-queries). See `server/lib/expand-search-query-stage1.ts` and `AgentChat` STORY-198 block.

### Dev session / auth (expected)

- **`[Auth] Missing session cookie`** in the server terminal or browser when you use the app **without logging in** is **normal** in local dev. Retail Promo UI and many flows still work for demos and frontend work. Use OAuth/login only when testing authenticated paths.

---

## 2. Guardian health checks (run when reviewing)

```bash
cd /home/tru/oraicle
pnpm test                    # or: pnpm exec vitest run
pnpm exec vite build         # client bundle
pnpm run smoke               # STORY-203: vitest run && vite build (one gate)
```

Server `tsc` may report unrelated issues (e.g. Meilisearch typings); client `vite build` is the practical gate for UI work. Prefer **`pnpm run smoke`** before release or large merges.

---

## 3. Recent product work (context)

| Story | Topic |
|-------|--------|
| STORY-181 | Products tab search synced with Add Products + MiniSearch |
| STORY-182 | Manual catalog search: minScore fallback so 0 rows do not happen when BM25 scores are below slider |
| STORY-183 | **Chat:** collapsible **Workspace tools** (search sliders, agent brief, BYOK); **Fast / Smart / Custom** model toggle; **Settings → Models** (full io.net `listModels` + tags); **Settings → Prompts** (copyable merged system prompts) |
| STORY-185–187 | **185:** `.dark` scope for embedded settings in chat. **186:** **At a glance** strip (catalog API + design defaults summary); Models list copy (Chat + Connections for API key). **187:** Chat workspace collapsible **a11y** (`aria-expanded`, focus-visible — see `STORY-187-chat-workspace-collapsible-a11y.md`). |

**Key files:** `client/src/components/ChatWorkspaceTools.tsx`, `client/src/lib/workspace-tools-at-glance.ts`, `IonetModelsSettingsSection.tsx`, `PromptInspectorSection.tsx`, `client/src/lib/ionet-model-preferences-storage.ts`, `client/src/lib/agent-chat-engine.ts` (`modelPair`, `ChatModelMode` includes `custom`).

---

## 4. Internal browser verification (industry-style UX)

**Date:** 2026-03-21 · **URL:** `http://localhost:3000/agents/retail-promo`

| Check | Result |
|-------|--------|
| Chat tab shows **Workspace tools** (collapsible) | Yes — progressive disclosure, avoids two competing chat surfaces |
| Shortcuts **Import / Design defaults / Models / Prompts** | Yes — deep-link to Settings accordion |
| **Fast · Smart · Custom** in header | Yes — matches “preset + advanced” patterns (e.g. IDE quality tiers) |
| Expanded workspace shows Search sliders, Agent brief, API key | Yes — same building blocks as Settings, consistent copy |
| Settings tab lists **Connections, Models, Import, Search, Agent, Design defaults, Prompts** | Yes — logical order (key → models → data → tuning → prompts) |

**Gaps / polish (roadmap candidates):**

- **Mixed theme:** Workspace tools wrap light-themed form components in a dark chat strip — acceptable but not pixel-perfect “one design system”; consider shared tokens or a `variant="dark"` for settings sections in chat.
- **Discoverability:** “Workspace tools” is collapsed by default — good for novices; consider a one-time tooltip or “New” badge after releases.
- **Accessibility:** **STORY-187** locks `aria-expanded` / `data-state` + focus-visible on Workspace tools (`ChatWorkspaceTools.a11y.test.ts`); full WCAG audit still optional.
- **Guardian doc:** Refresh Section 14 + io.net model defaults if `ionet-models.ts` vs `agent-chat-engine` CHAT pairs diverge (two sources of truth).

Overall: **aligned with common SaaS patterns** — primary task (chat) first, advanced controls collapsed, presets + custom, settings mirror for power users.

---

## 4b. LLM / io.net model layout — **why there are multiple “defaults”** (March 2026)

The product talks to **io.net Intelligence** (`ORAICLE_API_URL` / `https://api.intelligence.io.solutions/api/v1`) from **more than one place**. They are **intentionally separate** so we can tune cost/latency per feature.

| Concern | Where it runs | How the model is chosen | Primary code |
|--------|----------------|-------------------------|--------------|
| **Agent chat** (conversation, canvas JSON actions, proactive suggestions) | **Browser** | Presets **Fast / Smart / Custom** in chat header; `Custom` uses `ionet-model-preferences-storage` | `client/src/lib/agent-chat-engine.ts` → `CHAT_MODEL_PAIR_BY_MODE`; `invokeLLM` path is **`client/src/lib/ionet-client.ts`** `chatCompletion()` |
| **Stage-2 product selection** (`selectProducts`) | **Server** (tRPC) | **`ENV.llmModel`** from env — **not** the chat presets | `server/_core/env.ts` (`ORAICLE_LLM_MODEL` → `IONET_LLM_MODEL` → default `mistralai/Mistral-Nemo-Instruct-2407`); **`server/routers/catalog.ts`** `selectProducts` → `server/_core/llm.ts` `invokeLLM` |
| **Ad copy / canvas AI edit** (non-chat bar) | **Browser** | `client/src/lib/ionet-models.ts` (`getAdCopyModels()` …) + optional **`PUBLIC_IONET_AD_COPY_MODEL`** | Same `ionet-client` as chat |

**What we changed recently (STORY-207):** In agent chat, **`openai/gpt-oss-20b`** was replaced with **`meta-llama/Llama-3.3-70B-Instruct`** as the **Fast primary** and **Smart fallback** (paired with **`openai/gpt-oss-120b`** on the other slot). **Reason:** stronger model for the same io.net API surface, without changing request shape.

**Why `selectProducts` logs still showed `gpt-oss-120b` before:** Server reads **`ORAICLE_LLM_MODEL` / `IONET_LLM_MODEL`** in `.env.local`. If those point at `openai/gpt-oss-120b`, **selectProducts** uses that — independent of chat presets. To align server LLM with Llama, set both to `meta-llama/Llama-3.3-70B-Instruct` and **restart the dev server** (dotenv loads at process start).

**Operational rule:** After changing **client** chat models, no server restart is needed. After changing **server** env LLM, restart **`pnpm dev`**.

---

## 5. Roadmap (suggested phases)

### Phase A — Stability & quality

1. ~~**Refresh Guardian RAG Section 14**~~ — ongoing with each story; Vitest **`guardian-rag-tracker-sync.test.ts`** enforces next id.
2. **Automated smoke gate:** **`pnpm run smoke`** — runs `vitest run && vite build` (same practical bar as CI: unit tests + production client bundle). **STORY-203.**
3. **Manual browser smoke:** **`docs/qa-manual-smoke-retail-promo.md`** — checklist after automated smoke passes.
4. **Flaky tests:** **`product-index.test.ts`** performance budgets widened for WSL/CI (STORY-203); re-run `pnpm test` if you still see flakes.
5. ~~**OAuth / session**~~ — documented under **Dev session / auth** above + STORY-202.

### Phase B — UX polish (STORY-184+)

1. ~~Dark-theme variants for **SearchSettingsSection** / **AgentBriefSection** when embedded in chat~~ — **STORY-185:** `.dark` scope on `ChatWorkspaceTools` embedded card (shadcn tokens; `data-testid="chat-workspace-embedded-dark"`).
2. ~~Import / Design defaults in Workspace tools~~ — **STORY-186:** read-only **At a glance** (catalog configured + design defaults line); full forms stay in Settings (progressive disclosure).
3. ~~Models empty-state copy~~ — **STORY-186:** no-key message + empty-list message; shared key in Chat or Connections.

### Phase C — Product / backlog (**current queue**)

- **`TRACKER.md` → `## 📋 Pending (active backlog)`** — empty; new work uses **next story number** from the tracker header.
- **Legacy rows 93–97** — moved to **`## 📦 Legacy aspirational`** in `TRACKER.md`; see **`docs/deferred-features-registry.md`** (not scheduled unless PM reopens).
- Search roadmap **196–201** **Done**; **Faza C** server rule index **deferred** — `docs/search-rules-rag-roadmap.md` + `docs/deferred-features-registry.md`.
- **`TRACKER.md` → `## 🟦 Parked (legacy)`** — stories **98–117, 126** are **not** the active sprint; much of the intent is superseded by **STORY-183+** (workspace tools) and **189–195** (agent/search). Reopen only with PM.
- **Meilisearch / catalog** — server `catalog.ts`, client `useSearchIndex` with `skip: true` + Meilisearch path; keep **server** `ORAICLE_LLM_MODEL` / `IONET_LLM_MODEL` aligned with product intent (see **§4b** — not automatically the same as chat presets).

### Phase D — Investor / docs

- `docs/system-overview-vc.md` — keep aligned with actual features (workspace tools, models, prompts).

---

## 6. Prompt for the new agent (copy-paste)

Replace `<TASK>` with the story title or paste acceptance criteria from `docs/stories/STORY-<n>-*.md`. **Always read `docs/stories/TRACKER.md` for the next story number** — do not rely on a number embedded in an old chat.

```
You are working in the Oraicle monorepo. The active product is the ROOT app (retail-promo flow), not packages/* legacy workspaces unless explicitly scoped.

## Purpose of this codebase (Retail Promo)
- **Users** build retail ad creatives: canvas (HTML/CSS), preview, PNG export, product selection from catalog/search.
- **Agent chat** (`/agents/retail-promo`) helps with copy, layout intent, and structured **AgentAction** patches applied to the canvas.
- **Search** can use MiniSearch (manual) and/or Meilisearch (agent path); **Stage-2** may call server **`catalog.selectProducts`** (LLM picks indices from candidates).

## Before you code
1. Read `docs/stories/TRACKER.md` — header **Next story number**, **Pending**, **Parked (legacy)**. “In Progress” may be empty.
2. Follow `.cursor/rules/story-driven-development.mdc`: create/update `docs/stories/STORY-<n>-*.md`, tests with acceptance criteria, run tests before marking Done.
3. Read this file (`docs/handoff-new-agent-2026-03-21.md`), especially **§4b LLM / io.net model layout** (client chat presets vs server `selectProducts` env).
4. Skim `.cursor/rules/guardian-agent.mdc`; Section 14 next-id must match `TRACKER.md` (`client/src/lib/guardian-rag-tracker-sync.test.ts`).

## LLM quick reference (do not confuse paths)
- **Agent chat model** → `client/src/lib/agent-chat-engine.ts` (`CHAT_MODEL_PAIR_BY_MODE`, Fast/Smart/Custom). Uses browser io.net key + `ionet-client.chatCompletion`.
- **selectProducts (server)** → `server/routers/catalog.ts`; model = `ENV.llmModel` from `ORAICLE_LLM_MODEL` / `IONET_LLM_MODEL` in `.env.local`. Restart dev server after changing.
- **Ad copy helpers** → `client/src/lib/ionet-models.ts`; optional `PUBLIC_IONET_AD_COPY_MODEL`.

## Recent context (examples — see tracker Done table for authoritative list)
- **STORY-207:** Agent chat presets use **Llama-3.3-70B-Instruct** where **gpt-oss-20b** was (paired with gpt-oss-120b). Same io.net API; stronger default for chat turns.
- **STORY-206–209** (verify titles in TRACKER): product-selection scope, products panel listing behavior, canvas swap-from-catalog — shipped; read story files if your task touches those areas.

## Search / catalog docs
- `docs/search-architecture-technical-hr.md` — manual vs agent pipeline.
- `docs/search-improvements-roadmap.md` — shipped tranche 196–201 + RAG-lite roadmap pointer.

## Dev notes
- `[Auth] Missing session cookie` in local dev without login is **expected** for many flows.
- Quality gate: `pnpm run smoke` (vitest + vite build) or separate `pnpm test` + `pnpm exec vite build`.

Your task: <TASK>
```

---

## 7. Completion checklist (for any task)

- [ ] Story file under `docs/stories/STORY-<n>-*.md` (per story-driven workflow); **n** = next id from `TRACKER.md` header
- [ ] `TRACKER.md` — **next story number** correct; Done / Parked / Pending updated when status changes
- [ ] Tests for acceptance criteria; `pnpm test` green; `pnpm exec vite build` green (or `pnpm run smoke`)
- [ ] Optional: browser spot-check `/agents/retail-promo`
- [ ] Guardian Section 14 **next story number** matches `TRACKER.md` (`guardian-rag-tracker-sync.test.ts`)

---

*Generated as part of Guardian-style review + internal browser pass.*
