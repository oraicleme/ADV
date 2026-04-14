# STORY-200: Search — Feedback Loop (Implicit / Explicit)

**Status:** ✅ Done  
**Created:** 2026-03-23  
**Package:** oraicle-retail-promo (client + optional server)

## What

Uvesti mehanizam **povratne informacije** o relevantnosti: implicitno (npr. korisnik uklanja proizvod s oglasa koji je dodao AI) i/ili eksplicitno (oznaka relevantno / nije relevantno). Podaci služe za **analitiku**, kasnije za **prijedlog pravila** (STORY-196) ili podešavanje modela — u prvoj iteraciji bez automatskog treniranja bez ljudske potvrde.

## Why

Dugoročno poboljšanje relevantnosti zahtijeva signal iz stvarnog korištenja; izvještaj predviđa implicitnu i eksplicitnu povratnu spregu.

## Acceptance Criteria

- [x] Definiran događaj / telemetrija (privacy-first, bez osjetljivih sadržaja u čistom tekstu gdje nije potrebno).
- [x] Minimalan UI za eksplicitnu povratnu informaciju **ili** dokumentirano odlaganje uz samo implicitne događaje.
- [x] Opcija: „Predloži pravilo“ koje mapira feedback na STORY-196 format (nije obavezno u istoj iteraciji).

## Test Plan

- [x] Testovi za emitiranje događaja (mock).
- [x] Ručna provjera toka.

## Files Changed

- `client/src/lib/search-feedback.ts` — hash, `collectResolvedIndicesFromCatalogActions`, `logSearchFeedbackImplicitDeselect`, `logSearchFeedbackExplicit`, `buildSuggestedExcludeRuleDraft`.
- `client/src/lib/search-feedback.test.ts`
- `client/src/lib/retail-promo-log.ts` — tipovi `search_feedback_implicit`, `search_feedback_explicit`.
- `client/src/components/AgentChat.tsx` — `lastAgentCatalogSelectionRef`, user vs agent selection setters, telemetry.
- `client/src/components/ProductDataInput.tsx`, `ProductTable.tsx` — thumbs kada postoji zadnji agent upit.
- `client/src/components/SearchSettingsSection.tsx` — kratki opis.
- `docs/search-architecture-technical-hr.md` — STORY-200 odlomak.

## Notes

- Usklađeno s STORY-169 (session log, bez sirovog teksta). Vidi roadmap Faza 4.
