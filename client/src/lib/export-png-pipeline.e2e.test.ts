/**
 * E2E pipeline: template data → renderAdTemplate → exportAdAsImage → PNG blob.
 *
 * Ensures the full export PNG path works with real ad HTML (no oklch in ad HTML;
 * iframe isolation avoids main-document oklch when in browser).
 *
 * html2canvas is mocked so tests run in jsdom; the pipeline and blob result are asserted.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('html2canvas', () => ({ default: vi.fn() }));

import { exportAdAsImage } from './export-image';
import { renderAdTemplate } from './ad-templates';
import {
  FORMAT_PRESETS,
  DEFAULT_PRODUCT_BLOCK_OPTIONS,
} from './ad-constants';
import { DEFAULT_FOOTER_FOR_NEW_CREATIVE } from './ad-config-schema';
import type { AdTemplateData } from './ad-constants';
import type { ProductItem } from './ad-constants';

const html2canvas = (await import('html2canvas')).default as ReturnType<typeof vi.fn>;

const STORY = FORMAT_PRESETS[0]!;

function makeProducts(n: number): ProductItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Product ${i + 1}`,
    code: `P${i + 1}`,
    price: '10 KM',
    category: 'Test',
  }));
}

function buildTemplateData(products: ProductItem[]): AdTemplateData {
  return {
    title: 'E2E Export Test',
    titleFontSize: 32,
    products,
    layout: 'multi-grid',
    format: STORY,
    backgroundColor: '#f8fafc',
    accentColor: '#f97316',
    fontFamily: 'sans-serif',
    ctaButtons: ['Shop now'],
    elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'],
    logoHeight: 64,
    logoAlignment: 'center',
    logoCompanion: 'none',
    productBlockOptions: { ...DEFAULT_PRODUCT_BLOCK_OPTIONS, maxProducts: 0 },
    footer: { ...DEFAULT_FOOTER_FOR_NEW_CREATIVE },
  };
}

describe('Export PNG pipeline E2E', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockReset();
  });

  it('full pipeline: renderAdTemplate HTML → exportAdAsImage → PNG blob', async () => {
    const data = buildTemplateData(makeProducts(3));
    const html = renderAdTemplate(data);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<body');

    const pngBlob = new Blob([new Uint8Array(200)], { type: 'image/png' });
    vi.mocked(html2canvas).mockResolvedValue({
      toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(pngBlob)),
    });

    const blob = await exportAdAsImage({
      html,
      width: STORY.width,
      height: STORY.height,
      format: 'png',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(200);
    expect(html2canvas).toHaveBeenCalled();
  });

  it('pipeline with JPEG format returns image/jpeg blob', async () => {
    const data = buildTemplateData(makeProducts(1));
    const html = renderAdTemplate(data);

    const jpegBlob = new Blob([new Uint8Array(150)], { type: 'image/jpeg' });
    vi.mocked(html2canvas).mockResolvedValue({
      toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(jpegBlob)),
    });

    const blob = await exportAdAsImage({
      html,
      width: STORY.width,
      height: STORY.height,
      format: 'jpeg',
      quality: 0.85,
    });

    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(150);
  });

  it('ad HTML contains no oklch (safe for html2canvas when iframe is used)', () => {
    const data = buildTemplateData(makeProducts(2));
    const html = renderAdTemplate(data);
    expect(html).not.toMatch(/oklch\s*\(/i);
  });
});
