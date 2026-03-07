import html2canvas from 'html2canvas';

export interface ExportOptions {
  html: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality?: number; // 0-1, default 0.9 for JPEG
}

/**
 * Renders HTML into a hidden container at native resolution, captures it with
 * html2canvas, and returns a Blob. Client-side only; no server.
 */
export async function exportAdAsImage(options: ExportOptions): Promise<Blob> {
  const { html, width, height, format, quality = 0.9 } = options;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.background = doc.body?.style?.backgroundColor || 'white';

  // Inject <style> from head
  const styleEls = doc.head?.querySelectorAll('style') ?? [];
  const styleArray: HTMLStyleElement[] = Array.from(styleEls);
  for (const style of styleArray) {
    const clone = style.cloneNode(true) as HTMLStyleElement;
    wrapper.appendChild(clone);
  }

  // Inject body content
  const bodyClone = doc.body?.cloneNode(true) as HTMLBodyElement;
  if (bodyClone) {
    bodyClone.style.margin = '0';
    bodyClone.style.padding = '0';
    wrapper.appendChild(bodyClone);
  }

  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
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
