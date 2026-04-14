# Manual smoke — Retail Promo (`/agents/retail-promo`)

**When:** Before release or after large search/chat/canvas changes.  
**Automated prerequisite:** `pnpm run smoke` (Vitest + Vite production build) must pass.

## Environment

- Dev server: `pnpm dev` → `http://localhost:3000` (or `PORT` from env).
- **Auth:** Logged-out browsing is supported for many flows; `[Auth] Missing session cookie` in dev is expected without login (`docs/handoff-new-agent-2026-03-21.md`).

## Checklist (≈5–10 min)

| Step | Action | Pass criteria |
|------|--------|----------------|
| 1 | Open `/agents/retail-promo` | Page loads; Chat + canvas region visible |
| 2 | **Chat:** send a short message (e.g. “hi”) | Response area updates without hard error |
| 3 | **Header:** switch **Fast / Smart / Custom** if shown | Mode changes without crash (Custom may need API key) |
| 4 | **Workspace tools** (collapsible): expand | Search sliders / brief / BYOK sections render |
| 5 | **Settings tab** (or navigate Settings) → **Models** | List loads or empty-state copy; no unhandled exception |
| 6 | **Add Products** or Products search | Type a query; list filters (MiniSearch path) |
| 7 | Optional: **Export** | Open export UI; no immediate crash (full PNG export optional) |

## Out of scope for this checklist

- Full OAuth / billing flows  
- Meilisearch-only paths unless env configured  
- Visual pixel comparison  

Record failures with console + network screenshot and story id if known.
