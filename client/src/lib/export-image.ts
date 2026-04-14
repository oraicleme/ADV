import html2canvas from 'html2canvas';
import { resolveImagesInHtml } from './export-image-resolution';

export interface ExportOptions {
  html: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality?: number; // 0-1, default 0.9 for JPEG
}

/**
 * Renders HTML into an isolated iframe (so app CSS like oklch() is not used),
 * captures it with html2canvas, and returns a Blob. Client-side only; no server.
 * Using an iframe avoids "unsupported color function 'oklch'" from the main document's theme.
 * Falls back to a div wrapper in environments where iframe fails (e.g. jsdom in tests).
 * STORY-143: Resolves http(s) image URLs in HTML to data URIs before capture so product images render.
 */
export async function exportAdAsImage(options: ExportOptions): Promise<Blob> {
  const { html, width, height, format, quality = 0.9 } = options;

  const htmlWithResolvedImages = await resolveImagesInHtml(html);

  const useIframe = await tryCaptureViaIframe(htmlWithResolvedImages, width, height, format, quality);
  if (useIframe !== null) return useIframe;

  return captureViaWrapperDiv(htmlWithResolvedImages, width, height, format, quality);
}

/** Wait for all img in container to load (or max 3s). Ensures canvas capture has content. */
function waitForImages(container: HTMLElement, maxMs = 3000): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
  if (imgs.length === 0) return Promise.resolve();
  const start = Date.now();
  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onLoad);
          resolve();
        };
        const onLoad = () => done();
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onLoad);
        setTimeout(done, Math.max(0, maxMs - (Date.now() - start)));
      });
    }),
  ).then(() => {});
}

async function tryCaptureViaIframe(
  html: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg',
  quality: number,
): Promise<Blob | null> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const loadPromise = new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => resolve();
  });
  const parseTimeout = new Promise<void>((resolve) => setTimeout(resolve, 400));
  iframe.srcdoc = html;
  await Promise.race([loadPromise, parseTimeout]);

  const body = iframe.contentDocument?.body;
  if (!body) {
    iframe.remove();
    return null;
  }

  await waitForImages(body, 3500);
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 80));

  try {
    const canvas = await html2canvas(body, {
      scale: 1,
      useCORS: true,
      allowTaint: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    });
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blobQuality = format === 'jpeg' ? quality : undefined;
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        mimeType,
        blobQuality,
      );
    });
  } catch {
    return null;
  } finally {
    iframe.remove();
  }
}

function captureViaWrapperDiv(
  html: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg',
  quality: number,
): Promise<Blob> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.background = doc.body?.style?.backgroundColor || 'white';

  const styleEls = doc.head?.querySelectorAll('style') ?? [];
  for (const style of Array.from(styleEls)) {
    wrapper.appendChild(style.cloneNode(true) as HTMLStyleElement);
  }
  const bodyClone = doc.body?.cloneNode(true) as HTMLBodyElement;
  if (bodyClone) {
    bodyClone.style.margin = '0';
    bodyClone.style.padding = '0';
    wrapper.appendChild(bodyClone);
  }

  document.body.appendChild(wrapper);

  return (async () => {
    try {
      await waitForImages(wrapper, 3500);
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 80));
      const canvas = await html2canvas(wrapper, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blobQuality = format === 'jpeg' ? quality : undefined;
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          mimeType,
          blobQuality,
        );
      });
    } finally {
      wrapper.remove();
    }
  })();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Suggested filename for an exported ad image. */
export function exportFilename(width: number, height: number, format: 'png' | 'jpeg'): string {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return `ad-creative-${width}x${height}.${ext}`;
}
