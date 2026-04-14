# STORY-143: Export PNG — Product Images Missing on Ad

**Status:** ✅ Done
**Created:** 2026-03-16
**Package:** client (export pipeline + optional image resolution)

---

## What

When the user exports the ad as PNG (or JPEG), **product images do not appear** in the exported file — the product card areas show blank/white where the images should be. Text, logo, badge, prices, and layout are correct; only the product photos are missing.

---

## Why

html2canvas cannot draw **cross-origin images**. If the ad HTML (or the live canvas DOM) contains `<img src="https://...">` (e.g. Mobileland image URLs stored in `product.imageDataUri`), the browser treats them as cross-origin. The canvas becomes tainted and html2canvas either skips drawing those images or they render blank. Data URIs (`data:image/...;base64,...`) are same-origin, so they render correctly. Today, product images can be:

- **Data URIs** — from user uploads, saved photos, or after enrichment; these work in export.
- **HTTP(S) URLs** — from Mobileland API (SKU → image URL) or similar; these are what the user sees in the app but **do not** appear in the exported PNG.

So the fix is to ensure that at export time (or when building the HTML for export), every product image used for capture is in a form html2canvas can draw: either already a data URI, or **converted from URL to data URI** before capture (e.g. fetch the image, draw to an offscreen canvas, export as data URL, then use that in the DOM/HTML passed to html2canvas).

---

## Acceptance Criteria

- [x] **M1** Exported PNG (and JPEG) includes product images when products have `imageDataUri` set (whether it is a data URI or an HTTP/HTTPS URL). No blank white rectangles where product photos should be.
- [x] **M2** Single-page export (ExportPanel with canvas element ID) and multi-page export (HTML string → export-image.ts iframe) both render product images in the output.
- [x] **M3** Solution works for both URL-based images (e.g. Mobileland) and existing data-URI images (uploads, saved library); no regression for the latter.
- [x] **M4** If an image URL fails to load or convert (network error, 404), that product’s image area can show a placeholder (e.g. “No image”) instead of breaking the whole export.

---

## Test Plan

- [x] **T1** Unit/integration: HTML containing `<img src="https://example.com/photo.jpg">` is converted (or the export pipeline uses a version with data URIs) so that a test capture produces a blob; optionally assert that the canvas pixel data is not blank in the image region (or mock fetch to return a tiny PNG and assert it’s embedded).
- [ ] **T2** Manual/E2E: Load catalog with Mobileland images (or mock products with HTTP image URLs), build an ad, export PNG — product images are visible in the downloaded file.
- [ ] **T3** Manual: Export with products that already use data URIs (uploaded/saved photos) — still work (regression check).

---

## Files Changed

- `client/src/lib/export-image-resolution.ts` — new: `resolveImagesInHtml(html)`, `resolveImagesInElement(el)`; fetch URL → data URI with placeholder on failure; concurrency limit 4; **CORS fallback:** direct fetch then proxy (`/api/image-proxy?url=...`) when blocked.
- `server/lib/image-proxy.ts` — new: `GET /api/image-proxy?url=...` handler; allowlisted hosts (mobileland.me, etc.); streams image for export.
- `server/_core/index.ts` — register `app.get("/api/image-proxy", imageProxyHandler)`.
- `client/src/lib/export-image.ts` — call `resolveImagesInHtml(html)` before iframe/wrapper capture.
- `client/src/lib/export-utils.ts` — clone element, `resolveImagesInElement(clone)`, then html2canvas(clone) for PNG/JPEG and getCanvasFromElement.
- `client/src/lib/export-image-resolution.test.ts` — new: 8 tests for resolution (no-URL, fetch ok, fetch fail, 404, dedup, DOM path).
- `client/src/lib/export-image.test.ts` — STORY-143 test: HTML with https img → export returns blob and fetch called.
- `client/src/lib/export-utils.test.ts` — getCanvasFromElement now receives clone (expect.any(HTMLElement)).

---

## Notes

- **CORS (addressed):** When the image server (e.g. mobileland.me) does not send `Access-Control-Allow-Origin`, client fetch is blocked. Implemented a **server-side image proxy**: `GET /api/image-proxy?url=...` fetches the image on the server (no CORS) and streams it back. `export-image-resolution` tries direct fetch first; on failure (CORS/network) it retries via the proxy. Allowed hosts are allowlisted in `server/lib/image-proxy.ts` (e.g. mobileland.me).
- **Performance:** Converting many large images to data URIs at export time can be slow; consider showing “Preparing export…” and doing work in a single pass (e.g. replace all img src in the HTML with data URIs in parallel with a concurrency limit).
- **Scope:** This story is only about product images appearing in PNG/JPEG export. Logo/company image and other assets are out of scope unless they use the same URL-vs–data-URI issue.
