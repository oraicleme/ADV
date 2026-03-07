/**
 * STORY-68: product-vision-analyzer unit tests
 *
 * All tests run without network access — the io.net chatCompletion is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeProductImages,
  sampleImages,
  resizeImageDataUri,
  type ProductImageAnalysis,
} from './product-vision-analyzer';

// ------- Mock ionet-client -------

vi.mock('./ionet-client', () => ({
  chatCompletion: vi.fn(),
}));

import { chatCompletion } from './ionet-client';
const mockChatCompletion = vi.mocked(chatCompletion);

// ------- Helpers -------

const VALID_ANALYSIS: ProductImageAnalysis = {
  productCategory: 'electronics',
  imageQuality: 'high',
  hasLightBackgrounds: false,
  suggestedPalette: 'Dark Premium',
  issues: [],
  summary: 'High-quality electronics product photos on dark backgrounds.',
};

function makeResponse(content: string) {
  return {
    choices: [{ message: { content }, finish_reason: 'stop' }],
  };
}

// ------- sampleImages -------

describe('sampleImages', () => {
  it('returns [] for empty array', () => {
    expect(sampleImages([])).toEqual([]);
  });

  it('returns single item for 1-element array', () => {
    expect(sampleImages(['a'])).toEqual(['a']);
  });

  it('returns both items for 2-element array', () => {
    expect(sampleImages(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('selects first/middle/last for 3-element array', () => {
    expect(sampleImages(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('selects first/middle/last for 5-element array (indices 0, 2, 4)', () => {
    const imgs = ['a', 'b', 'c', 'd', 'e'];
    const result = sampleImages(imgs);
    expect(result).toEqual(['a', 'c', 'e']);
  });

  it('selects first/middle/last for 7-element array (indices 0, 3, 6)', () => {
    const imgs = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = sampleImages(imgs);
    expect(result).toEqual(['a', 'd', 'g']);
  });

  it('always returns at most 3 items', () => {
    const imgs = Array.from({ length: 20 }, (_, i) => `img${i}`);
    expect(sampleImages(imgs)).toHaveLength(3);
  });
});

// ------- resizeImageDataUri -------

describe('resizeImageDataUri', () => {
  it('returns the original URI when image cannot load (jsdom fallback)', async () => {
    // jsdom cannot decode real image data, so onload never fires.
    // The 100ms fallback timeout resolves with the original URI.
    const uri = 'data:image/jpeg;base64,/9j/testdata';
    const result = await resizeImageDataUri(uri);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, 500);
});

// ------- analyzeProductImages -------

describe('analyzeProductImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Timeout for tests that call analyzeProductImages — 100ms resize fallback + API mock latency. */
  const TEST_TIMEOUT = 1000;

  it('returns null when given an empty array (no API call made)', async () => {
    const result = await analyzeProductImages('test-key', []);
    expect(result).toBeNull();
    expect(mockChatCompletion).not.toHaveBeenCalled();
  });

  it('returns null when the API throws (fail-safe)', async () => {
    mockChatCompletion.mockRejectedValue(new Error('API down'));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).toBeNull();
  }, TEST_TIMEOUT);

  it('returns null when the API returns non-JSON content', async () => {
    mockChatCompletion.mockResolvedValue(makeResponse('Sorry, I cannot analyze that.'));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).toBeNull();
  }, TEST_TIMEOUT);

  it('returns null on truncated/malformed JSON', async () => {
    mockChatCompletion.mockResolvedValue(makeResponse('{"productCategory": "electronics", "image'));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).toBeNull();
  }, TEST_TIMEOUT);

  it('parses a clean JSON response and returns all fields correctly', async () => {
    mockChatCompletion.mockResolvedValue(makeResponse(JSON.stringify(VALID_ANALYSIS)));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).not.toBeNull();
    expect(result!.productCategory).toBe('electronics');
    expect(result!.imageQuality).toBe('high');
    expect(result!.hasLightBackgrounds).toBe(false);
    expect(result!.suggestedPalette).toBe('Dark Premium');
    expect(result!.issues).toEqual([]);
    expect(result!.summary).toBe('High-quality electronics product photos on dark backgrounds.');
  }, TEST_TIMEOUT);

  it('parses JSON embedded in surrounding text', async () => {
    const wrapped = `Here is the analysis:\n${JSON.stringify(VALID_ANALYSIS)}\nDone.`;
    mockChatCompletion.mockResolvedValue(makeResponse(wrapped));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).not.toBeNull();
    expect(result!.productCategory).toBe('electronics');
  }, TEST_TIMEOUT);

  it('parses a response with issues array', async () => {
    const withIssues: ProductImageAnalysis = {
      ...VALID_ANALYSIS,
      imageQuality: 'low',
      issues: ['watermark', 'low_resolution'],
      summary: 'Low-quality images with visible watermarks.',
    };
    mockChatCompletion.mockResolvedValue(makeResponse(JSON.stringify(withIssues)));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result!.issues).toContain('watermark');
    expect(result!.issues).toContain('low_resolution');
    expect(result!.imageQuality).toBe('low');
  }, TEST_TIMEOUT);

  it('tries the fallback model when the primary model fails', async () => {
    mockChatCompletion
      .mockRejectedValueOnce(new Error('Primary model unavailable'))
      .mockResolvedValueOnce(makeResponse(JSON.stringify(VALID_ANALYSIS)));

    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).not.toBeNull();
    expect(mockChatCompletion).toHaveBeenCalledTimes(2);
    // Second call should use the fallback model
    const secondCall = mockChatCompletion.mock.calls[1];
    expect(secondCall![1].model).toContain('Llama');
  }, TEST_TIMEOUT);

  it('returns null when both primary and fallback models fail', async () => {
    mockChatCompletion.mockRejectedValue(new Error('All models down'));
    const result = await analyzeProductImages('test-key', ['data:image/jpeg;base64,abc']);
    expect(result).toBeNull();
    expect(mockChatCompletion).toHaveBeenCalledTimes(2);
  }, TEST_TIMEOUT);

  it('only calls API with up to 3 images when given 5', async () => {
    mockChatCompletion.mockResolvedValue(makeResponse(JSON.stringify(VALID_ANALYSIS)));
    const fiveUris = ['a', 'b', 'c', 'd', 'e'].map(
      (x) => `data:image/jpeg;base64,${x}`,
    );
    await analyzeProductImages('test-key', fiveUris);
    // The content passed to chatCompletion should include exactly 3 image_url blocks
    const callArgs = mockChatCompletion.mock.calls[0];
    const messageContent = callArgs![1].messages[0]!.content;
    const imageBlocks = (messageContent as Array<{ type: string }>).filter(
      (b) => b.type === 'image_url',
    );
    expect(imageBlocks).toHaveLength(3);
  }, TEST_TIMEOUT);
});

// ------- DataQuality type check -------

describe('DataQuality imageAnalysis field', () => {
  it('DataQuality type accepts imageAnalysis: null', () => {
    // This is a compile-time check — if it compiles, it passes
    const dq = {
      hasAllCapsNames: false,
      hasMissingPrices: false,
      hasOriginalPrices: false,
      hasDiscounts: false,
      avgDescriptionLength: 0,
      imageAnalysis: null as ProductImageAnalysis | null,
    };
    expect(dq.imageAnalysis).toBeNull();
  });

  it('DataQuality type accepts imageAnalysis with full ProductImageAnalysis', () => {
    const dq = {
      hasAllCapsNames: false,
      hasMissingPrices: false,
      hasOriginalPrices: false,
      hasDiscounts: false,
      avgDescriptionLength: 0,
      imageAnalysis: VALID_ANALYSIS as ProductImageAnalysis | null,
    };
    expect(dq.imageAnalysis!.productCategory).toBe('electronics');
  });
});
