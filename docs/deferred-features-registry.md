# Deferred features registry (root app — Retail Promo)

**Purpose:** Single index for work that is **documented** but **not implemented**, so roadmap reviews do not confuse “designed” with “shipped”.  
**Related:** `docs/technical-status-guardian-review-2026-03-23.md` · `docs/stories/TRACKER.md`.

---

## 1. Search — RAG rules Faza C (server / indexed rules)

| Item | Status | Detail |
|------|--------|--------|
| Separate **rule index** (Meilisearch `search_rules` or embeddings) | **Deferred** | `docs/search-rules-rag-roadmap.md` § Faza C — ingest, `retrieveRulesForQuery`-style flow, merge with Stage-1 / `selectProducts`. |
| Client PoC | **Shipped** | Faza B — `search-rules-rag-lite.ts` (lexical), opt-in in Search settings. |

**When to reopen:** Multilingual or heavy paraphrase policies where token overlap is insufficient; or rules must be **server-authoritative** (multi-device / compliance).

---

## 2. Search — STORY-197 optional: server-backed **manual** catalog search

| Item | Status | Detail |
|------|--------|--------|
| Same Meilisearch path as agent for **Add Products / Products tab** manual search | **Not built** | `docs/search-architecture-technical-hr.md` — matrix notes intentional tradeoff: browser MiniSearch, latency, offline, no extra tRPC. |

**When to reopen:** Product requires identical ranking for manual vs agent and accepts server dependency + sync complexity.

---

## 3. Tracker — STORY-93–97 (legacy aspirational)

Moved to **`docs/stories/TRACKER.md` → “Legacy aspirational”** — pre–current-retail-promo phase rows. Partial overlap with shipped workspace settings, catalog API stub, and in-app search. **Do not schedule** without PM triage against current product.

---

## 4. Parked stories (98, 99, 100, 103, 114–117, 126)

See **`docs/stories/TRACKER.md` → 🟦 Parked**. Superseded in practice by STORY-183+ unless PM reopens.

---

## 5. Phase A — manual browser smoke (not replaced by automation)

Automated gate: **`pnpm run smoke`** (unit tests + `vite build`).  
Human verification: **`docs/qa-manual-smoke-retail-promo.md`**.

---

*Version: 2026-03-23 (STORY-203).*
