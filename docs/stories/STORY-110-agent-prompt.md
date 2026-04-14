# STORY-110 — Agent Prompt (paste into new chat)

---

```
Read STORY-110 at docs/stories/STORY-110-search-precision-usb-c-compound-tokens.md before starting.

CONTEXT:
  The system is already hybrid LLM+fuzzy: agent LLM generates catalog_filter {nameContains, category},
  client fuzzy executes it. No new LLM calls needed. Two bugs to fix.

BUG A (root cause): The LLM picks nameContains from the USER's words ("USB-C") instead of the
  CATALOG's words ("Type-C Punjač" if that's how the catalog names it). This is because
  sampleNames currently shows only 2 products per category — the LLM can't see enough of the
  catalog's vocabulary to translate.

BUG B (technical): tokenize("USB-C") → ["usb","c"]. The "c" token is noise, causing Bluetooth
  adapters to score 0.50 on a "USB-C" query (just from matching "usb") and pass the 0.40 threshold.

IMPLEMENT ALL 4 FIXES IN ORDER:

══════════════════════════════════════════════════════════════════
FIX 1 — client/src/components/AgentChat.tsx — more sampleNames
══════════════════════════════════════════════════════════════════

In the `catalogSummary` useMemo, change sampling from 2 per category / 30 total to
5 per category / 60 total.

BEFORE:
  // 2 sample names per category (up to 30 total) ...
  const sampleNames: string[] = [];
  const seenCatCount = new Map<string, number>();
  for (const p of products) {
    if (sampleNames.length >= 30) break;
    const cat = p.category ?? 'Bez klasifikacije';
    const n = seenCatCount.get(cat) ?? 0;
    if (n < 2) {
      sampleNames.push(p.name);
      seenCatCount.set(cat, n + 1);
    }
  }

AFTER:
  // 5 sample names per category (up to 60 total) — gives LLM enough vocabulary
  // to translate user terminology into catalog terminology (e.g. user says "USB-C"
  // but catalog uses "Type-C": LLM sees the Type-C samples and uses them in nameContains)
  const sampleNames: string[] = [];
  const seenCatCount = new Map<string, number>();
  for (const p of products) {
    if (sampleNames.length >= 60) break;
    const cat = p.category ?? 'Bez klasifikacije';
    const n = seenCatCount.get(cat) ?? 0;
    if (n < 5) {
      sampleNames.push(p.name);
      seenCatCount.set(cat, n + 1);
    }
  }

══════════════════════════════════════════════════════════════════
FIX 2 — client/src/lib/agent-chat-engine.ts — catalog vocabulary rule
══════════════════════════════════════════════════════════════════

In the AGENT_SYSTEM_PROMPT, find the PRODUCT CATALOG INTELLIGENCE section.
Find the "⚠️ CRITICAL — ALWAYS INCLUDE CATEGORY" paragraph.
IMMEDIATELY AFTER IT, insert this new paragraph:

  ⚠️ USE CATALOG VOCABULARY IN nameContains — NOT THE USER'S WORDS:
  Before writing nameContains, scan sampleNames. If user says "USB-C" but sampleNames show
  "Type-C Punjač za Auto", use "Type-C" — that is what the catalog calls it. If sampleNames
  show "USB-C Punjač 20W", then "USB-C" is correct. The catalog's spelling always wins.
  Connector terms (USB-C, Type-C, Lightning, Micro-USB, HDMI) are specs, not brands.
  They MUST always be paired with a category — alone they return every product with that
  connector across all categories (cables, chargers, adapters, hubs).
    Correct: { "nameContains": "Type-C", "category": "Punjači za auto" }
    Wrong:   { "nameContains": "USB-C", "category": "" }

Also ADD these four lines to the "More examples" block (after the existing examples):
  User: "USB-C punjače za kola" (sampleNames show "Type-C Punjač za Auto") →
    { "nameContains": "Type-C", "category": "Punjači za auto", "maxSelect": 8, "deselectOthers": true }
  User: "USB-C punjače za kola" (sampleNames show "USB-C Punjač 20W") →
    { "nameContains": "USB-C", "category": "Punjači za auto", "maxSelect": 8, "deselectOthers": true }
  User: "Bluetooth slušalice" → { "nameContains": "Bluetooth", "category": "Audio", "maxSelect": 8, "deselectOthers": true }
  User: "Lightning kablove" → { "nameContains": "Lightning", "category": "Kablovi", "maxSelect": 8, "deselectOthers": true }

══════════════════════════════════════════════════════════════════
FIX 3 — client/src/lib/product-search.ts — compound token (hyphens)
══════════════════════════════════════════════════════════════════

In the `tokenize()` function, add hyphen stripping BEFORE the non-alphanum-to-space replacement:

BEFORE:
  return normalize(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

AFTER:
  return normalize(s)
    .replace(/[-–_]/g, '')           // collapse joiners: USB-C → usbc, LV-B15B → lvb15b
    .replace(/[^a-z0-9\s]/g, ' ')   // strip remaining special chars
    .split(/\s+/)
    .filter((t) => t.length > 0);

VERIFY: tokenize("USB-C") === ["usbc"]  (not ["usb","c"])
VERIFY: tokenize("LV-B15B 5.0") === ["lvb15b","5","0"]
VERIFY: tokenize("Denmen 360 Holder") === ["denmen","360","holder"]  (unchanged)

══════════════════════════════════════════════════════════════════
FIX 4 — client/src/lib/agent-actions.ts — single-term substring fast path
══════════════════════════════════════════════════════════════════

In the `case 'catalog_filter':` block, replace the line:
  const byName: number[] = nameQ.length > 0
    ? filterProductsIntelligent(allProducts, nameQ, { ... })
    : allProducts.map((_, i) => i);

WITH this logic (add the normalizeForSubstring helper at the top of the case block):

  function normalizeForSubstring(s: string): string {
    return s.toLowerCase().replace(/[-–_]/g, '').trim();
  }

  const qNorm = normalizeForSubstring(nameQ);
  const isSingleTerm = nameQ.length > 0 && !nameQ.includes(' ');

  const byName: number[] =
    nameQ.length === 0
      ? allProducts.map((_, i) => i)
      : isSingleTerm
        ? (() => {
            // Single-word nameContains: require substring match first (precise)
            // Fuzzy only as fallback when substring finds nothing
            const sub = allProducts.map((_, i) => i).filter((i) => {
              const p = allProducts[i];
              return (
                normalizeForSubstring(p.name ?? '').includes(qNorm) ||
                normalizeForSubstring(p.code ?? '').includes(qNorm) ||
                normalizeForSubstring(p.brand ?? '').includes(qNorm)
              );
            });
            return sub.length > 0
              ? sub
              : filterProductsIntelligent(allProducts, nameQ, {
                  searchFields: ['name', 'code', 'brand'],
                  fuzzyMatch: true,
                });
          })()
        : filterProductsIntelligent(allProducts, nameQ, {
            searchFields: ['name', 'code', 'brand'],
            fuzzyMatch: true,
          });

NOTE: The normalizeForSubstring function must be defined inside the case block or as a
local function — not at module scope (to avoid TS issues with the existing file structure).
Actually, define it as a const arrow function right inside the case block.

Keep ALL code below (category filter, maxSelect, setSelectedProductIndices) UNCHANGED.

══════════════════════════════════════════════════════════════════
TESTS — client/src/lib/product-search.test.ts
══════════════════════════════════════════════════════════════════

Add a new describe block "compound token precision (STORY-110)" with these tests:

// Fixtures for this block:
const chargerCatalog = [
  { name: 'USB-C Punjač 20W za Auto', code: 'CHG-USBC-20', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Punjač 65W Type-C', code: 'CHG-TC-65', category: 'Punjači za auto', brand: 'Baseus' },
  { name: 'Bluetooth USB Adapter LV-B15B 5.0', code: 'LV-B15B', category: 'Adapteri', brand: 'LV' },
  { name: 'USB-A Punjač 10W', code: 'CHG-USBA-10', category: 'Punjači za auto', brand: 'Hoco' },
  { name: 'Denmen 360 Holder', code: 'DEN-360', category: 'Držači', brand: 'Denmen' },
];

Test 1: tokenize("USB-C") returns ["usbc"]
  expect(tokenize("USB-C")).toEqual(["usbc"]);
  // Need to export tokenize, OR test via searchProducts behavior

Test 2: tokenize("LV-B15B") returns ["lvb15b"]

Test 3: filterProductsIntelligent does NOT return Bluetooth adapter for "USB-C" query
  const results = filterProductsIntelligent(chargerCatalog, "USB-C", {
    searchFields: ['name', 'code', 'brand'],
  });
  const names = results.map(i => chargerCatalog[i].name);
  expect(names).not.toContain('Bluetooth USB Adapter LV-B15B 5.0');

Test 4: filterProductsIntelligent DOES return USB-C charger for "USB-C" query
  expect(names).toContain('USB-C Punjač 20W za Auto');

Test 5: filterProductsIntelligent returns Denmen holder for "Denmen" query (regression)
  const r = filterProductsIntelligent(chargerCatalog, "Denmen", { searchFields: ['name','code','brand'] });
  expect(r.length).toBe(1);
  expect(chargerCatalog[r[0]].name).toBe('Denmen 360 Holder');

NOTE: You may need to EXPORT the `tokenize` function from product-search.ts to test it directly.
Add `export` to the function declaration for tests 1 and 2.

══════════════════════════════════════════════════════════════════
DONE CRITERIA
══════════════════════════════════════════════════════════════════

1. Run: pnpm vitest run client/src/lib/product-search.test.ts
   All new tests pass. All existing tests pass (no regressions).

2. Run: pnpm vitest run
   No new failures introduced.

3. No linter errors: check client/src/lib/product-search.ts,
   client/src/lib/agent-actions.ts, client/src/components/AgentChat.tsx,
   client/src/lib/agent-chat-engine.ts

4. Mark STORY-110 status ✅ Done in docs/stories/STORY-110-search-precision-usb-c-compound-tokens.md
5. Update docs/stories/TRACKER.md (move 110 from In Progress to Done)
```
