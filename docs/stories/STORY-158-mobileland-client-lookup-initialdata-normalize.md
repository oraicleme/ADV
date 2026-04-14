# STORY-158: Mobileland slike u canvasu — normalizacija šifre + ispravan `initialData`

**Status:** ✅ Done  
**Created:** 2026-03-20  
**Package:** oraicle-retail-promo (client)

## What
- Normalizirati `product.code` prije lookupa u `mobilelandImageMap` (broj iz Excela, NBSP, `1052510.0`).
- `trpc.catalog.getMobilelandImages.useQuery`: `initialData` kao **funkcija** koja vraća podatke (`() => getMobilelandMapFromLocalStorage() ?? undefined`), ne referenca na getter bez poziva.
- Smanjiti `staleTime` mape (npr. 5 min) i uključiti `refetchOnWindowFocus` da se nakon deploya brže povuku nove ključeve.

## Why
Server mapa već sadrži SKU-eve (npr. `1052510`), ali canvas i dalje pokazuje “Add photo”. Uzrok je kombinacija: mogući **Function** kao `data` ako se `initialData` pogrešno proslijedi, i **neusklađen tip** `code` (number vs string) koji lomi `code.trim()` ili lookup.

## Acceptance Criteria
- [x] `normalizeProductCodeForMobilelandLookup` u `mobileland-images.ts` + testovi
- [x] AgentChat koristi normalizaciju u effectu i mismatch banneru
- [x] useQuery opcije ispravljene; vitest za normalizaciju prolazi

## Test Plan
- [x] `pnpm exec vitest run client/src/lib/mobileland-images.test.ts`

## Files Changed
- `client/src/lib/mobileland-images.ts`
- `client/src/lib/mobileland-images.test.ts`
- `client/src/components/AgentChat.tsx`
