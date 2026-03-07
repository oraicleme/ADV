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

    it('creates a hidden wrapper and appends it to body', async () => {
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
      const wrapper = appendChildSpy.mock.calls[0][0] as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
      expect(wrapper.style.left).toBe('-9999px');
      expect(wrapper.style.width).toBe('1080px');
      expect(wrapper.style.height).toBe('1920px');
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

      expect(html2canvas).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          width: 1080,
          height: 1920,
          scale: 1,
        }),
      );
    });

    it('removes the wrapper after export', async () => {
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
  });
});
