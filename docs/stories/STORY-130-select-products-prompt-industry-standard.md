# STORY-130: selectProducts System Prompt — Model Scope & Industry Best Practice

**Status:** ✅ Done  
**Created:** 2026-03-14  
**Package:** server (catalog.selectProducts)

## What

Improve the **catalog.selectProducts** LLM system prompt so it (1) enforces **exact model/spec scope** (e.g. "iPhone 15 futrole" → only iPhone 15 cases; exclude iPhone 14, 16, Pro Max unless asked), and (2) follows **industry best practice** for system prompts: clear role, task, rules, and output format (Anthropic/OpenAI-style structure).

## Why

- Users get wrong scope: e.g. "reklama za iPhone 15 futrole" returned 999+ (all cases) because the prompt did not explicitly require excluding products that don’t match the **specified** model/variant.
- Unstructured prompts lead to over-inclusion and inconsistent JSON; structured prompts (role → task → rules → format) reduce ambiguity and improve reliability (how big players ship LLM features).

## Which prompt

- **Single prompt in scope:** `catalog.selectProducts` system prompt in **`server/routers/catalog.ts`** (the string passed as `systemPrompt` to the LLM in the `selectProducts` mutation, ~lines 225–239).
- No change to the main chat/design agent prompt (agent-chat-engine) in this story.

## Industry reference (how the big ones do it)

| Aspect | Best practice (Anthropic, OpenAI, e‑commerce LLM) |
|--------|---------------------------------------------------|
| **Structure** | Role → Task → Rules (constraints) → Output format. Avoid a single wall of text. |
| **Scope** | Strict: match only what the user asked for. Model/variant in query = exclude other models/variants. |
| **Vocabulary** | Be inclusive for synonyms (USB-C = Type-C, futrola = case); be strict for **entity scope** (iPhone 15 ≠ iPhone 14). |
| **Output** | One clear format (e.g. single JSON line), stated explicitly; optionally 1–2 examples. |
| **Grounding** | Select only from the provided candidate list; never invent indices. |

References (conceptual): Anthropic prompt structure (role, task, constraints, format), OpenAI structured outputs, e‑commerce LLM best practices (strict scope, no over-inclusion, explainability).

## Acceptance criteria

- [x] **P1** Prompt explicitly requires: when the user mentions a **specific model/variant** (e.g. "iPhone 15", "Samsung S24"), include **only** candidates that match that model; **exclude** candidates for other models/variants (e.g. iPhone 14, 16, Pro Max if not asked).
- [x] **P2** Prompt is structured in clear sections: **Role** (one line), **Task** (what to do), **Rules** (vocabulary inclusivity, model-scope strictness, category/match rules, empty-on-no-match), **Output** (exact JSON line format). Optionally one short example for the JSON line.
- [x] **P3** Code comment in `catalog.ts` references this story and states that the prompt enforces model-scope and follows structured prompt best practice.
- [x] **P4** No regression: existing selectProducts behaviour for non–model-specific queries (e.g. "USB-C punjači", "Hoco punjači") remains correct; existing tests pass.

## Test plan

- [x] **T1** Existing `catalog.selectProducts` tests (unit/integration) still pass.
- [x] **T2** Add or extend a test with a **model-specific** query (e.g. "iPhone 15 futrole" / "iPhone 15 cases") and a candidate list that includes both iPhone 15 and non–iPhone 15 items: assert that returned indices only include candidates whose name (or code/brand) clearly match the requested model (iPhone 15), and exclude others. Prefer integration test with mocked LLM response if available; otherwise unit test with a fixed mock response that the parser accepts.

## Files Changed

- `server/routers/catalog.ts` — restructured `selectProducts` system prompt (Role, Task, Rules, Output), added model-scope rule and STORY-130 comment.
- `server/routers/catalog.selectProducts.test.ts` — added STORY-130 T2: model-scope describe with two tests (model-specific query returns only matching indices; system prompt contains Role/Task/Rules/Output and model-scope wording).

## Notes

- **Model-scope rule:** E.g. "iPhone 15 futrole" → product must be for iPhone 15 (name/code/category indicates iPhone 15). "Futrole za iPhone" without a model number can stay inclusive (all iPhone cases) unless we want to narrow later.
- **Backward compatibility:** Synonyms (futrola/case, punjač/charger) and intent (e.g. "auto punjači") stay inclusive; only **entity specificity** (concrete model/variant) is strict.
- **Industry alignment:** Matches how serious e‑commerce and retail tools scope product selection: user says a specific SKU/model → system returns only that scope, not "everything in the same category".
