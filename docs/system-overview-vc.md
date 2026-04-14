# Oraicle — System Overview & Technical Roadmap

**Audience:** VC investors, technical due diligence.  
**Purpose:** How the system works (canvas → preview → export), key libraries, external services, and project story in one concise document.

---

## 1. Product in One Sentence

Oraicle is an AI-powered retail ad designer: users pick products and talk to an AI creative director; the system renders a WYSIWYG ad (canvas), shows a live preview, and exports to PNG/JPEG/HTML at fixed artboard sizes (e.g. 1080×1920 Story).

---

## 2. Architecture at a Glance

| Layer | Role |
|-------|------|
| **Client** | React (Vite), ad canvas editor, AI chat, product search (MiniSearch + optional Meilisearch, user rules + optional RAG-lite similarity), preview iframe, export (HTML → image) |
| **Server** | Express, tRPC, image proxy (CORS bypass), catalog/LLM routes, Meilisearch (optional) |
| **External** | io.net (LLM), Mobileland.me (product images), Meilisearch (search), S3 (optional assets) |

---

## 3. Canvas -> Preview -> Export (Code-grounded, WYSIWYG)

This section explains the *actual* implementation paths in the repo for:
`AdCanvasEditor` (Edit) -> `HtmlPreview` (Preview) -> `export-image` / `export-utils` (Export).

### 3.1 Canvas/Edit: how the HTML is generated

Canvas is implemented in `client/src/components/AdCanvasEditor.tsx`.

Inside `AdCanvasEditor`, the important derived values are:

1. `templateProducts` (useMemo)
   - each product picks `imageDataUri` from:
     - `mobilelandImageUrls[i]`
     - `productImageDataUris[i]`
     - `p.imageDataUri`
     - `webImageSelections[i]` if `webSearchEnabled`
   - it also sets `brandLogoDataUri` from `brandLogoDataUris[i]` (with fallback)

2. `buildTemplateData(productsSlice)` (useCallback)
   - creates an `AdTemplateData` object from Canvas state:
     - `title`, `titleFontSize`, `products: productsSlice`
     - `layout`, `format`, `style`
     - `ctaButtons`, `badgeText`, `disclaimerText`, `emojiOrIcon`
     - `elementOrder`, logo settings
     - `productBlockOptions` (including `imageHeight`)
     - `headerBrandLogoDataUris`
     - `footer` only when `footerEnabled` is true

3. HTML strings for Preview/Export
   - `livePreviewHtml` is created as:
     - `renderAdTemplate(buildTemplateData(templateProducts))`
   - multi-page HTML (`htmlPerPage`) is created by:
     - `exportPages = getPages(templateProducts.length, selectedFormat)` (from `client/src/lib/canvas-pages.ts`)
     - slicing products per page and calling `renderAdTemplate(buildTemplateData(productsForPage))`
   - the string shown in Preview is selected by:
     - `previewHtmlToShow = getPreviewHtmlToShow(generatedHtml, livePreviewHtml, htmlPerPage, currentPageIndex)`
       (`client/src/lib/preview-html.ts`)

Code locations:
- `client/src/components/AdCanvasEditor.tsx` — `templateProducts`, `buildTemplateData`, `livePreviewHtml`, `htmlPerPage`, `previewHtmlToShow`
- `client/src/lib/canvas-pages.ts` — `getPages(...)`
- `client/src/lib/preview-html.ts` — `getPreviewHtmlToShow(...)`

### 3.2 Template generator contract (renderAdTemplate + renderDocument + footer injection)

The generated HTML is produced by `client/src/lib/ad-templates.ts`:
- `renderAdTemplate(data)` returns a full ad artboard HTML document
- `buildFooterHtml(data)` creates the footer band (`div[data-footer]`)
- `injectFooter(html, footerHtml)` inserts the footer before `</body>`

The base document is styled by `client/src/lib/ad-layouts/shared.ts`:
- `renderDocument(format, style, content)` sets:
  - `body.width`, `body.height`
  - `body.display: flex` and `flex-direction: column`

Key sizing/docking helpers live in the same file:
- `computeEffectiveImageHeight(...)` (fills available space so footer does not look “too low”)

### 3.3 Preview: iframe rendering + scaling

Preview is rendered by `client/src/components/HtmlPreview.tsx`:

- `AdPreviewFrame` sets:
  - `srcDoc={html}`
  - `sandbox="allow-same-origin"`
  - `transform: scale(${scale})` (container width -> ad width)
  - `pointerEvents: 'none'` (display-only)

Preview export buttons export the same HTML via `exportAdAsImage(...)`.

Code locations:
- `client/src/components/HtmlPreview.tsx` — `AdPreviewFrame`, `AdPreviewActions`

### 3.4 Export: HTML-based pipeline (resolve images + html2canvas)

HTML-based export is implemented in `client/src/lib/export-image.ts` via:
- `exportAdAsImage({ html, width, height, format, quality })`

Step 1: resolve image URLs inside the HTML
- `resolveImagesInHtml(html)` in `client/src/lib/export-image-resolution.ts`
- it:
  - extracts http(s) image URLs from `<img>`
  - resolves them concurrently (`CONCURRENCY = 4`)
  - tries direct `fetch(url, { mode: 'cors' })`
  - if that fails, retries via `/api/image-proxy?url=...`
  - on final failure uses a placeholder `data:image/svg+xml...`
  - extracts intrinsic dimensions with a timeout (`IMAGE_DIMENSIONS_TIMEOUT_MS = 1500`)
  - rewrites `<img>` to include:
    - `src="<data-uri>"`
    - `width="..." height="..."` (when known)

Step 2: capture resolved HTML with html2canvas
- `exportAdAsImage` tries `tryCaptureViaIframe(...)` first
  - off-screen iframe with `sandbox="allow-same-origin"`
  - sets `iframe.srcdoc = html`
  - waits for iframe load/error (parse timeout 400ms)
  - then `waitForImages(body, 3500)`
  - then runs `html2canvas(body, ...)` with:
    - `useCORS: true`, `allowTaint: false`
    - fixed `width` / `height`
- if iframe capture fails, it falls back to `captureViaWrapperDiv(...)`
  - parses HTML with `DOMParser`
  - clones style tags and body into an off-screen wrapper
  - waits for images and captures the wrapper with `html2canvas`

Code locations:
- `client/src/lib/export-image.ts` — `exportAdAsImage`, `tryCaptureViaIframe`, `captureViaWrapperDiv`, `waitForImages`
- `client/src/lib/export-image-resolution.ts` — `resolveImagesInHtml`, `urlToResolvedImage`

### 3.5 Export: DOM-based pipeline (legacy/single element)

For single-element export, the app uses:
- `client/src/lib/export-utils.ts`
  - `exportAdAsPNG(elementId, ...)`
  - `exportAdAsJPEG(elementId, ...)`
  - `exportAdAsHTML(elementId, ...)`

`exportAdAsPNG`:
- clones the DOM node off-screen
- calls `resolveImagesInElement(clone)` (same resolver module)
- captures via `html2canvas(clone, ...)` and downloads via `canvas.toBlob(...)`.

Code locations:
- `client/src/lib/export-utils.ts` — `exportAdAsPNG`, `exportAdAsJPEG`, `exportAdAsHTML`

### 3.6 Server support used during export: `/api/image-proxy`

When direct fetch fails (CORS / blocked domains), the client uses a proxy:

- registered in `server/_core/index.ts` as:
  - `app.get("/api/image-proxy", imageProxyHandler);`
- implemented in `server/lib/image-proxy.ts`:
  - validates query `url`
  - restricts to `ALLOWED_HOSTS`
  - fetches server-side with a timeout
  - streams bytes back while setting:
    - `Content-Type` and `Cache-Control`

### 3.7 Contract: footer docking + image sizing + contrast

The “industry manner” look is enforced by template-level contracts:

1. Footer docking to bottom
   - `renderDocument(...)` uses flex column
   - footer band uses `margin-top:auto; flex-shrink:0; width:100%`

2. Avoid large empty space above footer
   - `computeEffectiveImageHeight(...)` uses available height estimation and scales product image height so content fills the artboard.

3. Product card readability
   - product card wrappers apply explicit dark text `color:#111827` on the white card background.

---

## 4. Libraries & External Tools

### 4.1 Core frontend

| Library | Use |
|--------|-----|
| **React 19** | UI components, hooks |
| **Vite** | Build, dev server, HMR |
| **Tailwind CSS** | Styling, design tokens |
| **Radix UI** | Accessible primitives (dialogs, dropdowns, etc.) |
| **Framer Motion** | Animations |
| **html2canvas** | DOM/HTML → canvas → PNG/JPEG for export |
| **MiniSearch** | Client-side BM25 product search (Stage 1 recall) |
| **TanStack Query** | Server state, caching |
| **tRPC** | Type-safe API client/server |
| **Zod** | Schema validation (forms, API) |
| **wouter** | Routing |

### 4.2 Backend & infra

| Library / service | Use |
|-------------------|-----|
| **Express** | HTTP server, static, image proxy route |
| **tRPC** | API router, procedures |
| **Drizzle** | DB layer (if used) |
| **Meilisearch** (optional) | Server-side search index, hybrid with MiniSearch |
| **io.net** | LLM for agent (creative director) and catalog selection |
| **Mobileland.me** | Product catalog and images (Magento-style API) |
| **AWS S3** (optional) | Asset storage |

### 4.3 Export-specific

- **html2canvas** — Renders a DOM subtree (or iframe body) to canvas; we pass resolved HTML (data URIs + intrinsic dimensions) so product images and layout are correct.
- **Image proxy** — Express handler fetches `GET /api/image-proxy?url=...` and streams the image; client uses this when direct `fetch(url)` fails (CORS/404).

### 4.4 AI / agent

- **Agent chat engine** (`client/src/lib/agent-chat-engine.ts`): builds prompts, calls io.net, parses JSON `{ message, actions }` into `AgentAction[]` (headline, style, layout, CTA, etc.).
- **Agent actions** (`client/src/lib/agent-actions.ts`): typed actions applied to canvas state (set headline, set style, set layout, add products, etc.).
- **Catalog selection** (server): tRPC `catalog.selectProducts` can use LLM (io.net) to interpret natural language and return product IDs; client then applies selection and refreshes template/preview.

---

## 5. Project Story & Roadmap (Summary)

- **Story-driven workflow:** Features and fixes are documented in `docs/stories/STORY-<n>-<slug>.md` with acceptance criteria and test plan; `docs/stories/TRACKER.md` tracks status and next story number.
- **Recent themes:**  
  - **Export quality:** CORS and image proxy (STORY-143), footer docking and space fill (STORY-145, STORY-147), adaptive contrast and card text.  
  - **Preview/canvas parity:** Single template pipeline, multi-page (getPages, htmlPerPage), preview follows canvas (STORY-128, STORY-131).  
  - **Search:** MiniSearch + optional Meilisearch (hybrid, LLM rerank); **user** post-processing rules (exclude/downrank, STORY-196); optional **similar-query** lexical match for rules (RAG-lite PoC, STORY-201 — see `docs/search-rules-rag-roadmap.md`); optional Stage-1 LLM query expansion; **STORY-200** search feedback (implicit/explicit); recall and vocabulary (e.g. STORY-146). Baseline: `docs/search-architecture-technical-hr.md`.  
  - **Agent:** Creative director prompt, actions, catalog selection, product images from Mobileland.
- **Industry manner:** Defined in `docs/industry-standard-manner.md`: WYSIWYG contract, footer docked, hierarchy, safe zone, CTA placement. Implemented via shared layout and template code plus contract tests in `ad-templates.test.ts` and `shared.test.ts`.

**Next steps (from TRACKER):** Follow **`docs/stories/TRACKER.md`** for the next story id; ongoing work may include safe-zone/hierarchy contracts, more export/preview tests, optional server-side rule index (future phase in `docs/search-rules-rag-roadmap.md`), and agent flow polish.

### Operations & release checks (STORY-203–204)

| Artifact | Purpose |
|----------|---------|
| **`pnpm run smoke`** | Runs `vitest run && vite build` — automated gate before release or large merges. |
| **`docs/qa-manual-smoke-retail-promo.md`** | Short manual browser checklist for Retail Promo (`/agents/retail-promo`). |
| **`docs/deferred-features-registry.md`** | What is **not** built yet (e.g. search rule index Faza C, optional server-backed manual Meilisearch, legacy tracker rows 93–97). |

---

## 6. Key File Map (Quick Reference)

| Area | Files |
|------|--------|
| Template / HTML | `client/src/lib/ad-templates.ts`, `ad-layouts/shared.ts`, `ad-layouts/multi-grid.ts` (and other layouts) |
| Canvas | `client/src/components/AdCanvasEditor.tsx` |
| Preview | `client/src/lib/preview-html.ts`, `client/src/components/HtmlPreview.tsx` |
| Export | `client/src/lib/export-image.ts`, `export-image-resolution.ts`, `client/src/components/ExportPanel.tsx` |
| Multi-page | `client/src/lib/canvas-pages.ts` |
| Agent | `client/src/lib/agent-chat-engine.ts`, `agent-actions.ts`; `server/routers/agents.ts`, `catalog.ts` |
| Search / rules | `client/src/lib/product-index.ts`, `use-search-index.ts`, `apply-search-rules.ts`, `search-rules-rag-lite.ts`, `search-feedback.ts`; `server/routers/catalog.ts` — details in `docs/search-architecture-technical-hr.md` |
| Image proxy | `server/lib/image-proxy.ts`; registered in `server/_core/index.ts` |
| Config / constants | `client/src/lib/ad-constants.ts`, `ad-config-schema.ts` |

---

*Document version: 2.2. Operations/smoke/deferred links (STORY-204). Search stack + rules/RAG-lite (STORY-202). Code-grounded Canvas/Preview/Export (STORY-149). For full story list and status see `docs/stories/TRACKER.md`.*
