# Proactive AI assistance — industry-standard roadmap

This document extends [`proactive-suggestions-roadmap.md`](proactive-suggestions-roadmap.md) with a **full program** to reach parity with how large product teams ship **contextual, trustworthy AI nudges** (think: Copilot-style assistance, Canva / Figma AI hints, Ads platform recommendations — not literal feature parity, but **the same categories of rigor**).

**Audience:** product, engineering, design, compliance. **Use:** prioritize backlog; each phase can become one or more stories.

---

## 1. What “industry standard” means here

| Pillar | User-visible outcome | Typical giant pattern |
|--------|----------------------|------------------------|
| **Control** | User feels in charge, never trapped by AI | Clear on/off, dismiss, undo, “not now”, session mute |
| **Relevance** | Tips match **this** canvas, not generic spam | Strong context payload, cooldown while editing, dedup |
| **Transparency** | User understands *why* a tip appeared (lightly) | Short copy, optional “why this?” / category |
| **Safety** | No destructive surprises | Validated actions, undo, dry-run where possible |
| **Quality loop** | System gets better over time | Metrics, eval sets, prompt/version governance |
| **Privacy** | Data use is predictable | Minimize retention, clear notices, opt-out of learning |
| **Accessibility** | Works for keyboard + AT users | Focus order, labels, live regions |
| **Reliability** | Product works when AI doesn’t | Silent failure, no broken UI, backoff |

---

## 2. Current foundation (Oraicle — already shipped)

- Actionable-only suggestions (STORY-166), multi-page–honest prompts, single slot, undo on apply.
- Dedup + activity-aware debounce / min interval (STORY-167).
- Shared catalog resolution pipeline with main chat where relevant.

**Gap:** everything below is the **roadmap to giant-grade** operation.

---

## 3. Pillar A — User control & trust (highest ROI)

| # | Initiative | Detail |
|---|------------|--------|
| A1 | **Explicit master toggle** | Already: suggestions on/off in header — ensure it persists (account or `localStorage`), survives refresh, and is discoverable (tooltip / first-run hint). |
| A2 | **“Mute for this session”** | **STORY-169:** Header control (Volume icon) — no proactive API calls until resume or full reload; main “Suggestions” toggle unchanged. |
| A3 | **“Don’t suggest this again”** (optional) | Per **normalized tip key** (dedup already): longer TTL (e.g. 7 days) or until canvas **major** change (format switch, new product batch). |
| A4 | **Undo parity** | Already on apply — add **keyboard** (Ctrl+Z) where it doesn’t conflict with canvas undo precedence — document precedence. |
| A5 | **Destructive action guardrails** | Block or confirm suggestions that would e.g. change `product_action` to deselect many SKUs — industry pattern: **high-impact** actions need extra friction. |

**Success metrics:** dismiss rate stable or falling; qualitative “feels helpful” in tests; support tickets about “AI won’t stop” → zero.

---

## 4. Pillar B — Relevance & context (what giants obsess over)

| # | Initiative | Detail |
|---|------------|--------|
| B1 | **Richer context payload** | Include **diff summary** since last suggestion (e.g. “headline changed”, “+3 products”) so the model doesn’t repeat stale advice — optional compact `delta` in serialized canvas JSON. |
| B2 | **User-triggered path** | “Suggest an improvement” button (Phase D) — same backend, **no** surprise timer; primary path for power users. |
| B3 | **Category / intent tags** | Internal: `layout \| copy \| color \| products` — can be model-output or rule-based; powers analytics and future UI chips. |
| B4 | **Locale & tone** | Respect UI locale + brand voice settings if you add them; system prompt already asks for user language — add **explicit** `locale` field in canvas state. |
| B5 | **Cold-start** | First 30s on canvas: longer debounce or skip proactive until first **Generate** or first **manual** chat — reduces “AI speaks before I’ve started.” |

---

## 5. Pillar C — Performance, cost & reliability

| # | Initiative | Detail |
|---|------------|--------|
| C1 | **Request coalescing** | If multiple deps change in one frame/tick, one debounced request (verify effect batching / already partially true). |
| C2 | **Model fallback chain** | Already in main chat — ensure suggestions use same **fast → smart** fallback with **budget** caps (`max_tokens`). |
| C3 | **Server-side dry-run** (Phase D) | Parse + `applyAgentActions` on a **clone** of state in worker or server — reject suggestions that noop or throw; return safe error to client without showing bubble. |
| C4 | **Circuit breaker** | After N failures in M minutes, disable proactive calls until cooldown — protect UX and vendor quotas. |
| C5 | **Offline / no-key** | No spinner, no error toast for optional suggestions — **silent** skip (already mostly true — audit). |

---

## 6. Pillar D — Measurement & quality loop (how teams actually improve)

| # | Initiative | Detail |
|---|------------|--------|
| D1 | **Privacy-preserving analytics** | **STORY-169:** `suggestion_*` + `proactive_suggestions_session_mute` in `retail-promo-log.ts` with `tipKeyHash` (djb2 on normalized text); optional export via existing session log helpers. |
| D2 | **Funnel** | Show → Apply vs Dismiss ratio per **category** (once B3 exists). |
| D3 | **Offline eval set** | Fixed JSON canvas fixtures + expected “allowed action types” — regression test prompts on CI (golden-file or LLM-as-judge optional). |
| D4 | **Prompt versioning** | `SUGGESTION_SYSTEM_PROMPT` version string in code + log on each request — compare metrics across versions. |
| D5 | **Human review queue** (later) | Sample low-confidence or high-dismiss tips for internal review — enterprise pattern. |

---

## 7. Pillar E — Accessibility (WCAG-minded)

| # | Initiative | Detail |
|---|------------|--------|
| E1 | **Keyboard** | Apply / Dismiss reachable in tab order; **Escape** dismisses suggestion when focus is in panel. |
| E2 | **Screen readers** | `role="status"` or polite live region when a new suggestion appears; buttons have clear accessible names (“Apply suggestion: …”). |
| E3 | **Motion** | Respect `prefers-reduced-motion` for any pulse/highlight on new tips. |

---

## 8. Pillar F — Privacy, compliance & enterprise

| # | Initiative | Detail |
|---|------------|--------|
| F1 | **Data processing notice** | Short copy in settings or first AI use: what is sent to the model (canvas JSON summary), retention, opt-out. |
| F2 | **Tenant / admin controls** (future) | Disable proactive AI org-wide; allow only user-triggered; EU data residency if you host inference regionally. |
| F3 | **Audit log** (enterprise) | Who enabled AI, export of suggestion events for compliance — only if you sell B2B. |

---

## 9. Pillar G — Product polish (delight without clutter)

| # | Initiative | Detail |
|---|------------|--------|
| G1 | **Microcopy** | “Tip” vs “Suggestion” vs “Idea” — A/B test one word; giants tune this constantly. |
| G2 | **Empty state** | When suggestions off, subtle line: “Turn on tips to get layout ideas” — discovery. |
| G3 | **Success feedback** | Tiny confirmation after Apply (“Applied”) — optional, 1.5s toast — reinforces trust. |
| G4 | **Conflict resolution** | If user sends a chat message while suggestion visible — auto-dismiss suggestion or pin below — pick one rule and test. |

---

## 10. Phased implementation map (suggested order)

| Phase | Focus | Bundles |
|-------|--------|---------|
| **Now → +1 quarter** | Trust + measurement | A1–A3, D1–D2, E1–E2, G2 |
| **+1 quarter** | Relevance + power users | B1–B2, B5, C2–C4 |
| **+2 quarters** | Quality at scale | D3–D4, C3, B3, G3–G4 |
| **Enterprise track** | As needed | F1–F3, A5, D5 |

Stories **166–167** cover early Phase A/B items in code; this table is the **full** backlog to “giant-grade.”

---

## 11. Definition of done — “industry standard” bar (checklist)

Use this for release reviews:

- [ ] User can turn proactive suggestions off **and** understand what that means.
- [ ] No advice-only bubbles; destructive or high-impact actions are gated or validated.
- [ ] Cooldown + dedup prevent nagging during active editing.
- [ ] Apply is reversible (undo) for normal suggestion scope.
- [ ] Failures don’t break chat; optional circuit breaker after repeated errors.
- [ ] Basic analytics exist to tune prompts (even if internal-only).
- [ ] Keyboard + screen reader path for suggestion actions.
- [ ] Privacy stance documented; logging minimized and policy-aligned.

---

## 12. References (patterns, not endorsements)

- **Assistive + contextual:** proactive help works when it’s **interruptible**, **relevant**, and **rare** enough to feel valuable.
- **Copilot-style products:** strong emphasis on **user control**, **org policies**, and **audit** — map to F2–F3 when you go upmarket.
- **Creative tools (Canva/Figma-class):** suggestions tied to **canvas state**, heavy **undo**, and **manual** “generate ideas” as the power-user path — map to B2 and B1.

---

*Maintainer: update this doc when a pillar ships; link new stories from [`TRACKER.md`](stories/TRACKER.md).*
