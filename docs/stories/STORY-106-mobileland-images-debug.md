# STORY-106: Mobileland Product Images — Debug Why Images Don't Appear on Canvas

**Status:** ✅ Done  
**Created:** 2026-03-10  
**Package:** oraicle-retail-promo (client + server)

---

## What

Product images from mobileland.me are not appearing on the canvas even though:
- The API credentials are in `.env.local`
- The `getMobilelandImages` tRPC procedure exists
- The `VITE_MOBILELAND_ENABLED=1` is set
- The products have matching codes on mobileland.me

## Why

Users need product images to automatically populate the canvas when the agent selects products from the Mobileland catalog. Without images, the canvas shows empty "Add photo" placeholders and the ad looks unprofessional.

---

## Known Suspects (ranked by probability)

### 1. `VITE_MOBILELAND_ENABLED` gate silently disables the query
`isMobilelandImageEnabled()` reads `import.meta.env.VITE_MOBILELAND_ENABLED`. If this is not `'1'` at the time the component renders (e.g. env not reloaded), the `useQuery` has `enabled: false` and never fires. **Fix: remove the gate, always query — server returns `{}` if unconfigured.**

### 2. Sequential pagination is too slow for 6213 products
The server fetches `pageSize=100` → 63 pages **sequentially**. At ~200ms per page that's ~13 seconds. The tRPC call appears to hang, the client times out or the user navigates away before it resolves.  
**Fix: parallel pagination in batches of 10 concurrent requests + increase pageSize to 200.**

### 3. SKU mismatch between Excel codes and Magento API
The `catalog_filter` result is matched by `product.code` (from Excel) against the Magento API `sku`. If the Excel uses a different code format (e.g. `"1067839"` vs `"DH03"` or `"denmen-dh03"`), no images will resolve.  
**Fix: investigate via browser DevTools → Network tab → tRPC response, compare map keys against product codes.**

### 4. OAuth signing error
The HMAC-SHA256 signature might be wrong (wrong encoding, wrong parameter order), causing the API to return 401. The server catches the error and returns `{}` silently.  
**Fix: check server logs for `[getMobilelandImages]` error output.**

---

## Investigation Steps (for browser agent)

1. Open http://localhost:3001/agents/retail-promo
2. Open DevTools → Console tab — check for any `[AgentChat]` or `[getMobilelandImages]` errors
3. Open DevTools → Network tab, filter by "trpc" — find the `catalog.getMobilelandImages` request:
   - Is it present? (if not → `enabled: false` bug)
   - What's the response? (empty `{}` or a populated map?)
   - How long did it take? (>5s suggests pagination performance issue)
4. In Console, run: `localStorage.getItem('mobileland_image_map_v1')` — is there a cached map? What do the keys look like?
5. In Console, run: check `window.__mobilelandMap` or look at React DevTools for `mobilelandImageMap` state
6. Compare a map key (SKU from API) with a product code from the canvas

---

## Acceptance Criteria

- [ ] Root cause identified (which of the 4 suspects above)
- [ ] Images load and appear on canvas within 3 seconds of page load
- [ ] Images survive page reload (localStorage cache works)
- [ ] Console shows no errors related to mobileland

---

## Files to Modify (depending on root cause)

- `client/src/components/AgentChat.tsx` — remove `enabled: isMobilelandImageEnabled()` gate
- `server/lib/mobileland-api.ts` — parallel pagination, increase PAGE_SIZE to 200
- `client/src/lib/mobileland-images.ts` — possibly simplify `isMobilelandImageEnabled()`

---

## Notes

- The server IS running on port 3001 (port 3002 was a stale old process)
- `.env.local` has all 5 MOBILELAND vars and `VITE_MOBILELAND_ENABLED=1`
- Vite detected `.env.local` change and restarted the server at 9:14 PM
- The STORY-105 implementation is correct in principle — the investigation should confirm which layer is breaking
