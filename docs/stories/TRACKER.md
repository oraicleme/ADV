# Story Tracker

**Next story number:** 210

> **Queue priority:** Use `docs/handoff-new-agent-2026-03-21.md` for the **current** sprint focus (Phase A: `pnpm run smoke` + manual QA; next id **210**). Rows under **Parked (legacy)** below are **not** the active backlog unless PM reopens them.

> Last guardian review: 2026-03-24 — STORY-209 complete (canvas swap product from catalog search); next id 210

> Last guardian review: 2026-03-24 — STORY-207 complete (agent chat `CHAT_MODEL_PAIR_BY_MODE`: Llama-3.3-70B-Instruct replaces gpt-oss-20b for fast primary / smart fallback); next id 208

> Last guardian review: 2026-03-23 — STORY-205 complete (`INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX`, industry contract tests, footer dock assert, `industry-standard-manner.md`); next id 206

> Last guardian review: 2026-03-23 — STORY-204 complete (`system-overview-vc.md` ops/smoke/deferred links; `vc-system-overview-doc.test.ts`); next id 205

> Last guardian review: 2026-03-23 — STORY-203 complete (smoke script, `qa-manual-smoke-retail-promo.md`, `deferred-features-registry.md`, tracker triage 93–97, `repo-smoke-script.test.ts`, product-index perf budgets); next id 204

> Last guardian review: 2026-03-23 — STORY-202 complete (`system-overview-vc.md` search stack + dev auth note in handoff; `vc-system-overview-doc.test.ts`); next id 203

> Last guardian review: 2026-03-23 — STORY-201 complete (RAG-lite PoC: `search-rules-rag-lite.ts`, settings, merge in `apply-search-rules.ts`, Search settings toggle; roadmap `docs/search-rules-rag-roadmap.md`); next id 202

> Last guardian review: 2026-03-23 — STORY-200 complete (search feedback implicit/explicit telemetry + ProductTable thumbs + `search-feedback.ts`); next id 202

> Last guardian review: 2026-03-23 — STORY-199 complete (hybrid routing docs + `shouldSkipSelectProductsLLM` + Search settings hints); next id 202

> Last guardian review: 2026-03-23 — STORY-198 complete (optional LLM Stage-1 expansion; STAGE1_QUERY_EXPANSION + VITE_STAGE1_QUERY_EXPANSION); next id 202

> Last guardian review: 2026-03-23 — STORY-197 complete (normalizeSearchQueryForPipeline + manual/AI matrix doc; no server-backed manual list); next id 202

> Last guardian review: 2026-03-23 — STORY-196 complete (search rules exclude/downrank — localStorage + manual + agent Stage-1); next id 202

> Last guardian review: 2026-03-23 — STORY-144 complete (hide product count — tests); next id 202

> Last guardian review: 2026-03-23 — Search improvements roadmap **196–201** shipped + `docs/search-improvements-roadmap.md` + `docs/search-rules-rag-roadmap.md`; next id 202

> Last guardian review: 2026-03-23 — STORY-195 complete (agent SEARCH ARCHITECTURE prompt + intent routing); next id 196

> Last guardian review: 2026-03-23 — STORY-194 complete (Products tab seeds search from last agent catalog_filter); next id 195

> Last guardian review: 2026-03-23 — STORY-193 complete (import/sync/paste respect active catalog search); next id 194

> Last guardian review: 2026-03-23 — STORY-187 complete (Chat workspace collapsible a11y — aria-expanded, focus-visible, tests)

> Last guardian review: 2026-03-23 — STORY-185 complete (Chat workspace embedded `.dark` scope for settings sections)

> Last guardian review: 2026-03-23 — STORY-184 complete (Guardian Section 14 + tracker sync test)

> Last guardian review: 2026-03-21 — STORY-183 complete (chat workspace tools + io.net models + prompts)

> Last guardian review: 2026-03-21 — STORY-182 complete (manual search minScore fallback)

> Last guardian review: 2026-03-21 — STORY-181 complete (Products tab search sync + MiniSearch)

> Last guardian review: 2026-03-15 — 785 tests passing (56 files), STORY-140 complete

> Last guardian review: 2026-03-11 — 590 tests passing (41 files)
> STORY-122 complete: 2026-03-12 — 649 tests passing (45 files), 18 new tests added

---

## ✅ Done

### Legacy Stories (from packages/landing, referenced in code comments)

Stories 1–28 were from earlier development phases (pre-Manus). No files exist for them — they predate the story-driven workflow and are not referenced in the current codebase.

| # | Slug | Title | Source |
|---|------|-------|--------|
| 29 | url-preload | URL Preload from Control Panel | code ref |
| 34 | ad-options | Ad Options — Headline, CTA, Badge, Disclaimer, Emoji | code ref |
| 35 | scalability-xss-text | Scalability, XSS Protection, Text-Only Preview | code ref |
| 37 | adaptive-contrast | Adaptive Text Contrast & Saved Creatives | code ref |
| 39 | font-size-cta | Title Font Size & CTA Buttons | code ref |
| 40 | element-order | Element Order — Drag-to-Reorder Blocks | code ref |
| 41 | ad-canvas-editor | AdCanvasEditor Foundation | code ref |
| 43 | logo-resize | Logo Resize, Alignment & Companion | code ref |
| 44 | edit-preview-mode | Canvas Edit/Preview Mode Toggle | code ref |
| 46 | auto-select-logo | Auto-Select First Saved Logo | code ref |
| 47 | header-brand-logos | Header Brand Logos | code ref |
| 48 | logo-background-compat | Logo–Background Visual Compatibility | code ref |
| 49 | saved-brand-logos | Saved Brand Logos Library | code ref |
| 50 | saved-product-photos | Saved Product Photos Library | code ref |
| 52 | product-image-height | Product Image Height Control | code ref |
| 54 | product-photos-metadata | Product Photos with Metadata | code ref |
| 55 | per-row-photo-picker | Per-Row Product Photo Picker | code ref |
| 56 | product-block-options | Per-Product-Block Configuration | code ref |
| 57 | ad-block-schema | Strict Ad Block Schema — AI Safety | code ref |
| 58 | ai-edit-with-prompt | AI Vision "Edit with Prompt" | code ref |
| 62 | agent-chat-engine | AI Agent Chat Engine (4 Phases) | code ref |
| 63 | dark-panel-contrast | Dark Panel Contrast Fix | code ref |
| 68 | vision-product-analyzer | Vision-Powered Product Analyzer | code ref |
| 69 | catalog-filter | Catalog Filter for Product Search | code ref |

> **Gap numbers** (30–33, 36, 38, 42, 45, 51, 53, 59–61, 64–67): these stories existed in earlier development but are not referenced in the current codebase. If files are found later, they can be added.

### Manus Agent Stories (root app — oraicle-retail-promo)

| # | Slug | Title | Phase(s) |
|---|------|-------|----------|
| 70 | manus-bootstrap | Initial Project Bootstrap & Core Integration | — |
| 71 | manus-core-editor | Core Ad Editor, Product Import, AI Interface | — |
| 72 | manus-fuzzy-search | Fuzzy Product Search Integration | 2 |
| 73 | manus-ionet-models | IO.NET Model Updates | 3 |
| 74 | manus-multi-agent | Multi-Agent Architecture | 4 |
| 75 | manus-export | HTML/PNG Export | 5 |
| 76 | manus-e2e-testing | End-to-End Testing Pipeline | 6 |
| 77 | manus-orchestrator | Orchestrator Integration into AgentChat | 7 |
| 78 | manus-backend-llm | Backend API Integration for Real LLM Suggestions | 8 |
| 79 | manus-user-rag | User RAG for Personalized Suggestions | 9 |
| 80 | manus-universal-api | Universal API Integration System | 10 |
| 81 | manus-ad-config | Ad Configuration Schema & Professional Canvas | — |
| 82 | manus-header-footer | Header/Footer Configuration System | 16–17 |
| 83 | manus-company-info | Company Info & Footer Panel | 18 |
| 84 | manus-product-selection | Intelligent Product Selection & Multi-Ad Campaigns | 19–20 |
| 85 | manus-product-mgmt | Product Management UI Complete | 21 |
| 86 | manus-ui-ux | UI/UX Optimization | 22 |
| 87 | manus-product-parsing | Intelligent Product Data Parsing | 23 |
| 88 | manus-brand-logos | Brand Logo Management Suite | 24–27 |
| 89 | manus-rebranding | Oraicle.me Rebranding | 28 |
| 90 | manus-landing-messaging | Landing Page Messaging & UX Polish | 29–34 |
| 91 | manus-single-screen | Single-Screen Landing Page Redesign | 35–38 |
| 92 | manus-designer-redesign | Retail Promo Designer Page Redesign | 39 |
| 101 | preview-fullscreen | Preview — Nearly Full-Screen, No Left Panel | — |
| 102 | agent-product-display-fix | Agent Product Selection — Products Not Shown in Canvas | — |
| 104 | catalog-filter-fix-and-agent-brief | Catalog Filter — Ispravak (categoryContains) + fuzzy rewrite | — |
| 105 | mobileland-product-images-api | Mobileland.me Product Images — Magento REST API | — |
| 106 | mobileland-images-debug | Mobileland Product Images — Debug Why Images Don't Appear | — |
| 107 | catalog-upload-zero-selection | Catalog Upload — Zero-Selection Start & Agent-First Flow | — |
| 108 | second-turn-vision-stuck | Second Turn Stuck — Vision Analysis Blocks on Mobileland URLs | — |
| 109 | canvas-ux-header-footer-and-text-size | Canvas UX — Header Text Size Chips + Footer Section | — |
| 110 | search-precision-usb-c-compound-tokens | Product Search Precision — Catalog Vocabulary + Compound Tokens | — |
| 111 | search-model-industry-standard | Search Model — Industry Standard | — |
| 112 | handoff-search-selection | Handoff — Search & Selection (0 of 6213 selected) | — |
| 113 | catalog-filter-fallback-relevance | catalog_filter fallback — relevance (no adapters when user asked for chargers) | — |
| 118 | search-quick-fixes | Search Quick Fixes — sampleNames, Enter=AI, Empty State CTA | — |
| 119 | ai-product-selection | AI-Driven Product Selection — General Architecture | — |
| 120 | candidate-selection-fix | Candidate Selection Fix — Product Search Returns 0 | — |
| 121 | minisearch-product-search | MiniSearch — Two-Stage Search (Inverted Index + LLM Rerank) | ✅ |

---

| 122 | search-hardening | Search Hardening — Fix All Issues from Senior Code Review | ✅ |
| 123 | prompt-change-canvas-update | Canvas se ne ažurira nakon promjene prompta | ✅ |
| 124 | search-fix-e2e | Pretraga ne radi ispravno — popravak + E2E testovi | ✅ |
| 125 | no-match-no-select-all | catalog_filter No-Match — Don’t Select All Products | ✅ |
| 127 | canvas-multipage-and-mandatory-footer | Canvas Multi-Page + Mandatory Footer — Industry Standard | ✅ |
| 128 | preview-follows-canvas-industry-standard | Preview Follows Canvas — Industry Standard & Full Connection | ✅ |
| 129 | industry-multi-page-and-no-leaking-helpers | Multi-Page & Preview — Industry Manner + No Leaking Helpers | ✅ |
| 130 | select-products-prompt-industry-standard | selectProducts System Prompt — Model Scope & Industry Best Practice | ✅ |
| 131 | footer-industry-standard-canvas-preview-output | Footer — Industry Standard (Canvas ↔ Preview ↔ Output) | ✅ |
| 132 | preview-images-resize-and-footer-optimization | Preview — Resize slika u odnosu na prostor + optimizacija footera | ✅ |
| 133 | playstation-joystick-low-recall-analysis | Duboka analiza — zašto "Play Station oprema i joystick" vraća samo 4 rezultata | ✅ |
| 134 | catalog-driven-search-vocabulary | Katalogom vođen vokabular pretrage (modul) | ✅ |
| 135 | meilisearch-research | Research — Meilisearch umjesto MiniSearch + vokabulara | ✅ |
| 136 | switch-to-meilisearch | Switch to Meilisearch (hybrid with MiniSearch fallback) | ✅ |
|| 137 | meilisearch-hybrid-llm-routing | Meilisearch Hybrid Search + Smart LLM Routing | ✅ |
|| 138 | product-enrichment-pipeline | Meilisearch Hybrid — OpenAI Embedder + MiniSearch Fallback Removed | ✅ |
|| 139 | catalog-index-manager | Catalog Index Manager — Incremental Meilisearch Indexing (Diff + Health Check) | ✅ |
|| 140 | embedder-config-decoupled-and-search-fallback | Embedder Config Decoupled + BM25 Fallback on Missing Embedder | ✅ |
|| 141 | build-chunk-optimization | Build Chunk Optimization — Split Vendor Bundles + Fix ionet-client Import | ✅ |
|| 142 | search-excel-vectors-tech-doc | Technical Doc — Search, Excel Parser, Vectors | ✅ |
|| 143 | export-png-product-images-missing | Export PNG — Product Images Missing on Ad | ✅ |
|| 144 | hide-product-count-canvas | Hide Product Count in Products Block | ✅ |
|| 145 | footer-dock-industry-manner-contract | Footer Dock — Industry Manner Contract | ✅ |
|| 146 | search-type-c-recall-too-low | Search Type-C Recall Too Low | ✅ |
|| 147 | export-footer-fill-card-contrast | PNG Export — Footer Too Low & Card Contrast | ✅ |
|| 148 | vc-investor-system-overview-doc | VC Investor — System Overview & Roadmap Document | ✅ |
|| 149 | vc-doc-code-grounded-canvas-preview-export | VC doc rewrite (code-grounded Canvas/Preview/Export) | ✅ |
|| 150 | catalog-selectProducts-bulletproof-category-agnostic | Catalog Selection — Bulletproof, Category-Agnostic selectProducts | ✅ |
|| 151 | product-image-blurred-background | Product Image — Blurred Background (Aspect-Ratio Intelligence) | ✅ |
|| 152 | export-png-premium-placeholder-and-html2canvas-compat | PNG Export — Premium Placeholder & html2canvas Compat | ✅ |
|| 153 | mobileland-fetchMobilelandImageMap-trpc11-json | fetchMobilelandImageMap — tRPC v11 JSON envelope | ✅ |
|| 154 | mobileland-image-custom-attributes-fallback | Mobileland map — Magento custom_attributes image fallback | ✅ |
|| 155 | mobileland-image-url-broken-teracell | Mobileland — ispravak URL slika (dupli path + referrer) | ✅ |
|| 156 | mobileland-excel-sku-vs-magento-sku | Mobileland — Excel šifra vs Magento SKU + alias id/url_key | ✅ |
|| 157 | mobileland-excel-sku-mapping-verification-doc | Mobileland — dok. verifikacije 1:1 + skripta | ✅ |
|| 158 | mobileland-client-lookup-initialdata-normalize | Mobileland — client lookup + initialData + normalizacija šifre | ✅ |
|| 159 | unused-products-default-and-canvas-semantics | Unused Products Filter — Default On + Canvas-Aligned Catalog | ✅ |
|| 160 | product-selection-search-and-filter-list-sync | Product Selection — Search/Filter Updates List (DraggableProductList Sync) | ✅ |
|| 161 | canvas-page-capacity-grid-columns | Multi-Page Canvas — Page Size Matches Grid Columns (12 for 4×3) | ✅ |
|| 162 | catalog-filter-recall-multi-query-inclusive-llm | Catalog Filter Recall — Multi-Query Stage-1 + Inclusive LLM Selection | ✅ |
|| 163 | second-ad-empty-catalog-filter-no-select-all | Second Ad — Empty Legacy catalog_filter Must Not Select Entire Catalog | ✅ |
|| 164 | product-panel-search-persist-across-tabs | Product Panel — Persist Search & Unused Filter Across Tab Switches | ✅ |
|| 165 | product-selection-stats-and-agent-copy | Product Selection Stats — Shown vs Checked + Agent Prompt | ✅ |
|| 166 | proactive-suggestions-actionable | Proactive Suggestions — Actionable, Multi-Page Aligned, Roadmap | ✅ |
|| 167 | proactive-suggestions-phase-b-dedup-cooldown | Proactive Suggestions — Phase B Dedup + Activity Cooldown | ✅ |
|| 168 | proactive-ai-industry-standard-roadmap-doc | Proactive AI — Industry-Standard Roadmap (Documentation) | ✅ |
|| 169 | proactive-session-mute-and-analytics | Proactive Suggestions — Session Mute + Privacy-Safe Analytics | ✅ |
|| 170 | left-panel-settings-roadmap-doc | Left Panel — Settings / Import / Search / API Roadmap | ✅ |
|| 171 | workspace-settings-panel-shell | Workspace Settings Panel Shell (P0 Accordion + Search Link) | ✅ |
|| 172 | byok-llm-key-connections | BYOK — LLM API Key in Workspace Settings → Connections | ✅ |
|| 173 | workspace-search-settings-sliders | Workspace Settings — Search Min-Score Sliders (P3) | ✅ |
|| 174 | catalog-api-import-stub | Catalog API — Import Stub (localStorage, No HTTP) | ✅ |
|| 175 | agent-workspace-brief | Agent Workspace Brief — Persist + Merge into System Prompts (P4) | ✅ |
|| 176 | workspace-design-defaults | Workspace Design Defaults — Format/Layout/Style (P5) | ✅ |
|| 177 | catalog-api-test-connection | Catalog API — Server-Proxied Test Connection | ✅ |
|| 178 | catalog-api-full-sync | Catalog API — Full Sync (Pagination + Mapping → Index) | ✅ |
|| 179 | workspace-settings-accordion-collapsible | Workspace Settings — Collapsible Accordion | ✅ |
|| 180 | kling-generative-ad-creative | Kling AI — Generative Ad Creative from Canvas (server async, grounded prompt) | ✅ |
|| 181 | products-tab-search-sync | Products Tab — Sync Catalog Search + MiniSearch (Not Full Catalog) | ✅ |
|| 182 | manual-search-minscore-fallback | Manual Search — MinScore Fallback When BM25 Returns 0 Rows | ✅ |
|| 183 | chat-workspace-and-ionet-models | Chat Workspace Tools + io.net Models + Prompt Inspector | ✅ |
|| 184 | guardian-rag-section-14-refresh | Guardian RAG Section 14 Refresh + Tracker Sync Test | ✅ |
|| 185 | chat-workspace-embedded-dark-theme | Chat Workspace — Embedded Settings `.dark` Theme Scope | ✅ |
|| 186 | workspace-at-glance-and-models-copy | Workspace At-a-Glance + Models List Copy | ✅ |
|| 187 | chat-workspace-collapsible-a11y | Chat Workspace — Collapsible Accessibility (aria-expanded & focus) | ✅ |
|| 189 | agent-intent-search-design-prompts | Agent Intent — Search vs Canvas vs “Make an Ad” + predefined prompts | ✅ |
|| 191 | agent-chat-empty-actions-telemetry | Agent Chat — Empty Actions DEV Logging + Session Telemetry | ✅ |
|| 192 | llm-call-errors-and-ionet-tests | LLM Call Errors (io.net) + Test / Report Strategy | ✅ |
|| 193 | import-respects-catalog-search | Import / Sync / Paste — Respect Active Catalog Search | ✅ |
|| 194 | products-tab-seed-search-from-agent-catalog-filter | Products Tab — Seed Search From Last Agent catalog_filter | ✅ |
|| 195 | agent-search-architecture-prompt | Agent — Grounded Search Architecture Explanation | ✅ |
|| 196 | search-rule-engine-post-processing | Search Rule Engine — Post-Processing (exclude/downrank) | ✅ |
|| 197 | search-manual-ai-consistency | Search — Manual vs AI Consistency | ✅ |
|| 198 | search-llm-query-expansion-stage1 | Search — LLM Query Expansion Before Meilisearch Stage-1 | ✅ |
|| 199 | search-hybrid-routing-tuning | Search — Hybrid Routing & Threshold Tuning | ✅ |
|| 200 | search-feedback-loop | Search — Feedback Loop (implicit / explicit) | ✅ |
|| 201 | search-rules-rag-long-term | Search Rules — RAG Long-Term (RAG-lite PoC + phased roadmap) | ✅ |
|| 202 | vc-doc-dev-session-search-sync | VC Doc + Dev Session Note — Search Stack Sync | ✅ |
|| 203 | backlog-triage-smoke-deferred-registry | Backlog Triage, Smoke Gate & Deferred Features Registry | ✅ |
|| 204 | vc-doc-ops-deferred-links | VC Doc — Operations, Smoke & Deferred Registry Links | ✅ |
|| 205 | industry-layout-explicit-contracts | Industry Layout — Explicit Contracts (chrome reserve + tests) | ✅ |
|| 206 | product-selection-only-on-ad-scope | Product Selection — List scope “Only on this ad” (search ∩ canvas) | ✅ |
|| 207 | agent-chat-fast-model-llama-33 | Agent Chat — Llama-3.3-70B-Instruct umjesto gpt-oss-20b (io.net) | ✅ |
|| 208 | products-panel-list-only-search-matches | Products tab — only list search matches (optional full catalog) | ✅ |
|| 209 | canvas-swap-product-from-catalog | Canvas — swap product slot from search-matched catalog | ✅ |

---

## 🟡 In Progress

_(none — new work uses **next story number** above or Phase A in `docs/handoff-new-agent-2026-03-21.md`.)_

---

## 🟦 Parked (legacy — not current sprint)

These stayed “In Progress” in the tracker historically; **retail-promo has since shipped workspace chat (STORY-183+), intent/search (189–195), and STORY-196–201 (search roadmap).** Treat as **superseded or on hold** unless product reopens. Do **not** schedule ahead of **210+** without PM confirmation.

| # | Slug | Title |
|---|------|-------|
| 98 | chat-ui-redesign | AI Agent Chat — Industry-Standard UI Redesign |
| 99 | canvas-redesign | Canvas WYSIWYG — Canva-Style Visual Redesign |
| 100 | agent-canvas-reconnect | Agent → Canvas Action Pipeline Fix |
| 103 | product-filter-industry-standard | Product Filter — Industry Standard (Fuzzy + Futrole Semantics) |
| 114 | brand-logo-remove-swap | Brand Logo Remove & Swap — Industry-Standard UX |
| 115 | saved-footer-config | Saved Footer Config — Save & Apply (Same as Logos) |
| 116 | universal-search-logic | Universal Search Logic — One Algorithm for All Products |
| 117 | ai-product-search | AI Product Search — Interpret Natural Language in Sidebar |
| 126 | ad-preview-actions-industry-standard | Ad Preview Actions — Copy / Download / Export industry-standard |

---

## 📋 Pending (active backlog)

_(none — use **next story number** for new work.)_

---

## 📦 Legacy aspirational (not scheduled — pre–retail-promo roadmap)

These rows predate the current shipped product (workspace settings, catalog API stub, in-app search, etc.). **Do not** treat as committed work unless PM reopens and re-scopes. See **`docs/deferred-features-registry.md`**.

| # | Slug | Title | Phase(s) |
|---|------|-------|----------|
| 93 | canvas-verify | Canvas Functionality Verification | 11 |
| 94 | catalog-db | Database Integration for Catalog | 12 |
| 95 | api-config-ui | API Configuration UI | 13 |
| 96 | catalog-search | Catalog Search & Filter UI | 14 |
| 97 | error-handling | Error Handling & Fallback Strategies | 15 |

---

## 🔴 Blocked

_(none)_

## ⚫ Cancelled

_(none)_
