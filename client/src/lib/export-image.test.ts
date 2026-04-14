import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportAdAsImage,
  downloadBlob,
  exportFilename,
  type ExportOptions,
} from './export-image';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

// jsdom does not implement URL.createObjectURL / revokeObjectURL
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

const html2canvas = (await import('html2canvas')).default as ReturnType<
  typeof vi.fn
>;

describe('export-image', () => {
  describe('exportFilename', () => {
    it('returns filename with dimensions and .png for PNG', () => {
      expect(exportFilename(1080, 1920, 'png')).toBe(
        'ad-creative-1080x1920.png',
      );
    });
    it('returns filename with dimensions and .jpg for JPEG', () => {
      expect(exportFilename(1080, 1920, 'jpeg')).toBe(
        'ad-creative-1080x1920.jpg',
      );
    });
  });

  describe('downloadBlob', () => {
    it('creates an anchor with download attribute and triggers click', () => {
      const blob = new Blob(['x'], { type: 'image/png' });
      const createElementSpy = vi.spyOn(document, 'createElement');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      downloadBlob(blob, 'test-ad.png');

      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      const anchor = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(anchor.download).toBe('test-ad.png');
      expect(anchor.href).toMatch(/^blob:/);
      expect(revokeSpy).toHaveBeenCalled();
    });
  });

  describe('exportAdAsImage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let appendChildSpy: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let removeSpy: any;

    beforeEach(() => {
      appendChildSpy = vi.spyOn(document.body, 'appendChild');
      removeSpy = vi.spyOn(Element.prototype, 'remove');
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('creates a hidden container (iframe or div) and appends it to body', async () => {
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob())),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      const html = '<html><head></head><body><div>Ad</div></body></html>';
      const options: ExportOptions = {
        html,
        width: 1080,
        height: 1920,
        format: 'png',
      };

      await exportAdAsImage(options);

      expect(appendChildSpy).toHaveBeenCalled();
      const appended = appendChildSpy.mock.calls[0][0] as HTMLElement;
      expect(appended.style.position).toBe('fixed');
      expect(appended.style.left).toBe('-9999px');
      expect(appended.style.width).toBe('1080px');
      expect(appended.style.height).toBe('1920px');
    });

    it('calls html2canvas with width and height', async () => {
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob())),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      await exportAdAsImage({
        html: '<html><body><p>Hi</p></body></html>',
        width: 1080,
        height: 1920,
        format: 'png',
      });

      expect(html2canvas).toHaveBeenCalled();
      const [element, opts] = html2canvas.mock.calls[0] ?? [];
      expect(element).toBeDefined();
      expect(opts).toMatchObject({
        width: 1080,
        height: 1920,
        scale: 1,
      });
    });

    it('removes the container (iframe or wrapper) after export', async () => {
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob())),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      await exportAdAsImage({
        html: '<html><body></body></html>',
        width: 100,
        height: 100,
        format: 'png',
      });

      expect(removeSpy).toHaveBeenCalled();
    });

    it('returns a PNG blob when format is png', async () => {
      const pngBlob = new Blob([], { type: 'image/png' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(pngBlob)),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      const result = await exportAdAsImage({
        html: '<html><body></body></html>',
        width: 100,
        height: 100,
        format: 'png',
      });

      expect(result).toBe(pngBlob);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/png',
        undefined,
      );
    });

    it('returns a JPEG blob with default quality when format is jpeg', async () => {
      const jpegBlob = new Blob([], { type: 'image/jpeg' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(jpegBlob)),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      await exportAdAsImage({
        html: '<html><body></body></html>',
        width: 100,
        height: 100,
        format: 'jpeg',
      });

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.9,
      );
    });

    it('uses custom quality for JPEG when provided', async () => {
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(new Blob())),
      };
      html2canvas.mockResolvedValue(mockCanvas);

      await exportAdAsImage({
        html: '<html><body></body></html>',
        width: 100,
        height: 100,
        format: 'jpeg',
        quality: 0.8,
      });

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8,
      );
    });

    it('falls back to wrapper div when iframe path fails (e.g. html2canvas throws)', async () => {
      const pngBlob = new Blob(['x'], { type: 'image/png' });
      const mockCanvas = {
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(pngBlob)),
      };
      html2canvas
        .mockRejectedValueOnce(new Error('Attempting to parse an unsupported color function \'oklch\''))
        .mockResolvedValueOnce(mockCanvas);

      const result = await exportAdAsImage({
        html: '<!DOCTYPE html><html><head></head><body><div>Ad</div></body></html>',
        width: 200,
        height: 200,
        format: 'png',
      });

      expect(html2canvas).toHaveBeenCalledTimes(2);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(result.size).toBeGreaterThan(0);
    });

    it('returns blob with correct type and non-empty size', async () => {
      const pngBlob = new Blob([new Uint8Array(100)], { type: 'image/png' });
      html2canvas.mockResolvedValue({
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(pngBlob)),
      });

      const result = await exportAdAsImage({
        html: '<html><body><p>Ad</p></body></html>',
        width: 1080,
        height: 1920,
        format: 'png',
      });

      expect(result.type).toBe('image/png');
      expect(result.size).toBe(100);
    });

    it('STORY-143: resolves https img src before capture and returns blob', async () => {
      const pngBlob = new Blob([new Uint8Array(50)], { type: 'image/png' });
      html2canvas.mockResolvedValue({
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(pngBlob)),
      });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob([new Uint8Array(1)], { type: 'image/png' })),
      });
      vi.stubGlobal('fetch', fetchMock);
      try {
        const htmlWithUrl =
          '<html><body><img alt="P" src="https://example.com/photo.png" /></body></html>';
        const result = await exportAdAsImage({
          html: htmlWithUrl,
          width: 400,
          height: 400,
          format: 'png',
        });

        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('image/png');
        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com/photo.png',
          expect.objectContaining({ mode: 'cors' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
