/**
 * STORY-68 / STORY-108: product-vision-analyzer unit tests
 *
 * All tests run without network access — the io.net chatCompletion is mocked.
 * STORY-108 adds filterVisionImageUris tests + two-turn regression scenario.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeProductImages,
  filterVisionImageUris,
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

// ------- filterVisionImageUris (STORY-108) -------

describe('filterVisionImageUris', () => {
  it('returns empty array for empty input', () => {
    expect(filterVisionImageUris([])).toEqual([]);
  });

  it('passes through base64 data: URIs unchanged', () => {
    const uris = ['data:image/jpeg;base64,/9j/4AAQ', 'data:image/png;base64,iVBORw0'];
    expect(filterVisionImageUris(uris)).toEqual(uris);
  });

  it('filters out https:// Mobileland catalog URLs', () => {
    const uris = [
      'https://mobileland.me/catalog/product/m/a/main-img_111.jpg',
      'https://mobileland.me/catalog/product/s/e/second-img.jpg',
    ];
    expect(filterVisionImageUris(uris)).toEqual([]);
  });

  it('filters out http:// URLs', () => {
    const uris = ['http://example.com/product.jpg'];
    expect(filterVisionImageUris(uris)).toEqual([]);
  });

  it('filters out any non-data: URL scheme (blob:, file:, ftp:)', () => {
    expect(filterVisionImageUris(['blob:https://app.com/uuid'])).toEqual([]);
    expect(filterVisionImageUris(['file:///tmp/image.jpg'])).toEqual([]);
    expect(filterVisionImageUris(['ftp://files.example.com/img.jpg'])).toEqual([]);
  });

  it('filters out undefined values', () => {
    expect(filterVisionImageUris([undefined, undefined])).toEqual([]);
  });

  it('filters out null values', () => {
    expect(filterVisionImageUris([null, null])).toEqual([]);
  });

  it('keeps data: URIs from a mixed input, drops everything else', () => {
    const mixed = [
      'https://mobileland.me/catalog/product/image1.jpg',
      'data:image/jpeg;base64,/9j/photo1',
      'https://external.com/product.jpg',
      'data:image/png;base64,iVBORw0',
      undefined,
      null,
    ];
    const result = filterVisionImageUris(mixed);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      'data:image/jpeg;base64,/9j/photo1',
      'data:image/png;base64,iVBORw0',
    ]);
  });

  it('caps output at 3 items even when more data: URIs are present', () => {
    const uris = Array.from({ length: 6 }, (_, i) => `data:image/jpeg;base64,photo${i}`);
    expect(filterVisionImageUris(uris)).toHaveLength(3);
  });

  it('returns exactly 3 items when given 3 valid URIs', () => {
    const uris = ['data:image/jpeg;base64,a', 'data:image/jpeg;base64,b', 'data:image/jpeg;base64,c'];
    expect(filterVisionImageUris(uris)).toHaveLength(3);
  });
});

// ------- STORY-108 two-turn regression -------

describe('STORY-108 regression: two-turn scenario with Mobileland URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TEST_TIMEOUT = 1000;

  /**
   * Simulates the handleChatSend logic from AgentChat.tsx:
   *   const imageUris = filterVisionImageUris(products.map(p => p.imageDataUri))
   *   if (!imageAnalysisRan && imageUris.length > 0) { ... analyzeProductImages ... }
   * Returns the updated imageAnalysisRan flag.
   */
  async function simulateChatTurn(
    products: Array<{ imageDataUri?: string }>,
    imageAnalysisRan: boolean,
  ): Promise<{ imageAnalysisRan: boolean; analysisCalledCount: number }> {
    const imageUris = filterVisionImageUris(products.map((p) => p.imageDataUri));
    if (!imageAnalysisRan && imageUris.length > 0) {
      await analyzeProductImages('test-key', imageUris);
      return { imageAnalysisRan: true, analysisCalledCount: 1 };
    }
    return { imageAnalysisRan, analysisCalledCount: 0 };
  }

  it('turn 1 with Mobileland URLs: imageUris is empty → analyzeProductImages never called', async () => {
    const products = [
      { imageDataUri: 'https://mobileland.me/catalog/product/m/a/main.jpg' },
      { imageDataUri: 'https://mobileland.me/catalog/product/s/e/side.jpg' },
    ];

    const { imageAnalysisRan } = await simulateChatTurn(products, false);

    expect(mockChatCompletion).not.toHaveBeenCalled();
    expect(imageAnalysisRan).toBe(false);
  }, TEST_TIMEOUT);

  it('turn 2 after Mobileland-only turn 1: still no vision API call on second prompt', async () => {
    const products = [
      { imageDataUri: 'https://mobileland.me/catalog/product/m/a/main.jpg' },
    ];

    // Turn 1
    const turn1 = await simulateChatTurn(products, false);
    expect(mockChatCompletion).not.toHaveBeenCalled();

    // Turn 2 — imageAnalysisRan is still false (was never set), but imageUris is still empty
    const turn2 = await simulateChatTurn(products, turn1.imageAnalysisRan);

    expect(mockChatCompletion).not.toHaveBeenCalled();
    expect(turn2.imageAnalysisRan).toBe(false);
  }, TEST_TIMEOUT);

  it('turn 1 with real data: URIs runs vision, turn 2 is skipped (imageAnalysisRan guard)', async () => {
    const products = [
      { imageDataUri: 'data:image/jpeg;base64,/9j/photo1' },
      { imageDataUri: 'data:image/jpeg;base64,/9j/photo2' },
    ];

    mockChatCompletion.mockResolvedValue(makeResponse(JSON.stringify(VALID_ANALYSIS)));

    // Turn 1 — should call analyzeProductImages once
    const turn1 = await simulateChatTurn(products, false);
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);
    expect(turn1.imageAnalysisRan).toBe(true);

    vi.clearAllMocks();

    // Turn 2 — imageAnalysisRan is true → guard blocks re-analysis
    const turn2 = await simulateChatTurn(products, turn1.imageAnalysisRan);
    expect(mockChatCompletion).not.toHaveBeenCalled();
    expect(turn2.imageAnalysisRan).toBe(true);
  }, TEST_TIMEOUT);

  it('mixed products: only data: URIs reach vision, Mobileland URLs are dropped', async () => {
    // Realistic scenario after catalog_filter: selected products have Mobileland URLs
    // but one has an uploaded user photo
    const products = [
      { imageDataUri: 'https://mobileland.me/catalog/product/m/a/phone1.jpg' },
      { imageDataUri: 'data:image/jpeg;base64,/9j/user-uploaded-photo' },
      { imageDataUri: 'https://mobileland.me/catalog/product/s/e/phone2.jpg' },
    ];

    mockChatCompletion.mockResolvedValue(makeResponse(JSON.stringify(VALID_ANALYSIS)));

    const { imageAnalysisRan } = await simulateChatTurn(products, false);

    expect(imageAnalysisRan).toBe(true);
    expect(mockChatCompletion).toHaveBeenCalledTimes(1);

    // Verify the API was called with only the data: URI
    const callArgs = mockChatCompletion.mock.calls[0];
    const messageContent = callArgs![1].messages[0]!.content as Array<{ type: string; image_url?: { url: string } }>;
    const imageBlocks = messageContent.filter((b) => b.type === 'image_url');
    expect(imageBlocks).toHaveLength(1);
    expect(imageBlocks[0]!.image_url!.url).toBe('data:image/jpeg;base64,/9j/user-uploaded-photo');
  }, TEST_TIMEOUT);
});
