# Kontekst projekta za koordinaciju više agenata (Oraicle Retail Promo)

**Svrha:** Jedan dokument koji možeš kopirati ili priložiti drugim agentima da se dogovorite **tko što radi**, **odakle početi** i **što ne dirati**. Tehnički detalji imaju i dalje izvore u repou — ovdje je sažetak + pravila.

**Datum referencije:** 2026-03-24 · **Sljedeći broj priče:** uvijek provjeri **`docs/stories/TRACKER.md`** (zaglavlje *Next story number*; u trenutku pisanja: **210**).

---

## 1. Što je ovaj repozitorij

| Stavka | Opis |
|--------|------|
| **Produkt** | AI-asistirani **retail ad designer**: korisnik bira proizvode, razgovara s agentom (chat), uređuje **canvas** (HTML/CSS), vidi **preview**, **export** (PNG/HTML). |
| **Aktivna aplikacija** | **Root** monorepo (`oraicle-retail-promo`) — **ne** tretirati `packages/*` kao glavni fokus osim ako zadatak eksplicitno ne kaže. |
| **Stack** | Vite 7 + React 19 (klijent), Express + **tRPC 11** (server), Drizzle/MySQL gdje je DB u upotrebi. |
| **Dev** | `pnpm dev` — `tsx watch server/_core/index.ts`; Vite middleware, tipično **http://localhost:3000** (port se može pomaknuti ako je zauzet). |
| **Retail Promo UI** | Ruta **`/agents/retail-promo`** — glavni entry: `AgentChat` + `AdCanvasEditor` + workspace postavke. |

**Investor / due diligence pregled (dublje, “što je shipped”):** `docs/system-overview-vc.md`  
**Što je namjerno odgođeno (nije isto što shipped):** `docs/deferred-features-registry.md`

---

## 2. Arhitektura u jednoj slici

```
Korisnik
  → React (canvas, chat, search, export)
  → tRPC (Express) — catalog, sync, selectProducts, …
  → Vanjski: io.net (LLM), opcionalno Meilisearch, Mobileland (slike), S3 …
```

| Sloj | Uloga | Primarni kod |
|------|--------|----------------|
| **Klijent** | Canvas, chat, MiniSearch / Meilisearch put, preview, export | `client/src/components/`, `client/src/lib/` |
| **Server** | tRPC procedure, LLM za `selectProducts`, Meilisearch servis, image proxy | `server/routers/`, `server/lib/`, `server/_core/` |
| **Pravila workspacea** | Story workflow, Guardian, “no leaking helpers” | `.cursor/rules/*.mdc` |

---

## 3. Workflow obavezan za sve agente

1. **Izvor istine za backlog:** `docs/stories/TRACKER.md`  
   - **Next story number** je u zaglavlju — **ne** pretpostavljati broj iz starog chata.
2. **Nova izmjena = priča:** `.cursor/rules/story-driven-development.mdc`  
   - Prije ili uz kod: `docs/stories/STORY-<n>-<slug>.md`  
   - Testovi uz acceptance criteria; `pnpm test` zeleno prije “Done”.
3. **Guardian sync:** `.cursor/rules/guardian-agent.mdc` — Section 14 mora biti usklađen s trackerom (test: `client/src/lib/guardian-rag-tracker-sync.test.ts`).
4. **Kvaliteta prije mergea / handoffa:** `pnpm run smoke` (= `vitest run` + `vite build`). Ručno: `docs/qa-manual-smoke-retail-promo.md`.

---

## 4. LLM / io.net — tri odvojena “modela” (česta zabuna)

| Funkcija | Gdje | Kako se bira model |
|----------|------|---------------------|
| **Agent chat** (poruke, canvas akcije) | Preglednik | `client/src/lib/agent-chat-engine.ts` → **`CHAT_MODEL_PAIR_BY_MODE`** (Fast / Smart / Custom + `ionet-model-preferences-storage`) |
| **`selectProducts`** (Stage-2 odabir indeksa kandidata) | Server | `server/_core/env.ts` → **`ORAICLE_LLM_MODEL` / `IONET_LLM_MODEL`** → `server/routers/catalog.ts` |
| **Ad copy / canvas AI edit** (pomoćni putovi) | Preglednik | `client/src/lib/ionet-models.ts`, opcionalno **`PUBLIC_IONET_AD_COPY_MODEL`** |

- **Zašto odvojeno:** različiti trošak, latencija i stabilnost po featureu.  
- **Nedavno (STORY-207):** u agent chatu **`gpt-oss-20b`** zamijenjen s **`meta-llama/Llama-3.3-70B-Instruct`** (par s `gpt-oss-120b`).  
- **Server env:** promjena `ORAICLE_LLM_MODEL` / `IONET_LLM_MODEL` zahtijeva **restart** `pnpm dev`.

Detalji: `docs/handoff-new-agent-2026-03-21.md` — odjeljak **§4b**.

---

## 5. Pretraga i katalog (kratko)

- **Arhitektura (manual vs agent, Meilisearch, selectProducts):** `docs/search-architecture-technical-hr.md`  
- **Roadmap (što je shipped 196–201, RAG-lite):** `docs/search-improvements-roadmap.md`, `docs/search-rules-rag-roadmap.md`  
- **Agent chat + workspace tools (modeli, prompts):** STORY-183+ u trackeru; komponente `ChatWorkspaceTools`, `IonetModelsSettingsSection`, `PromptInspectorSection`.

---

## 6. Ključne datoteke po temi

| Tema | Lokacije |
|------|----------|
| Canvas / predložak / export | `AdCanvasEditor.tsx`, `ad-templates.ts`, `canvas-pages.ts`, `preview-html.ts`, `export-image.ts`, `export-image-resolution.ts` |
| Agent chat | `AgentChat.tsx`, `agent-chat-engine.ts`, `agent-actions.ts` |
| tRPC catalog | `server/routers/catalog.ts` (`selectProducts`, Meilisearch, sync …) |
| io.net klijent | `client/src/lib/ionet-client.ts` |
| Env (server LLM) | `server/_core/env.ts`, root `.env.local` (ne commitati tajne) |

---

## 7. Kako se dogovoriti s drugim agentima (praksa)

1. **Jedan story broj = jedan vlasnik** — prije paralelnog rada provjeri tracker i chat da se ne sudaraju **isti STORY-* ili isti moduli**.  
2. **Grana / PR:** jasno ime (npr. `story-210-...`); opis: što, zašto, kako testirati.  
3. **Handoff u jednoj rečenici:** “Završio STORY-XXX; sljedeći korak YYY; blokator Z.”  
4. **Parkirane priče** u trackeru (**🟦 Parked**) — tretirati kao **neaktivne** osim eksplicitnog PM reopena.  
5. **Legacy aspirational (npr. 93–97)** — ne planirati bez triagea s `deferred-features-registry.md`.

---

## 8. Copy-paste prompt za novog agenta (kratki)

Za puni blok (prošireno) koristi **`docs/handoff-new-agent-2026-03-21.md` → §6**. Minimalno:

```
Repo: Oraicle root app (retail-promo). TRACKER.md = next story id. Story file + tests required.
Retail Promo: /agents/retail-promo. LLM: chat = agent-chat-engine CHAT_MODEL_PAIR; server selectProducts = ENV llm model.
Smoke: pnpm run smoke. Read handoff-new-agent-2026-03-21.md §4b for LLM split.
Task: <OPIS>
```

---

## 9. Što očekivati u devu

- **`[Auth] Missing session cookie`** bez prijave — **normalno** za mnoge lokalne tokove.  
- **Integracijski testovi** s pravim API ključem — opcionalno, vidi `package.json` skripte (`test:integration`).

---

*Ovaj dokument je namjerno kratak u odnosu na cijeli codebase; za dubinu koristi linkane `docs/*` i izvorni kod.*
