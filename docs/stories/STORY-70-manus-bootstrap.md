# STORY-70: Manus — Initial Project Bootstrap & Core Integration

**Status:** ✅ Done
**Created:** 2025-10-02 (retroactive)
**Package:** root (oraicle-retail-promo)
**Agent:** Manus

## What
Bootstrapped the Oraicle Retail Promo app from the Manus webdev template. Integrated core business logic from the Oraicle firstagent project into the Vite + Express + tRPC stack.

## Why
Needed a working full-stack foundation to build the AI-powered retail ad designer on top of.

## Acceptance Criteria
- [x] Express server with tRPC running
- [x] Vite SPA client with React 19
- [x] OAuth auth flow wired
- [x] MySQL database with Drizzle schema
- [x] Core business logic from firstagent integrated

## Files Changed
- `server/_core/index.ts` — Express + tRPC + Vite server
- `server/_core/trpc.ts`, `context.ts`, `cookies.ts`, `oauth.ts` — Server infrastructure
- `server/routers.ts` — Root tRPC router
- `client/src/main.tsx`, `App.tsx` — SPA entry
- `drizzle/schema.ts` — MySQL schema (users table)
- `package.json`, `vite.config.ts`, `drizzle.config.ts`, `tsconfig.json`

## Notes
- Git commits: 69b7ddf (bootstrap), 8d63e56 (firstagent integration)
