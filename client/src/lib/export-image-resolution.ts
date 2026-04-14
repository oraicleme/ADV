/**
 * STORY-143: Resolve image URLs to data URIs for html2canvas export.
 * Internal use by export-image.ts and export-utils.ts only.
 * Cross-origin img src causes tainted canvas; data URIs are same-origin and render.
 * Intrinsic width/height are added so object-fit:contain scales without distortion.
 */

export interface ResolvedImage {
  dataUri: string;
  width?: number;
  height?: number;
}

const HTTP_URL_PATTERN = /^https?:\/\//i;
const IMG_SRC_URL_REGEX = /<img([^>]*)\ssrc="(https?:\/\/[^"]+)"/gi;

/** Placeholder when a URL fails to load (CORS, 404, etc.). */
const PLACEHOLDER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect fill='%23f3f4f6' width='120' height='80' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

const PLACEHOLDER_WIDTH = 120;
const PLACEHOLDER_HEIGHT = 80;

const CONCURRENCY = 4;

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Get intrinsic dimensions from a data URI so layout/object-fit can scale correctly. */
const IMAGE_DIMENSIONS_TIMEOUT_MS = 1500;

function getImageDimensionsWithTimeout(dataUri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), IMAGE_DIMENSIONS_TIMEOUT_MS);
    const img = new Image();
    const done = (result: { width: number; height: number } | null) => {
      clearTimeout(timeout);
      resolve(result);
    };
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = dataUri;
  });
}

/** Same-origin proxy for images blocked by CORS (e.g. mobileland.me). */
function getProxyUrl(url: string): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${base}/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Fetch image URL and return data URI plus intrinsic dimensions, or placeholder on failure.
 * Tries direct fetch first; on null (e.g. 404) or CORS/network error uses server-side proxy.
 * Dimensions let html2canvas and object-fit:contain render without distortion.
 */
async function urlToResolvedImage(url: string): Promise<ResolvedImage> {
  const tryFetch = async (targetUrl: string): Promise<string | null> => {
    const res = await fetch(targetUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await blobToDataUri(blob);
  };

  let dataUri: string;
  try {
    const u = await tryFetch(url);
    if (u) dataUri = u;
    else {
      try {
        dataUri = (await tryFetch(getProxyUrl(url))) ?? PLACEHOLDER_DATA_URI;
      } catch {
        dataUri = PLACEHOLDER_DATA_URI;
      }
    }
  } catch {
    try {
      dataUri = (await tryFetch(getProxyUrl(url))) ?? PLACEHOLDER_DATA_URI;
    } catch {
      dataUri = PLACEHOLDER_DATA_URI;
    }
  }

  if (dataUri === PLACEHOLDER_DATA_URI) {
    return { dataUri, width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_HEIGHT };
  }
  const dims = await getImageDimensionsWithTimeout(dataUri);
  return {
    dataUri,
    width: dims?.width,
    height: dims?.height,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Collect unique http(s) image URLs from HTML (img src). */
function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  IMG_SRC_URL_REGEX.lastIndex = 0;
  while ((m = IMG_SRC_URL_REGEX.exec(html)) !== null) {
    const url = m[2]!;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

/**
 * Resolve all http(s) img src in HTML to data URIs so html2canvas can draw them.
 * Adds intrinsic width/height when known so object-fit:contain scales without distortion.
 * Data URIs and non-http src are left unchanged. Failed loads get a placeholder.
 */
export async function resolveImagesInHtml(html: string): Promise<string> {
  const urls = extractImageUrlsFromHtml(html);
  if (urls.length === 0) return html;
  const resolved = await runWithConcurrency(urls, urlToResolvedImage, CONCURRENCY);
  const urlToRes = new Map(urls.map((u, i) => [u, resolved[i]!]));
  return html.replace(IMG_SRC_URL_REGEX, (_, attrs: string, url: string) => {
    const res = urlToRes.get(url) ?? { dataUri: PLACEHOLDER_DATA_URI, width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_HEIGHT };
    const w = res.width != null ? ` width="${res.width}"` : '';
    const h = res.height != null ? ` height="${res.height}"` : '';
    return `<img${attrs} src="${res.dataUri}"${w}${h}`;
  });
}

/**
 * Resolve all http(s) img src under element to data URIs (in-place).
 * Sets intrinsic width/height when known so object-fit:contain scales without distortion.
 * Used for direct-DOM export (export-utils) before html2canvas.
 */
export async function resolveImagesInElement(element: HTMLElement): Promise<void> {
  const imgs = element.querySelectorAll<HTMLImageElement>('img[src^="http"]');
  const urlToImg = new Map<string, HTMLImageElement[]>();
  imgs.forEach((img) => {
    const url = img.getAttribute('src');
    if (url && HTTP_URL_PATTERN.test(url)) {
      const list = urlToImg.get(url) ?? [];
      list.push(img);
      urlToImg.set(url, list);
    }
  });
  const urls = Array.from(urlToImg.keys());
  if (urls.length === 0) return;
  const resolved = await runWithConcurrency(urls, urlToResolvedImage, CONCURRENCY);
  urls.forEach((url, i) => {
    const res = resolved[i]!;
    const list = urlToImg.get(url) ?? [];
    list.forEach((img) => {
      img.setAttribute('src', res.dataUri);
      if (res.width != null) img.setAttribute('width', String(res.width));
      if (res.height != null) img.setAttribute('height', String(res.height));
    });
  });
}
