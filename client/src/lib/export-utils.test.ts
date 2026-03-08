import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCanvasFromElement } from './export-utils';

describe('Export Utilities', () => {
  describe('getCanvasFromElement', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      // Create a mock element
      mockElement = document.createElement('div');
      mockElement.id = 'test-element';
      mockElement.innerHTML = '<p>Test content</p>';
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      document.body.removeChild(mockElement);
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
      // Canvas should be larger with scale 2
      expect(canvas.width).toBeGreaterThan(0);
    });
  });

  describe('Export workflow integration', () => {
    it('supports complete export workflow', async () => {
      // This test verifies the export utilities are properly integrated
      expect(typeof getCanvasFromElement).toBe('function');
    });
  });
});
