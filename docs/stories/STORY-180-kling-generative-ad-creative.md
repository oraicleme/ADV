# STORY-180: Kling AI — Generative Ad Creative from Canvas Products (Industry-Standard Integration)

**Status:** ✅ Done  
**Created:** 2026-03-21  
**Package:** oraicle (server + client)

## What

After the user has **searched, loaded, and chosen products** on the canvas, add an optional path to **generate a final ad creative** using the **Kling** API (image and/or video generation), **grounded in the products currently on the canvas** (names, categories, optional reference imagery). The existing HTML canvas / PNG export pipeline remains the **layout truth**; Kling produces **generative media assets** (e.g. hero still, short motion clip) suitable for paid social or story placements — aligned with how pro tools combine **deterministic templates** with **generative creative**.

**Official reference:** [Kling API — product introduction / quick start](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview)

## Why

Retail promo users often want a **polished visual or motion** beyond template composition. Industry-standard stacks separate **(a)** catalog + selection + brand-safe layout from **(b)** **async generative jobs** with server-held credentials, quotas, and auditable prompts. Kling fits **(b)**; Oraicle canvas stays **(a)**.

## Industry-standard principles (contract)

| Concern | Standard |
|--------|----------|
| **Credentials** | **Server-only** — Access Key + Secret Key never ship to the browser; exchange for short-lived tokens (e.g. JWT) on the server per [Kling dev docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview). Optional **BYOK** in Workspace Settings later, stored like LLM keys (masked), never in repo. |
| **Async jobs** | **Submit task → task id → poll status** (or webhook in a later story). Show progress, timeout, and user-safe errors. |
| **Prompt grounding** | Build prompt + structured metadata from **canvas snapshot**: product names, categories, brand, format (Story/Square), headline/CTA text, locale; optional **reference image URLs** (product thumbnails) only if API supports image-to-video / image-conditioned generation. |
| **Safety & brand** | Reuse Oraicle’s bounded copy (headline length, no raw user system prompts replacing guardrails); log **hashed** task ids, not secrets. |
| **Cost & abuse** | Rate limits per session, max duration/resolution caps, clear “credits / paid API” copy. |
| **UX placement** | Entry point after catalog is ready: e.g. **Export** or **Chat** adjacent **“Generate AI creative (Kling)”** — explicit opt-in, not blocking core export. |

## Non-goals (this story)

- Replacing `AdCanvasEditor` HTML rendering with Kling output as the only ad.
- Running Kling calls from the browser with raw keys.
- Full webhook + persistence to DB (optional follow-up).

## Phased acceptance criteria

### Phase A — Research & env (this story doc + spike)

- [x] Read official Quick Start / auth / endpoints under [developer docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview); note base URL, JWT lifetime, image vs video endpoints, and async response shape.
- [x] Define env vars: `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` (names only in docs — **do not commit values**).

### Phase B — Server: token + health

- [x] Server module: obtain short-lived auth token (or equivalent) from access + secret; unit tests with mocked HTTP.
- [x] `catalog` or new `creative` tRPC: `kling.health` or `kling.getStatus` — returns configured / misconfigured (no secrets in response).

### Phase C — Prompt builder

- [x] Pure function: `buildKlingPromptFromCanvas(context)` — input: `{ products, format, headline, cta, locale, optional imageUrls }` — output: `{ prompt: string, negativePrompt?: string, metadata }` with tests.

### Phase D — Submit + poll

- [x] tRPC: `kling.submitGenerativeJob` / `kling.getJobStatus` — server proxies all Kling calls; client sends only **intent** + canvas snapshot ids or inline summary.
- [x] Handle failure states (429, invalid token refresh, task failed).

### Phase E — Client UX

- [x] Button + modal or Export panel section: “Generate Kling creative”; shows spinner, result URL(s), download; errors surfaced in UI.
- [ ] Optional: attach result as **reference** for future canvas features (separate story).

## Test Plan

- [x] Unit: JWT/prompt builder/mappers with mocks.
- [x] Integration: mock Kling HTTP; no real keys in CI.
- [ ] Manual: one end-to-end with test keys in local `.env.local` only.

## Files Changed

- `server/_core/env.ts` — `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`, `KLING_API_BASE_URL`, `KLING_DEFAULT_VIDEO_MODEL`
- `server/lib/kling-jwt.ts`, `server/lib/kling-jwt.test.ts` — HS256 JWT (`iss`, `exp`, `nbf`)
- `server/lib/kling-client.ts`, `server/lib/kling-client.test.ts` — submit + query task, hashed task ref for logs
- `server/lib/kling-prompt.ts`, `server/lib/kling-prompt.test.ts` — grounded prompt from canvas
- `server/routers/kling.ts` — `kling.health`, `kling.submitVideoJob`, `kling.getVideoJobStatus`
- `server/routers.ts` — register `kling` router
- `client/src/components/KlingCreativeSection.tsx` — Export tab UI + polling
- `client/src/components/ExportPanel.tsx`, `client/src/components/AdCanvasEditor.tsx` — pass canvas context

## Notes

- **`.env.local` format:** variables must be `KEY=value` on one line each. Do **not** use lines like `Access Key: …` / `Secret Key: …` — they are not valid dotenv. Use e.g. `KLING_ACCESS_KEY=…` and `KLING_SECRET_KEY=…` after rotating any keys that were pasted into chat or committed.
- **Relationship to canvas:** Kling output is a **creative asset**; the current pipeline remains the **canonical** structured ad for compliance and re-edit. Product “listed in canvas” is the **single source of truth** for grounding the generative prompt.
- **Industry alignment:** Same **BFF** pattern as Google Vertex / Meta Marketing API integrations — browser talks only to Oraicle; Oraicle holds vendor credentials and returns opaque job ids + normalized status.

## References

- [Kling API — Quick start / overview](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview)
