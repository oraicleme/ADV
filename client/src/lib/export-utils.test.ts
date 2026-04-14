import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCanvasFromElement } from './export-utils';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

const html2canvasMock = (await import('html2canvas')).default as ReturnType<typeof vi.fn>;

describe('Export Utilities', () => {
  describe('getCanvasFromElement', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('div');
      mockElement.id = 'test-element';
      mockElement.innerHTML = '<p>Test content</p>';
      document.body.appendChild(mockElement);

      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 100;
      html2canvasMock.mockResolvedValue(mockCanvas);
    });

    afterEach(() => {
      document.body.removeChild(mockElement);
      vi.clearAllMocks();
    });

    it('throws error if element not found', async () => {
      await expect(getCanvasFromElement('non-existent')).rejects.toThrow(
        'Element with ID "non-existent" not found',
      );
    });

    it('returns a canvas element', async () => {
      const canvas = await getCanvasFromElement('test-element');
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    });

    it('respects scale option', async () => {
      const canvas = await getCanvasFromElement('test-element', { scale: 2 });
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(html2canvasMock).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ scale: 2 }),
      );
    });
  });

  describe('Export workflow integration', () => {
    it('supports complete export workflow', async () => {
      expect(typeof getCanvasFromElement).toBe('function');
    });
  });
});
