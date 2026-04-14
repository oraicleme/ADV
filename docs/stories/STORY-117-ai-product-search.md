# STORY-117: AI Product Search — Interpret Natural Language in Sidebar

**Status:** 🟡 In Progress
**Created:** 2026-03-12
**Package:** client + server (Retail Promo Designer)

## What

Sidebar search ("Search by name or code") was weak for natural-language queries (e.g. "auto punjači usb-c"). We added an AI step: user can click "Pretraži s AI" (sparkles) to interpret the current query into nameContains + category using the catalog vocabulary, then apply the same filter logic as catalog_filter.

## Why

- User feedback: "ovaj search sto smo napravili nicemu ne vodi, ovo je bas za smece" — fuzzy/search settings alone were not enough.
- Natural language ("sve futrole za iPhone 17", "auto punjači usb-c") needs to map to catalog categories and terms; LLM can do that in one call.

## Acceptance Criteria

- [x] Backend: `catalog.interpretProductSearch` mutation accepts query + categories + sampleNames, returns { nameContains, category } using LLM.
- [x] Sidebar: "Pretraži s AI" button (sparkles) next to search input; on click, call API and set search text + category filter from result.
- [x] Instant search improved: category included in searchFields so typing "punjači" matches category "Punjači za auto" without AI.

## Test Plan

- [ ] Manual: Type "auto punjači usb-c", click sparkles → list narrows to that category + name term.
- [ ] Manual: Without AI, type "punjači" → products in Punjači category appear (category in searchFields).

## Files Changed

- `server/routers/catalog.ts` — interpretProductSearch mutation.
- `client/src/components/ProductFilter.tsx` — onAiSearch, aiSearchLoading, Sparkles button.
- `client/src/components/ProductDataInput.tsx` — handleAiSearch, trpc mutation, pass onAiSearch; searchFields include category.

## Notes

- AI is optional: normal fuzzy + category search still works; AI interprets when user explicitly clicks the button.
- If LLM fails, we keep the current search query and do not clear filters.
