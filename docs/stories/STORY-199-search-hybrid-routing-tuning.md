# STORY-199: Search — Hybrid Routing & Threshold Tuning

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (server + docs + optional client)

## What

Pregledati i **dokumentirati** ponašanje **hybrid** Meilisearch konfiguracije i **smart routinga** (preskok `selectProducts` kada su svi kandidati iznad confidence praga): `isHybridConfigured`, `MEILI_CONFIDENCE_THRESHOLD`, noise floor u `AgentChat`. Po potrebi **podesiti** zadane vrijednosti ili dodati **korisnički vidljiv** opis u Workspace Settings (bez obveznog izlaganja svih env varijabli).

## Why

Ispravno korištenje hibrida poboljšava i brzinu i kvalitetu; nejasne pragove teško je podržati u produkciji.

## Acceptance Criteria

- [x] Dokumentacija u `docs/` ili proširenje `search-architecture-technical-hr.md` s parametrima i učinkom.
- [x] Provjera usklađenosti koda i env varijabli (npr. confidence threshold).
- [x] Po odluci tima: mali UI tekst ili „Advanced“ sekcija u postavkama **ili** eksplicitno „ostaje samo env“ s jasnim README.

## Test Plan

- [x] Postojeći testovi prolaze; po potrebi novi test za helper koji računa „skip LLM“.

## Files Changed

- `client/src/lib/meilisearch-smart-routing.ts` — `shouldSkipSelectProductsLLM`, zajednički prag s `AgentChat`.
- `client/src/lib/meilisearch-smart-routing.test.ts` — import iz modula.
- `client/src/components/AgentChat.tsx` — koristi helper + `searchProvider`.
- `client/src/components/SearchSettingsSection.tsx` — kratki opis server/hybrid/threshold (read-only).
- `server/_core/env.ts` — komentar za legacy `MEILI_EMBEDDING_MODEL`.
- `docs/search-architecture-technical-hr.md` — detalji hybrid, env, noise floor.

## Notes

- Djelomično se preklapa s postojećim STORY-137/138 — ova priča je **operacionalizacija i UX dokumentacije**. Vidi roadmap Faza 3.
