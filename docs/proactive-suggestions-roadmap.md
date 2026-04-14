# Proactive suggestions — product roadmap

Proactive suggestions are the **short, one-tap tips** that appear in the AI chat after the canvas stabilizes. They must **never** feel like spam or empty nagging: each visible tip should map to **Apply** doing something real on the canvas.

## Principles (guardrails)

1. **Actionable or silent** — If the model has no 1–3 actions to apply, we show **nothing** (no advice-only bubbles).
2. **Truthful grid math** — Copy must respect **multi-page** behavior (STORY-127) and **per-page capacity** = 3 rows × effective columns (STORY-161); never tell users to “remove products” for format fit.
3. **One at a time** — Replace the previous proactive suggestion so the chat does not fill with stale tips.
4. **Reversible** — **Apply** sets the same style of **undo snapshot** as a normal assistant turn so users can back out.

## Phase A (STORY-166) — shipped in code

- Stronger `SUGGESTION_SYSTEM_PROMPT` + client-side **normalization** (drop non-actionable responses).
- Single suggestion slot + undo on apply + **Apply** only when actions exist.

## Phase B — quality & relevance (STORY-167 shipped)

- Tighten **temperature** / token limits per experiment; optional **second-pass** JSON repair (already partially present in parsers).
- **Dedup**: skip a new suggestion if the normalized message text matches a **rolling list** of recently dismissed/applied suggestions (`proactive-suggestion-dedup.ts`).
- **Cooldown**: **longer debounce** (4.5s vs 2s) and **longer min interval** (15s vs 5s) between API calls while the canvas was **recently edited** (10s activity window).

## Phase C — UX depth

- Subtle **category** label (Design / Color / Copy) — only if it does not clutter; may stay in `message` text only.
- **Telemetry** (privacy-preserving): apply vs dismiss rates to tune prompts.

## Phase D — optional product expansion

- **User-triggered** “Suggest improvement” button (same pipeline, no timer surprise).
- **Server-side** validation that `actions` parse and apply in a dry-run (heavier; only if client-side issues persist).

This document is the north star for guardian / reviewer questions: *“Does this suggestion help, or only talk?”*

---

## Industry-standard program (full backlog)

For a **broader, giant-grade** roadmap — trust, relevance, metrics, accessibility, privacy, enterprise — see **[`proactive-suggestions-industry-standard-roadmap.md`](proactive-suggestions-industry-standard-roadmap.md)** (pillars A–G, phased quarters, definition-of-done checklist).
