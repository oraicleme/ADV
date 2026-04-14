# STORY-105: Mobileland.me Product Images — Magento REST API Integration

**Status:** ✅ Done  
**Created:** 2025-03-10  
**Package:** oraicle-retail-promo (server + client)

---

## What

Replace the current HTML-scraping approach (`mobileland-images.ts`) with a proper Magento 2 REST API integration that fetches product images via OAuth 1.0 authenticated requests. The API returns SKU + media gallery entries; the client maps product codes (SKUs) to constructed image URLs.

## Why

The current approach fetches each product's HTML page individually (`/{code}.html`) and scrapes `og:image`. This is slow (N requests for N products), fragile (breaks on HTML changes), and unreliable (CORs issues from browser, no auth). The Magento REST API returns all products + images in a single authenticated call, is stable, and is the officially supported way to get catalog data.

---

## Architecture

```
Browser → tRPC call → Server proxy → Magento REST API (OAuth 1.0)
                                         ↓
                                   JSON response
                                         ↓
                              Server returns SKU→imageUrl map
                                         ↓
                              Client sets mobilelandImageUrls
```

OAuth 1.0 signing MUST happen server-side (secrets can't be in the browser).

---

## Acceptance Criteria

- [x] **Server**: New tRPC procedure `catalog.getMobilelandImages` that:
  1. Reads OAuth 1.0 credentials from `process.env` (see env vars below)
  2. Signs the request with OAuth 1.0 (HMAC-SHA256) per RFC 5849
  3. Calls: `GET https://mobileland.me/rest/V1/products?searchCriteria[pageSize]=100&fields=items[sku,name,media_gallery_entries[file]]`
  4. Parses the response and returns a map: `Record<string, string>` where key = SKU, value = full image URL
  5. Image URL construction: `https://mobileland.me/media/catalog/product/{file}` where `{file}` comes from `media_gallery_entries[0].file` (e.g. `/1/0/1035914_21404_.jpg`)
  6. Supports pagination: if the catalog has >100 products, iterate pages via `searchCriteria[currentPage]`
  7. Caches the result in memory for 5 minutes (avoid hammering the API on every page load)

- [x] **Client**: Update `client/src/lib/mobileland-images.ts` to call the tRPC procedure instead of HTML-scraping:
  1. New function `fetchMobilelandImageMap(): Promise<Record<string, string>>` that calls the tRPC endpoint
  2. `getProductImageUrl(code)` now looks up the code in the cached map (no individual fetches)
  3. Keep `isMobilelandImageEnabled()` — enabled when `VITE_MOBILELAND_ENABLED=1`

- [x] **Integration**: Update `AgentChat.tsx` useEffect (line ~498) to use the new approach:
  1. Fetch the full SKU→URL map once on mount via `trpc.catalog.getMobilelandImages.useQuery()`
  2. Map each product's `code` to the image URL from the map
  3. Set `mobilelandImageUrls` as before

- [x] **Env vars**: All 4 OAuth tokens + base URL read from `.env.local` (already added):
  ```
  MOBILELAND_BASE_URL=https://mobileland.me
  MOBILELAND_CONSUMER_KEY=...
  MOBILELAND_CONSUMER_SECRET=...
  MOBILELAND_ACCESS_TOKEN=...
  MOBILELAND_ACCESS_TOKEN_SECRET=...
  ```

---

## Technical Details

### Magento REST API

**Endpoint:**
```
GET https://mobileland.me/rest/V1/products
  ?searchCriteria[pageSize]=100
  &searchCriteria[currentPage]=1
  &fields=items[sku,name,media_gallery_entries[file]]
```

**Authentication:** OAuth 1.0 with HMAC-SHA256 signature method.  
The `Authorization` header must contain all OAuth params:
```
OAuth oauth_consumer_key="...",
      oauth_token="...",
      oauth_signature_method="HMAC-SHA256",
      oauth_timestamp="...",
      oauth_nonce="...",
      oauth_version="1.0",
      oauth_signature="..."
```

**Signing process (RFC 5849):**
1. Collect all OAuth params + query params
2. Sort alphabetically by key
3. Build parameter string: `key1=val1&key2=val2&...`
4. Build signature base string: `GET&{percent_encode(base_url)}&{percent_encode(param_string)}`
5. Build signing key: `{percent_encode(consumer_secret)}&{percent_encode(token_secret)}`
6. Sign with HMAC-SHA256, base64-encode the result

**Response shape:**
```json
{
  "items": [
    {
      "sku": "1035914",
      "name": "Denmen 360 Car Holder",
      "media_gallery_entries": [
        { "file": "/1/0/1035914_21404_.jpg" },
        { "file": "/1/0/1035914_21404_2.jpg" }
      ]
    }
  ],
  "total_count": 6213
}
```

**Image URL construction:**
```
https://mobileland.me/media/catalog/product + file
= https://mobileland.me/media/catalog/product/1/0/1035914_21404_.jpg
```
Use the FIRST entry in `media_gallery_entries` as the primary product image.

### OAuth 1.0 Implementation

Use Node.js `crypto` module for HMAC-SHA256. Do NOT add a dependency for this — the signing is straightforward:

```typescript
import crypto from 'crypto';

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function buildOAuthHeader(method: string, url: string, queryParams: Record<string, string>, oauth: {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: oauth.consumerKey,
    oauth_token: oauth.token,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Combine oauth + query params, sort, encode
  const allParams = { ...oauthParams, ...queryParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const baseUrl = url.split('?')[0];
  const signatureBase = `${method}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(oauth.consumerSecret)}&${percentEncode(oauth.tokenSecret)}`;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');
}
```

### Server-side file location

Create: `server/lib/mobileland-api.ts`  
Add tRPC procedure in: `server/routers/catalog.ts`

### Pagination

The Magento API returns `total_count`. If `total_count > pageSize`:
```
page 1: searchCriteria[currentPage]=1
page 2: searchCriteria[currentPage]=2
...
```
Fetch all pages, merge results into one map.

### Caching

Use a simple in-memory cache with TTL:
```typescript
let cache: { data: Record<string, string>; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

---

## Files Changed

- `server/lib/mobileland-api.ts` — **NEW**: OAuth 1.0 signing, Magento API client, image URL construction, in-memory cache
- `server/lib/mobileland-api.test.ts` — **NEW**: 20 unit tests — OAuth signing, URL construction, pagination, cache TTL
- `server/routers/catalog.ts` — Added `getMobilelandImages` publicProcedure
- `server/_core/env.ts` — Added 5 MOBILELAND_* env vars
- `client/src/lib/mobileland-images.ts` — Rewritten: `isMobilelandImageEnabled()` reads `VITE_MOBILELAND_ENABLED`, `fetchMobilelandImageMap()` calls tRPC endpoint
- `client/src/components/AgentChat.tsx` — Replaced per-product fetch loop with `trpc.catalog.getMobilelandImages.useQuery()` hook + map lookup useEffect
- `.env.local` — Added `VITE_MOBILELAND_ENABLED=1`

---

## Test Plan

- [x] Unit test: OAuth 1.0 signature generation produces valid HMAC-SHA256
- [x] Unit test: Image URL construction from media_gallery_entries
- [x] Unit test: Pagination logic (total_count > pageSize → multiple pages)
- [x] Unit test: Cache returns stale data within TTL, refetches after expiry
- [ ] Integration test: Real API call to mobileland.me returns products with images (mark as `.integration.test.ts`)
- [ ] E2E: Load Excel catalog → product images appear automatically from mobileland.me

---

## Prompt for New Agent

```
Task: Implement Mobileland.me Magento REST API integration for product images.

Read STORY-105 at docs/stories/STORY-105-mobileland-product-images-api.md for full details.

Summary:
1. Create server/lib/mobileland-api.ts:
   - OAuth 1.0 HMAC-SHA256 request signing (use Node crypto, no external deps)
   - Fetch GET https://mobileland.me/rest/V1/products with pagination
   - Parse response: map SKU → image URL (base + media_gallery_entries[0].file)
   - In-memory cache with 5min TTL

2. Add tRPC procedure in server/routers/catalog.ts:
   - catalog.getMobilelandImages → returns Record<string, string> (sku → imageUrl)

3. Update server/_core/env.ts to read MOBILELAND_* env vars

4. Rewrite client/src/lib/mobileland-images.ts:
   - Call tRPC endpoint instead of HTML-scraping
   - Keep isMobilelandImageEnabled() API

5. Update AgentChat.tsx useEffect (~line 498) to use new tRPC-based approach

OAuth credentials are in .env.local (MOBILELAND_CONSUMER_KEY, etc.).
Image URL = https://mobileland.me/media/catalog/product + file from API.

Write tests BEFORE or alongside implementation. Run tests to confirm.
```

---

## Notes

- The existing `mobileland-images.ts` works by HTML-scraping individual product pages. This story replaces that with a proper API approach. Keep the old code as fallback until the API is confirmed working.
- OAuth 1.0 is different from OAuth 2.0 — it requires request signing per RFC 5849, not just bearer tokens.
- The Magento API may have rate limits. The 5-minute cache prevents excessive calls.
- Products are matched by SKU (product `code` field in our data model).
