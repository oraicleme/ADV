# Product Search — Library Evaluation

## Current Implementation

We use **custom in-app search** in `client/src/lib/product-search.ts`:

- **Tokenization**: normalize (lowercase + strip diacritics), collapse joiners (USB-C → usbc), tokenize on whitespace.
- **Scoring**: Levenshtein-based token score (exact, prefix, substring, typo tolerance), combined with coverage ratio (avg × 0.6 + coverage × 0.4).
- **Relevance (STORY-111)**: Connector/spec mismatch penalty (e.g. USB-C vs Lightning), product-type penalty (charger intent vs adapter/cable).
- **Diacritics**: Balkan characters (č, ž, š, đ, ć) mapped to ASCII so "punjaci" and "punjači" match.

No Elasticsearch or external search service: everything runs client-side so it works offline and with no backend dependency for search.

---

## Industry Options Considered

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| **Elasticsearch** | Industry standard, full-text, faceting, scale | Server required, ops cost, overkill for &lt;10k products in browser | No (we need client-side) |
| **Algolia** | Hosted, typo-tolerant, instant | Cost, vendor lock-in, network dependency | No (offline / no API) |
| **MiniSearch** (npm) | Full-text, fuzzy, prefix, processTerm (diacritics), ~20KB, 800k+ weekly downloads | Need to wire our relevance (connector/product-type) on top | Yes, if we want a maintained engine |
| **uFuzzy** (npm) | Tiny (~7.5KB), fuzzy, latinize for diacritics | No built-in field weighting or “relevance” layer | Yes, for fuzzy-only |
| **Fuse.js** | Simple, fuzzy, no deps | Weaker relevance, no token/field model like ours | Partial |

---

## Why We Stayed Custom (For Now)

1. **Relevance rules** (STORY-111) are specific: connector mismatch, charger vs adapter. These are easy to keep in one place in our code; plugging them into MiniSearch/uFuzzy would require a post-filter or custom scorer.
2. **Single code path** for manual search and `catalog_filter`: same `filterProductsIntelligent` / `searchProducts`, same diacritics and tokenization.
3. **No extra dependency**: one less package to upgrade and no API surface to learn.
4. **Diacritics** are now unified: "auto punjaci" and "auto punjači" behave the same; we use one `normalize()` everywhere (including agent-actions catalog_filter).

---

## When to Revisit

- **Scale**: If we grow to 50k+ products or need server-side search, consider MiniSearch on the server or Elasticsearch.
- **Features**: If we need proper stemming (e.g. Serbian/Croatian), phrase search, or faceted search, MiniSearch or Elasticsearch would add value.
- **Maintenance**: If our custom scoring becomes hard to maintain, we can replace the “scoring core” with MiniSearch and keep our relevance multiplier on top.

---

## References

- [MiniSearch](https://github.com/lucaong/minisearch) — `processTerm` for diacritics.
- [uFuzzy](https://github.com/leeoniya/uFuzzy) — fuzzy + latinize.
- [Fuse.js](https://fusejs.io/) — lightweight fuzzy search.
- [modern-diacritics](https://www.npmjs.com/package/modern-diacritics) — accent removal (we use our own map for Balkan coverage).
