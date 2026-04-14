# SelectProducts + io.net LLM — gdje smo grešili i kako smo riješili

Kratki vodič za developera koji na drugoj instanci projekta ima isti problem: **catalog.selectProducts** koristi LLM (io.net, model npr. `openai/gpt-oss-120b`) za semantički odabir proizvoda, ali često vraća prazan rezultat ili "LLM nije dostupan", iako API ključevi rade.

---

## 1. Simptomi

- Korisnik upiše upit (npr. "Teracell kućni punjači"), a u UI se prikaže poruka tipa **"LLM nije dostupan — prikazani su najbolji rezultati pretrage"** ili prazan odabir.
- U server logovima: `[selectProducts] Attempt 1/3: no content, retrying...` ili `unrecoverable JSON, retrying...` ili `finish_reason: "length"`.
- Ponekad radi, ponekad ne — **intermitentno** ponašanje.

---

## 2. Gdje smo grešili (uzroci)

### 2.1 Čitanje odgovora samo iz `message.content`

**Problem:** io.net reasoning modeli (npr. gpt-oss-120b) vraćaju:
- **reasoning** u `message.reasoning_content`
- **konačan odgovor** ponekad u `message.content`, a ponekad samo u `reasoning_content` (ili je `content` null).

Ako se čita samo `response.choices[0].message.content`, kad je `content === null` cijeli odgovor se odbaci kao "no content".

**Fix:** Uzeti tekst iz poruke iz više izvora, redom:
1. `message.content` (string, ako postoji i nije prazan)
2. `message.content` ako je **array** (npr. `[{ type: "text", text: "..." }]`) — izvući i spojiti sve `text`
3. `message.reasoning_content` kao fallback

Funkcija tipa `getMessageContent(message)` koja to radi jedinstveno koristi se prije parsiranja.

---

### 2.2 Nedovoljno tokena za odgovor (odsjecanje)

**Problem:** Slali smo `max_tokens: 1024`. Kad treba vratiti **sve** odgovarajuće proizvode (maxSelect=0), model napiše dug reasoning + listu indeksa + JSON. Na 1024 tokena odgovor se **odsječe** (`finish_reason: "length"`), pa nikad ne dođe do završne JSON linije i `message.content` ostane null.

**Fix:** Postaviti **velikodušan** `max_tokens` (npr. **8192**), jedan za sve pozive selectProducts. Model i dalje stane kad završi; mi samo ne smijemo ga pre ranog limita odsjeći.

---

### 2.3 Nema retryja na "loš" odgovor

**Problem:** Jedan poziv = jedan pokušaj. Kad io.net vrati null ili neparsabilan JSON, odmah se vraća greška. Zbog intermitentnosti API-ja, drugi pokušaj često uspije.

**Fix:** Retry petlja (npr. **3 pokušaja**) s kratkom pauzom (npr. 800 ms) između njih. Retry samo kada:
- nema sadržaja (`content` i `reasoning_content` prazni), ili
- JSON se ne može parsirati i best-effort izvlačenje ne nađe `{"indices":[...]}`.

Na mrežne greške već može reagirati postojeći retry u llm layeru.

---

### 2.4 Parsiranje samo "čistog" JSONa

**Problem:** Ponekad model vrati tekst + JSON u istom stringu (npr. rečenica pa `{"indices":[...],"reasoning":"..."}`). `JSON.parse(cijeli_string)` padne.

**Fix:** Ako `JSON.parse(content)` ne uspije, **izvući** JSON iz teksta (npr. tražiti zadnji `{"indices":` i uzeti zatvoreni objekt do odgovarajućeg `}`). Koristiti taj izvučeni string za parsiranje.

---

### 2.5 Limit od 8 proizvoda u agent promptu

**Problem:** U system promptu za agenta (catalog_filter) pisalo je da treba koristiti npr. maxSelect=8 za Story/Square. Korisnik želi vidjeti **sve** odgovarajuće proizvode, ne samo 8.

**Fix:** U agent-chat-engine promptu:
- **Zadano:** `maxSelect: 0` (prikaži sve odgovarajuće).
- Ograničiti na N samo kad korisnik eksplicitno traži (npr. "samo 4 proizvoda").
- U backend selectProducts promptu, kad je maxSelect=0, eksplicitno napisati da treba vratiti **sve** odgovarajuće indekse (no limit).

---

## 3. Sažetak fixova (što implementirati)

| # | Gdje | Što |
|---|------|-----|
| 1 | **Čitanje odgovora** | Ne čitati samo `message.content`. Koristiti i `reasoning_content`, i `content` kao array (izvući sve `text`). Jedna helper funkcija `getMessageContent(msg)`. |
| 2 | **max_tokens** | Za selectProducts koristiti dovoljno velik limit (npr. **8192**), ne 1024, da odgovor ne bude odsječen. |
| 3 | **Retry** | Do 3 pokušaja s pauzom ~800 ms kada je "no content" ili neparsabilan JSON; nakon toga vratiti prazan rezultat + poruku za korisnika. |
| 4 | **Parsiranje** | Ako `JSON.parse(content)` padne, pokušati izvući `{"indices":[...],"reasoning":"..."}` iz teksta (regex ili traženje zadnjeg `{"indices":` + balanced braces) i parsirati to. |
| 5 | **Agent prompt** | Zadano catalog_filter s `maxSelect: 0`; u backend promptu za maxSelect=0 jasno reći "Return ALL matching indices (no limit)". |

---

## 4. Datoteke koje smo mijenjali (za referencu)

- **server/routers/catalog.ts** — selectProducts: getMessageContent, extractIndicesJson, retry petlja, max_tokens 8192, maxNote za "return all", snimanje raw odgovora u `.tmp/ionet-selectProducts/` za debug.
- **client/src/lib/agent-chat-engine.ts** — system prompt za catalog_filter: default maxSelect=0, primjeri i pravila.
- **server/routers/catalog.selectProducts.test.ts** — unit testovi za retry (mock invokeLLM).

---

## 5. Debug ako i dalje ne radi

- U logu provjeriti: šalje li se **max_tokens: 8192** i jesu li u odgovoru **reasoning_content** i/ili **content** ispunjeni.
- Ako je `finish_reason: "length"`, odgovor je opet odsječen — povećati max_tokens ili smanjiti broj kandidata u jednom pozivu.
- Snimiti raw odgovor (cijeli `response` od API-ja) u datoteku kad parsiranje padne, i pogledati točnu strukturu `choices[0].message` (content vs reasoning_content, array vs string).
