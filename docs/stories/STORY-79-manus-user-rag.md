# STORY-79: Manus — User RAG for Personalized Suggestions

**Status:** ✅ Done
**Created:** 2025-10-03 (retroactive)
**Package:** root
**Agent:** Manus
**Phase:** 9

## What
User RAG: DB schema for suggestion history/embeddings, storage/retrieval service, semantic similarity search, RAG context in agent prompts. Uses Chroma for vector embeddings.

## Acceptance Criteria
- [x] Schema: suggestionHistory, suggestionAnalytics tables
- [x] Storage and retrieval service
- [x] Semantic similarity search
- [x] RAG context in agent prompts

## Files Changed
- `drizzle/schema.ts` — suggestionHistory, suggestionAnalytics
- `server/db-rag.ts`, `server/db-rag-search.ts`
- `server/agents/BaseAgent.ts` — RAG in prompts

## Notes
- Git commits: 83e22eb, 1679b3a
