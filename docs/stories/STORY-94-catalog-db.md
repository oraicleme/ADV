# STORY-94: Database Integration for Catalog

**Status:** 📋 Pending
**Created:** 2026-03-09
**Package:** root
**Phase:** 12

## What
Full CRUD for externalAPIConfigs, catalogProducts, catalogSyncLogs, catalogSyncSchedules. Sync scheduler (cron), incremental sync, status tracking.

## Why
STORY-80 built schema/connector but deferred persistence. Data needs stored and synced on schedule.

## Notes
- Depends on STORY-80
- Schema exists in drizzle/schema-catalog.ts
