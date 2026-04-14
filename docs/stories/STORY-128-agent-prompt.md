# Prompt za novog agenta — STORY-128

Implementiraj **STORY-128: Preview Follows Canvas — Industry Standard & Full Connection**.

**Gdje:** Pročitaj cijelu priču: `docs/stories/STORY-128-preview-follows-canvas-industry-standard.md`

**Workflow:** Slijedi story-driven development (`.cursor/rules/story-driven-development.mdc`): priča već postoji, piši testove uz implementaciju, na kraju označi acceptance criteria i test plan u priči.

**Cilj:** Preview pane (desno) mora prikazivati **isto što i canvas** za trenutnu stranicu. Sada kod multi-page canvas canvas pokazuje jednu stranicu (npr. 6 proizvoda), a preview i dalje sve proizvode u jednom HTML-u. Preview = ono što canvas prikazuje = ono što export daje za tu stranicu.

---

## Što napraviti (redom)

### 1. Lift current page u AgentChat

U `AgentChat.tsx` dodaj state: `currentPageIndex` (npr. 0). Proslijedi `AdCanvasEditor`u: `currentPageIndex` i `onCurrentPageChange` (callback kad korisnik promijeni stranicu na canvasu).

### 2. AdCanvasEditor controlled mode

U `AdCanvasEditor.tsx`: ako primaju `currentPageIndex` i `onCurrentPageChange` iz propsa, koristi ih umjesto lokalnog state-a (controlled). Ako nisu proslijeđeni, ostani na postojećem lokalnom state-u (backward compatible).

### 3. Preview HTML od trenutne stranice

U `AgentChat.tsx`:

- Ako postoji `htmlPerPage` i `htmlPerPage.length > 1`:
  - `previewHtmlToShow = generatedHtml ?? htmlPerPage[currentPageIndex] ?? livePreviewHtml`
  - (preview = HTML trenutne stranice kad je multi-page).
- Inače (single-page):
  - `previewHtmlToShow = generatedHtml ?? livePreviewHtml`
  - (bez regresije).

### 4. Testovi

- **T1:** Kad `htmlPerPage` ima 2 elementa, za `currentPageIndex === 0` preview HTML je `htmlPerPage[0]`, za `currentPageIndex === 1` je `htmlPerPage[1]`.
- **T2:** Kad `htmlPerPage` je undefined, preview HTML je `livePreviewHtml`.

Možeš testirati logiku u izolaciji (npr. funkciju koja računa `previewHtmlToShow`) ili u postojećem `canvas-multipage-export.test.ts` / novom test fajlu.

### 5. (Opcionalno) P5

U Preview modu, kad je multi-page: prikaži "Page N of M" i prev/next da korisnik može listati stranice u previewu; pri povratku u Edit, canvas već koristi isti `currentPageIndex`.

---

## Datoteke

- `client/src/components/AgentChat.tsx` — state, `previewHtmlToShow`, props za editor
- `client/src/components/AdCanvasEditor.tsx` — controlled `currentPageIndex`
- Test(ovi) za T1–T2

Na kraju ažuriraj priču: check off P1–P4 (i P5 ako urađen), T1–T2, Files Changed, i u `docs/stories/TRACKER.md` premjesti 128 u Done kad su svi kriteriji i testovi gotovi.
