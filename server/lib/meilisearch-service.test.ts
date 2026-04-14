/**
 * STORY-136 + STORY-137 + STORY-138 + STORY-140: Tests for meilisearch-service.ts.
 *
 * STORY-136:
 *   T1 — indexCatalog sets correct settings and indexes all documents.
 *   T2 — searchCatalog with filter passes correct filter expression.
 *   T3 — integration smoke: representative queries via mocked Meilisearch.
 *   T4 — regression: env unset behavior.
 *
 * STORY-138 (replaces STORY-137 io.net tests):
 *   T5 — indexCatalog configures OpenAI native embedder when OPENAI_API_KEY is set.
 *   T6 — indexCatalog skips embedder when OPENAI_API_KEY is unset.
 *   T7 — searchCatalog passes hybrid param with openai embedder name when hybrid configured.
 *   T8 — searchCatalog omits hybrid param when OpenAI key is unset.
 *   T9 — searchCatalog extracts semanticScore from _rankingScoreDetails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the meilisearch SDK + ENV before importing the service
// ---------------------------------------------------------------------------

const mockWaitForTask = vi.fn().mockResolvedValue({ status: 'succeeded' });
const mockUpdateSettings = vi.fn().mockResolvedValue({ taskUid: 1 });
const mockAddDocuments = vi.fn().mockResolvedValue({ taskUid: 2 });
const mockUpdateEmbedders = vi.fn().mockResolvedValue({ taskUid: 3 });
const mockSearch = vi.fn();

const mockDeleteDocuments = vi.fn().mockResolvedValue({ taskUid: 10 });
const mockGetStats = vi.fn().mockResolvedValue({ numberOfDocuments: 42 });

const mockIndex = {
  updateSettings: mockUpdateSettings,
  addDocuments: mockAddDocuments,
  updateEmbedders: mockUpdateEmbedders,
  search: mockSearch,
  deleteDocuments: mockDeleteDocuments,
  getStats: mockGetStats,
};

const mockClient = {
  index: vi.fn(() => mockIndex),
  tasks: { waitForTask: mockWaitForTask },
};

vi.mock('meilisearch', () => ({
  MeiliSearch: vi.fn(() => mockClient),
}));

// ENV mock — set openAiApiKey to enable hybrid by default.
vi.mock('../_core/env', () => ({
  ENV: {
    meiliHost: 'http://localhost:7700',
    meiliApiKey: 'test-key',
    openAiApiKey: 'sk-test-openai-key',
    meiliSemanticRatio: 0.5,
    meiliConfidenceThreshold: 0.85,
  },
}));

import {
  isMeilisearchConfigured,
  isHybridConfigured,
  configureIndex,
  indexCatalog,
  searchCatalog,
  deleteDocuments,
  getIndexStats,
  type MeiliProductDoc,
} from './meilisearch-service';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleProducts: MeiliProductDoc[] = [
  { id: 0, name: 'PlayStation 5 Console', brand: 'Sony', code: 'PS5', category: 'Gaming' },
  { id: 1, name: 'DualSense Controller', brand: 'Sony', code: 'DS5', category: 'Gaming' },
  { id: 2, name: 'Xbox Series X', brand: 'Microsoft', code: 'XSX', category: 'Gaming' },
  { id: 3, name: 'USB-C Punjač 65W', brand: 'Hoco', code: 'HC-65W', category: 'Punjači' },
  { id: 4, name: 'iPhone 15 Futrola', brand: 'Belkin', code: 'BEL-15', category: 'Futrole' },
];

// ---------------------------------------------------------------------------
// T1 — indexCatalog sets correct settings and indexes all documents
// ---------------------------------------------------------------------------

describe('T1 — indexCatalog: settings and documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
    mockAddDocuments.mockResolvedValue({ taskUid: 2 });
    mockUpdateEmbedders.mockResolvedValue({ taskUid: 3 });
  });

  it('calls addDocuments with all products having id, name, brand, code, category', async () => {
    await indexCatalog(sampleProducts);

    expect(mockAddDocuments).toHaveBeenCalledOnce();
    const [docs, opts] = mockAddDocuments.mock.calls[0] as [MeiliProductDoc[], { primaryKey: string }];
    expect(opts.primaryKey).toBe('id');
    expect(docs).toHaveLength(5);
    expect(docs[0]).toMatchObject({
      id: 0,
      name: 'PlayStation 5 Console',
      brand: 'Sony',
      code: 'PS5',
      category: 'Gaming',
    });
  });

  it('calls updateSettings with searchable + filterable + rankingRules + typoTolerance', async () => {
    await indexCatalog(sampleProducts);

    expect(mockUpdateSettings).toHaveBeenCalledOnce();
    const [settings] = mockUpdateSettings.mock.calls[0] as [Record<string, unknown>];
    expect(settings['searchableAttributes']).toEqual(['name', 'brand', 'code', 'category']);
    expect(settings['filterableAttributes']).toEqual(['category', 'brand']);
    expect(Array.isArray(settings['rankingRules'])).toBe(true);
    expect(settings['typoTolerance']).toBeDefined();
    const typo = settings['typoTolerance'] as Record<string, unknown>;
    expect(typo['enabled']).toBe(true);
  });

  it('waits for settings task, documents task, and embedder task (3 total)', async () => {
    await indexCatalog(sampleProducts);
    // settings + docs + embedder (hybrid configured in mock ENV)
    expect(mockWaitForTask).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// T2 — searchCatalog with filter passes correct filter expression
// ---------------------------------------------------------------------------

describe('T2 — searchCatalog: filter expressions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes filter expression for category to Meilisearch', async () => {
    mockSearch.mockResolvedValue({ hits: [{ id: 0 }, { id: 1 }, { id: 2 }] });

    const results = await searchCatalog('controller', 10, { category: 'Gaming' });

    expect(mockSearch).toHaveBeenCalledOnce();
    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['filter']).toBe('category = "Gaming"');
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.index)).toEqual([0, 1, 2]);
  });

  it('passes combined filter for category AND brand', async () => {
    mockSearch.mockResolvedValue({ hits: [{ id: 0 }] });

    await searchCatalog('console', 10, { category: 'Gaming', brand: 'Sony' });

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['filter']).toBe('category = "Gaming" AND brand = "Sony"');
  });

  it('does not add filter when filter is undefined', async () => {
    mockSearch.mockResolvedValue({ hits: [] });

    await searchCatalog('anything', 10);

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['filter']).toBeUndefined();
  });

  it('returns results with scores from _rankingScore when available', async () => {
    mockSearch.mockResolvedValue({
      hits: [{ id: 0, _rankingScore: 0.95 }, { id: 1, _rankingScore: 0.75 }],
    });

    const results = await searchCatalog('playstation', 10);
    expect(results[0]).toMatchObject({ index: 0, score: 0.95 });
    expect(results[1]).toMatchObject({ index: 1, score: 0.75 });
  });

  it('falls back to positional score when _rankingScore is absent', async () => {
    mockSearch.mockResolvedValue({ hits: [{ id: 5 }, { id: 10 }] });

    const results = await searchCatalog('usb', 10);
    expect(results[0]!.index).toBe(5);
    expect(results[0]!.score).toBeGreaterThanOrEqual(0);
    expect(results[0]!.score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// T3 — Integration smoke (mocked Meilisearch; no live instance needed)
// ---------------------------------------------------------------------------

describe('T3 — Integration smoke: representative queries', () => {
  it('searches representative queries and returns expected document indices', async () => {
    mockSearch.mockImplementation(async (query: string) => {
      const q = query.toLowerCase();
      if (q.includes('playstation') || q.includes('play station')) {
        return { hits: [{ id: 0, _rankingScore: 0.95 }] };
      }
      if (q.includes('controller') || q.includes('joystick')) {
        return { hits: [{ id: 1, _rankingScore: 0.85 }] };
      }
      if (q.includes('usb') || q.includes('punjac')) {
        return { hits: [{ id: 3, _rankingScore: 0.80 }] };
      }
      return { hits: [] };
    });

    const r1 = await searchCatalog('playstation', 5);
    expect(r1.length).toBeGreaterThan(0);
    expect(r1[0]!.index).toBe(0);

    const r2 = await searchCatalog('joystick', 5);
    expect(r2.length).toBeGreaterThan(0);
    expect(r2[0]!.index).toBe(1);

    const r3 = await searchCatalog('USB-C punjači', 5);
    expect(r3.length).toBeGreaterThan(0);
    expect(r3[0]!.index).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// T4 — Regression: env guards
// ---------------------------------------------------------------------------

describe('T4 — Regression: env-unset behavior', () => {
  it('isMeilisearchConfigured returns true when both host and key are set', () => {
    expect(isMeilisearchConfigured()).toBe(true);
  });

  it('isHybridConfigured returns true when openAiApiKey is set', () => {
    expect(isHybridConfigured()).toBe(true);
  });

  it('searchCatalog respects maxResults (limit param)', async () => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ hits: [{ id: 0 }] });

    await searchCatalog('test', 42);

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['limit']).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// T5 — indexCatalog configures OpenAI native embedder when key is set
// ---------------------------------------------------------------------------

describe('T5 — indexCatalog: OpenAI native embedder configured correctly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
    mockAddDocuments.mockResolvedValue({ taskUid: 2 });
    mockUpdateEmbedders.mockResolvedValue({ taskUid: 3 });
  });

  it('calls updateEmbedders with source=openAi, correct model, and documentTemplate', async () => {
    expect(isHybridConfigured()).toBe(true);

    await indexCatalog([{ id: 0, name: 'PlayStation 5', brand: 'Sony', code: 'PS5', category: 'Gaming' }]);

    expect(mockUpdateEmbedders).toHaveBeenCalledOnce();
    const [embedderArg] = mockUpdateEmbedders.mock.calls[0] as [Record<string, unknown>];
    const embedder = embedderArg['openai'] as Record<string, unknown>;

    expect(embedder).toBeDefined();
    expect(embedder['source']).toBe('openAi');
    expect(embedder['model']).toBe('text-embedding-3-small');
    expect(embedder['apiKey']).toBe('sk-test-openai-key');
    expect(typeof embedder['documentTemplate']).toBe('string');
    expect((embedder['documentTemplate'] as string).includes('{{doc.name}}')).toBe(true);
  });

  it('embedder name is "openai" (not "io-net")', async () => {
    await indexCatalog([{ id: 0, name: 'Test', brand: 'B', code: 'T0', category: 'C' }]);

    const [embedderArg] = mockUpdateEmbedders.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(embedderArg)).toContain('openai');
    expect(Object.keys(embedderArg)).not.toContain('io-net');
  });
});

// ---------------------------------------------------------------------------
// T6 — indexCatalog skips embedder when OPENAI_API_KEY is unset
// ---------------------------------------------------------------------------

describe('T6 — indexCatalog: skips embedder when OpenAI key is absent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
    mockAddDocuments.mockResolvedValue({ taskUid: 2 });
  });

  it('does not call updateEmbedders when openAiApiKey is empty', async () => {
    const { ENV } = await import('../_core/env');
    const original = ENV.openAiApiKey;
    (ENV as Record<string, unknown>)['openAiApiKey'] = '';

    await indexCatalog([{ id: 0, name: 'Test', brand: 'B', code: 'T0', category: 'C' }]);

    expect(mockUpdateEmbedders).not.toHaveBeenCalled();
    // Only settings + docs tasks (2 total)
    expect(mockWaitForTask).toHaveBeenCalledTimes(2);

    (ENV as Record<string, unknown>)['openAiApiKey'] = original;
  });
});

// ---------------------------------------------------------------------------
// T7 — searchCatalog passes hybrid param with openai embedder name
// ---------------------------------------------------------------------------

describe('T7 — searchCatalog: hybrid param uses openai embedder name', () => {
  beforeEach(() => vi.clearAllMocks());

  it('includes hybrid object with embedder="openai" and semanticRatio when hybrid configured', async () => {
    mockSearch.mockResolvedValue({ hits: [{ id: 0, _rankingScore: 0.92 }] });

    await searchCatalog('playstation', 10);

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    const hybrid = opts['hybrid'] as Record<string, unknown> | undefined;
    expect(hybrid).toBeDefined();
    expect(hybrid!['embedder']).toBe('openai');
    expect(hybrid!['semanticRatio']).toBe(0.5);
  });

  it('sets showRankingScoreDetails=true when hybrid is active', async () => {
    mockSearch.mockResolvedValue({ hits: [] });

    await searchCatalog('test', 5);

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['showRankingScoreDetails']).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T8 — searchCatalog omits hybrid param when OpenAI key is unset
// ---------------------------------------------------------------------------

describe('T8 — searchCatalog: omits hybrid when OpenAI key is absent', () => {
  it('does not include hybrid when openAiApiKey is empty', async () => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ hits: [] });

    const { ENV } = await import('../_core/env');
    const original = ENV.openAiApiKey;
    (ENV as Record<string, unknown>)['openAiApiKey'] = '';

    await searchCatalog('test', 5);

    const [, opts] = mockSearch.mock.calls[0] as [string, Record<string, unknown>];
    expect(opts['hybrid']).toBeUndefined();
    expect(opts['showRankingScoreDetails']).toBe(false);

    (ENV as Record<string, unknown>)['openAiApiKey'] = original;
  });
});

// ---------------------------------------------------------------------------
// T9 — searchCatalog extracts semanticScore from _rankingScoreDetails
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T6 — deleteDocuments: calls Meilisearch with correct IDs
// ---------------------------------------------------------------------------

describe('T6 — deleteDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockDeleteDocuments.mockResolvedValue({ taskUid: 10 });
  });

  it('calls index.deleteDocuments with the given IDs and waits for task', async () => {
    await deleteDocuments([1, 5, 99]);

    expect(mockDeleteDocuments).toHaveBeenCalledOnce();
    expect(mockDeleteDocuments).toHaveBeenCalledWith([1, 5, 99]);
    expect(mockWaitForTask).toHaveBeenCalledWith(10, { timeout: 30_000 });
  });

  it('is a no-op when ids array is empty', async () => {
    await deleteDocuments([]);

    expect(mockDeleteDocuments).not.toHaveBeenCalled();
    expect(mockWaitForTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T7 — getIndexStats: returns documentCount from Meilisearch stats
// ---------------------------------------------------------------------------

describe('T7 — getIndexStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStats.mockResolvedValue({ numberOfDocuments: 6000 });
  });

  it('returns documentCount from index.getStats()', async () => {
    const result = await getIndexStats();
    expect(mockGetStats).toHaveBeenCalledOnce();
    expect(result).toEqual({ documentCount: 6000 });
  });

  it('returns documentCount: 0 when index is empty', async () => {
    mockGetStats.mockResolvedValue({ numberOfDocuments: 0 });
    const result = await getIndexStats();
    expect(result).toEqual({ documentCount: 0 });
  });
});

// ---------------------------------------------------------------------------
// STORY-140 tests
// ---------------------------------------------------------------------------

// T10 — configureIndex: updates settings + embedder without touching documents

describe('T10 — configureIndex: settings + embedder without documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
    mockUpdateEmbedders.mockResolvedValue({ taskUid: 3 });
  });

  it('calls updateSettings but NOT addDocuments', async () => {
    await configureIndex();
    expect(mockUpdateSettings).toHaveBeenCalledOnce();
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('calls updateEmbedders with openai source when hybrid configured', async () => {
    await configureIndex();
    expect(mockUpdateEmbedders).toHaveBeenCalledOnce();
    const [embedderArg] = mockUpdateEmbedders.mock.calls[0] as [Record<string, unknown>];
    const embedder = embedderArg['openai'] as Record<string, unknown>;
    expect(embedder['source']).toBe('openAi');
    expect(embedder['model']).toBe('text-embedding-3-small');
  });

  it('waits for settings task and embedder task (2 total)', async () => {
    await configureIndex();
    expect(mockWaitForTask).toHaveBeenCalledTimes(2);
  });
});

// T11 — configureIndex: skips embedder when OpenAI key is absent

describe('T11 — configureIndex: skips embedder when OpenAI key absent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTask.mockResolvedValue({ status: 'succeeded' });
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
  });

  it('does not call updateEmbedders when openAiApiKey is empty', async () => {
    const { ENV } = await import('../_core/env');
    const original = ENV.openAiApiKey;
    (ENV as Record<string, unknown>)['openAiApiKey'] = '';

    await configureIndex();

    expect(mockUpdateEmbedders).not.toHaveBeenCalled();
    expect(mockWaitForTask).toHaveBeenCalledTimes(1); // only settings

    (ENV as Record<string, unknown>)['openAiApiKey'] = original;
  });
});

// T12 — searchCatalog: falls back to BM25 on "Cannot find embedder" error

describe('T12 — searchCatalog: BM25 fallback on missing embedder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retries without hybrid when Meilisearch throws "Cannot find embedder"', async () => {
    mockSearch
      .mockRejectedValueOnce(new Error('Cannot find embedder with name `openai`.'))
      .mockResolvedValueOnce({ hits: [{ id: 5, _rankingScore: 0.72 }] });

    const results = await searchCatalog('charger', 10);

    expect(mockSearch).toHaveBeenCalledTimes(2);

    // Second call must NOT have hybrid param
    const [, secondOpts] = mockSearch.mock.calls[1] as [string, Record<string, unknown>];
    expect(secondOpts['hybrid']).toBeUndefined();
    expect(results).toHaveLength(1);
    expect(results[0]!.index).toBe(5);
  });

  it('does not set semanticScore when falling back to BM25', async () => {
    mockSearch
      .mockRejectedValueOnce(new Error('Cannot find embedder with name `openai`.'))
      .mockResolvedValueOnce({ hits: [{ id: 3, _rankingScore: 0.65 }] });

    const results = await searchCatalog('punjac', 10);
    expect(results[0]!.semanticScore).toBeUndefined();
  });

  it('does NOT fall back on unrelated errors (propagates them)', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(searchCatalog('test', 5)).rejects.toThrow('Network timeout');
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });
});

describe('T9 — searchCatalog: semanticScore extraction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets semanticScore from _rankingScoreDetails.vectorSort.value when present', async () => {
    mockSearch.mockResolvedValue({
      hits: [
        {
          id: 0,
          _rankingScore: 0.91,
          _rankingScoreDetails: { vectorSort: { value: 0.87 } },
        },
      ],
    });

    const results = await searchCatalog('joystick', 10);
    expect(results[0]!.semanticScore).toBe(0.87);
  });

  it('leaves semanticScore undefined when _rankingScoreDetails is absent', async () => {
    mockSearch.mockResolvedValue({
      hits: [{ id: 0, _rankingScore: 0.75 }],
    });

    const results = await searchCatalog('controller', 10);
    expect(results[0]!.semanticScore).toBeUndefined();
  });

  it('returns hits with both score and semanticScore correctly typed', async () => {
    mockSearch.mockResolvedValue({
      hits: [
        { id: 2, _rankingScore: 0.93, _rankingScoreDetails: { vectorSort: { value: 0.90 } } },
        { id: 5, _rankingScore: 0.82, _rankingScoreDetails: { vectorSort: { value: 0.78 } } },
      ],
    });

    const results = await searchCatalog('gaming', 10);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ index: 2, score: 0.93, semanticScore: 0.90 });
    expect(results[1]).toMatchObject({ index: 5, score: 0.82, semanticScore: 0.78 });
  });
});
