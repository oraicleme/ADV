# STORY-177: Catalog API — Server-Proxied Test Connection

**Status:** ✅ Done  
**Created:** 2026-03-21  
**Package:** oraicle (server + client)

## What

Add a **tRPC mutation** that performs a **GET** to the user’s saved Catalog API base URL (with optional auth headers) **from the Node server**, returning HTTP status, content type, and a short body preview — plus **basic SSRF guards** (block loopback / private targets in production).

Update **Workspace Settings → Import** with a **Test connection** action and refreshed copy so users can validate URL and credentials before full sync exists.

## Why

STORY-174 persisted URL/auth only; users need to know the endpoint is reachable and authorized. Proxying through the server avoids browser CORS limits and keeps the door open for a later full ingest pipeline.

## Acceptance Criteria

- [x] `catalog.testExternalCatalogConnection` accepts base URL + optional auth header name/value; GET with timeout; bounded body preview; no full response buffering beyond preview limit.
- [x] Production mode blocks requests to loopback, RFC1918, and link-local targets (hostname or resolved IPv4).
- [x] Settings → Import exposes **Test connection** with clear success/error feedback; secrets stay masked except where user already revealed them.
- [x] Unit tests cover happy path (mocked fetch), invalid URL, and blocked URL in production mode.

## Test Plan

- [x] `pnpm vitest run` for new server tests + existing suite (898 passed)
- [x] Manual: invalid URL shows error; mock API returns 200 shows preview snippet

## Files Changed

- `server/lib/external-catalog-connection.ts` — GET probe, SSRF checks, streaming body preview
- `server/lib/external-catalog-connection.test.ts` — new
- `server/routers/catalog.ts` — `testExternalCatalogConnection` mutation
- `client/src/components/CatalogApiImportStubSection.tsx` — Test connection + hint UI

## Notes

- Full catalog sync (pagination, mapping, indexer) is a follow-up story; this is **connectivity validation only**.
- P6 Enterprise (encrypted vault, org policy, audit) remains separate from this connectivity slice.
