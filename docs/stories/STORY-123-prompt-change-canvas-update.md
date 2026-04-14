# STORY-123: Canvas se ne ažurira nakon promjene prompta

**Status:** ✅ Done
**Created:** 2026-03-12
**Package:** oraicle-retail-promo (client)

## What

Kada korisnik pošalje **novi** prompt u AI Design Assistant chatu (npr. prvo "reklama za type-c auto punjače", pa zatim "reklama za Denmen držače za kola"), agent ispravno odgovara i prikazuje "N changes applied" — ali **sadržaj canvasa se ne mijenja**: naslov, proizvodi, layout ostaju oni od prijašnjeg odgovora (ili default). Canvas treba prikazivati sadržaj koji odgovara **zadnjem** promptu i odgovoru agenta.

## Why

Korisnik očekuje da svaka nova poruka u chatu dovede do ažuriranog prikaza na canvasu. Ako canvas ostane "zaglavljen" na starom sadržaju, chat i canvas su u neskladu i doživljaj je zbunjujući ("AI kaže da je napravio reklamu za držače, a vidim punjače").

## Relation to STORY-100

STORY-100 rješava pipeline agent → canvas (akcije se uopće ne primjenjuju). Ova priča fokusira se na **slijed promjena**: kad korisnik pošalje drugi (treći, …) prompt, canvas mora prikazati rezultat **tog** odgovora, ne prethodnog.

## Acceptance Criteria

- [x] Nakon slanja novog prompta, canvas prikazuje naslov / badge / layout / proizvode koji odgovaraju **zadnjem** odgovoru agenta.
- [x] Ako agent vrati `catalog_filter` s novim `resolvedIndices`, canvas prikazuje odabrane proizvode za taj odgovor (ne za prethodni).
- [x] Ako agent vrati `block_patch` (headline, cols, itd.), te promjene se vide na canvasu za taj turn.
- [x] Nema regresije: prvi prompt i dalje ispravno ažurira canvas (ako je STORY-100 gotov).

## Test Plan

- [x] Manual: Pošalji prvi prompt (npr. "reklama za punjače") → provjeri da se canvas ažurira. Pošalji drugi prompt (npr. "reklama za držače") → provjeri da se canvas ažurira na novi sadržaj (naslov, proizvodi).
- [x] Manual: Promijeni "Cols" u chatu (npr. "3 kolone") → provjeri da se broj kolona na canvasu promijeni.
- [x] Unit / integracija: Ako postoji test za `handleChatSend` ili `applyAgentActions` s više uzastopnih odgovora, provjeri da se state za canvas ažurira za svaki odgovor.

## Files Changed

- `client/src/components/AgentChat.tsx` — (1) Turn-id guard: only apply agent actions when the response belongs to the latest chat turn; (2) wrap `applyAgentActions` in `flushSync` so canvas state commits immediately; (3) on stale turn, remove optimistic user message and clear pending.

## Notes

- Screenshot: chat pokazuje dva različita prompta i dva odgovora agenta; canvas (ili prikaz) i dalje pokazuje stari naslov "Brzo punjenje za tvoj aut" i proizvode koji ne odgovaraju drugom promptu (Denmen držači). "Cols 3" odabrano u UI-u, ali grid se može prikazivati u 2 kolone — moguće dvije manifestacije istog buga (state se ne primjenjuje / ne ažurira za novi turn).
- Provjeriti: je li problem u tome što se akcije drugog turna ne šalju u canvas, ili što se state "nadmašuje" / ne koristi zadnji odgovor (npr. stale closure, pogrešan message ID, batching).
- Povezano: `AgentChat.tsx` (handleChatSend, state za canvas), `applyAgentActions` u `agent-actions.ts`, moguće `AdCanvasEditor` props (da prima ažurirani config za svaki turn).
