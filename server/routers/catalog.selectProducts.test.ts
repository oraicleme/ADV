/**
 * STORY-119: Tests for catalog.selectProducts LLM response parsing and validation.
 * STORY-130: Model-scope test (T2) and prompt structure assertions.
 * STORY-150: Negative-constraint tests (iPhone 15 / Makita 18V) + category-agnostic prompt.
 * Mocks invokeLLM to test the endpoint's input/output contract without live API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../_core/llm', () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from '../_core/llm';
import { catalogRouter } from './catalog';
import type { TrpcContext } from '../_core/context';

const mockInvokeLLM = vi.mocked(invokeLLM);

// ---------------------------------------------------------------------------
// Helpers — replicate the response-parsing logic from catalog.ts for testing
// ---------------------------------------------------------------------------

interface Candidate {
  index: number;
  name: string;
  code?: string;
  category?: string;
  brand?: string;
}

/**
 * Parses the LLM JSON response for selectProducts.
 * Mirrors the validation in catalog.ts: only valid integers that appear in candidateIndexSet.
 */
function parseSelectProductsResponse(
  content: string,
  candidates: Candidate[],
  maxSelect: number,
): number[] {
  const candidateIndexSet = new Set(candidates.map((c) => c.index));
  const parsed = JSON.parse(content) as { indices?: unknown; reasoning?: string };
  if (!Array.isArray(parsed.indices)) return [];
  return (parsed.indices as unknown[])
    .filter((v): v is number => typeof v === 'number' && Number.isInteger(v) && candidateIndexSet.has(v))
    .slice(0, maxSelect > 0 ? maxSelect : undefined);
}

// ---------------------------------------------------------------------------
// Test catalog
// ---------------------------------------------------------------------------

const testCandidates: Candidate[] = [
  { index: 0, name: 'Punjač 65W Type-C za Auto', code: 'CHG-TC-65', category: 'Punjači za auto', brand: 'Baseus' },
  { index: 1, name: 'USB-C Punjač 20W za Auto', code: 'CHG-USBC-20', category: 'Punjači za auto', brand: 'Hoco' },
  { index: 2, name: 'Futrola za iPhone 15 Pro', code: 'FUT-15P', category: 'Futrole', brand: 'Hoco' },
  { index: 3, name: 'Lightning na USB Kabel 1m', code: 'LIG-1M', category: 'Kablovi', brand: 'Baseus' },
  { index: 4, name: 'Bluetooth USB Adapter LV-B15B', code: 'LV-B15B', category: 'Adapteri', brand: 'LV' },
  { index: 5, name: 'USB-A Punjač 10W za Auto', code: 'CHG-USBA-10', category: 'Punjači za auto', brand: 'Hoco' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectProducts — LLM response parsing', () => {
  it('returns matching indices for charger query', () => {
    const llmResponse = JSON.stringify({ indices: [0, 1, 5], reasoning: 'All are auto chargers.' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toEqual([0, 1, 5]);
  });

  it('rejects indices not present in candidates (hallucinated indices)', () => {
    const llmResponse = JSON.stringify({ indices: [0, 99, 999], reasoning: 'Some invented.' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toEqual([0]); // 99 and 999 are not in candidateIndexSet
  });

  it('rejects non-integer values in indices array', () => {
    const llmResponse = JSON.stringify({ indices: [0, 1.5, 'two', null, 2], reasoning: '' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toEqual([0, 2]); // only valid integers in candidateIndexSet
  });

  it('respects maxSelect cap', () => {
    const llmResponse = JSON.stringify({ indices: [0, 1, 2, 3, 4, 5], reasoning: 'All match.' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 3);
    expect(result).toHaveLength(3);
    expect(result).toEqual([0, 1, 2]);
  });

  it('returns empty array when LLM responds with empty indices', () => {
    const llmResponse = JSON.stringify({ indices: [], reasoning: 'Nothing matched.' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toEqual([]);
  });

  it('returns empty array when indices field is missing', () => {
    const llmResponse = JSON.stringify({ reasoning: 'No indices returned.' });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toEqual([]);
  });

  it('handles maxSelect=0 as no limit (returns all matching)', () => {
    const llmResponse = JSON.stringify({ indices: [0, 1, 2, 3, 4, 5] });
    const result = parseSelectProductsResponse(llmResponse, testCandidates, 0);
    expect(result).toHaveLength(6);
  });
});

describe('selectProducts — candidate list construction', () => {
  it('produces compact candidate strings for the LLM prompt', () => {
    const candidate = testCandidates[0]!;
    const parts = [
      `index:${candidate.index}`,
      `name:"${candidate.name}"`,
      candidate.brand ? `brand:"${candidate.brand}"` : '',
      candidate.category ? `category:"${candidate.category}"` : '',
      candidate.code ? `code:${candidate.code}` : '',
    ].filter(Boolean);
    const line = `{${parts.join(', ')}}`;
    expect(line).toContain('index:0');
    expect(line).toContain('name:"Punjač 65W Type-C za Auto"');
    expect(line).toContain('brand:"Baseus"');
    expect(line).toContain('category:"Punjači za auto"');
    expect(line).toContain('code:CHG-TC-65');
  });

  it('omits missing optional fields from candidate string', () => {
    const minimalCandidate: Candidate = { index: 10, name: 'Generic Product' };
    const parts = [
      `index:${minimalCandidate.index}`,
      `name:"${minimalCandidate.name}"`,
      minimalCandidate.brand ? `brand:"${minimalCandidate.brand}"` : '',
      minimalCandidate.category ? `category:"${minimalCandidate.category}"` : '',
      minimalCandidate.code ? `code:${minimalCandidate.code}` : '',
    ].filter(Boolean);
    const line = `{${parts.join(', ')}}`;
    expect(line).not.toContain('brand:');
    expect(line).not.toContain('category:');
    expect(line).toContain('index:10');
  });
});

describe('selectProducts — semantic intent (behavior documentation)', () => {
  /**
   * These tests document the INTENT of the system — the LLM is expected to handle these cases.
   * We simulate what a correct LLM response would be.
   */

  it('USB-C query matches Type-C products (vocabulary bridging)', () => {
    // User asks for "USB-C punjači", catalog has "Type-C Punjač" — LLM bridges this
    const simulatedLLMResponse = JSON.stringify({
      indices: [0, 1, 5], // includes Type-C (0) and USB-C (1) — both are USB-C chargers
      reasoning: 'USB-C and Type-C are the same connector standard. All three are auto chargers.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, testCandidates, 0);
    expect(result).toContain(0); // Type-C Punjač — LLM knows USB-C = Type-C
    expect(result).toContain(1); // USB-C Punjač
    expect(result).not.toContain(2); // Futrola — not a charger
    expect(result).not.toContain(3); // Kabel — not a charger
  });

  it('category-specific query excludes other categories', () => {
    // User asks for "auto punjači" — LLM should NOT include cables or cases
    const simulatedLLMResponse = JSON.stringify({
      indices: [0, 1, 5],
      reasoning: 'Only auto chargers match.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, testCandidates, 0);
    expect(result).not.toContain(2); // Futrola
    expect(result).not.toContain(3); // Kabel
    expect(result).not.toContain(4); // Adapter
  });

  it('brand + category query matches correctly', () => {
    // User asks for "Hoco punjači" — should match Hoco chargers only
    const simulatedLLMResponse = JSON.stringify({
      indices: [1, 5], // Hoco chargers only (not Baseus 0)
      reasoning: 'Only Hoco brand chargers selected.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, testCandidates, 0);
    expect(result).toContain(1);
    expect(result).toContain(5);
    expect(result).not.toContain(0); // Baseus charger excluded
  });
});

describe('selectProducts — retry on bad LLM response', () => {
  const minimalCtx: TrpcContext = {
    req: {} as any,
    res: {} as any,
    user: null,
  };

  beforeEach(() => {
    mockInvokeLLM.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries when first call returns no content and succeeds on second', async () => {
    mockInvokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: null } }] } as any)
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: '{"indices":[0,1,5],"reasoning":"Auto chargers."}' } }],
      } as any);

    const caller = catalogRouter.createCaller(minimalCtx as any);
    const resultPromise = caller.selectProducts({
      query: 'auto punjači',
      candidates: testCandidates,
      maxSelect: 0,
    });

    await vi.advanceTimersByTimeAsync(800);
    const result = await resultPromise;

    expect(result.indices).toEqual([0, 1, 5]);
    expect(result.reasoning).toBe('Auto chargers.');
    expect(mockInvokeLLM).toHaveBeenCalledTimes(2);
  });

  it('returns empty indices and reasoning when all attempts return no content', async () => {
    mockInvokeLLM
      .mockResolvedValue({ choices: [{ message: { role: 'assistant', content: null } }] } as any);

    const caller = catalogRouter.createCaller(minimalCtx as any);
    const resultPromise = caller.selectProducts({
      query: 'punjači',
      candidates: testCandidates,
      maxSelect: 0,
    });

    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(800);
    const result = await resultPromise;

    expect(result.indices).toEqual([]);
    expect(result.reasoning).toBe('LLM returned no content.');
    expect(mockInvokeLLM).toHaveBeenCalledTimes(3);
  });

  it('retries on unrecoverable JSON and succeeds on second attempt', async () => {
    mockInvokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'not valid json at all' } }] } as any)
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: '{"indices":[2,3],"reasoning":"Cases and cables."}' } }],
      } as any);

    const caller = catalogRouter.createCaller(minimalCtx as any);
    const resultPromise = caller.selectProducts({
      query: 'kablovi',
      candidates: testCandidates,
      maxSelect: 0,
    });

    await vi.advanceTimersByTimeAsync(800);
    const result = await resultPromise;

    expect(result.indices).toEqual([2, 3]);
    expect(result.reasoning).toBe('Cases and cables.');
    expect(mockInvokeLLM).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// STORY-150: Negative constraints — entity-strict, category-agnostic
// ---------------------------------------------------------------------------

const iphoneNegativeCandidates: Candidate[] = [
  { index: 20, name: 'Futrola za iPhone 14', code: 'FUT-14', category: 'Futrole', brand: 'Hoco' },
  { index: 21, name: 'Futrola za iPhone 15', code: 'FUT-15', category: 'Futrole', brand: 'Hoco' },
  { index: 22, name: 'Futrola za iPhone 15 Pro', code: 'FUT-15P', category: 'Futrole', brand: 'Baseus' },
  { index: 23, name: 'Futrola za iPhone 16', code: 'FUT-16', category: 'Futrole', brand: 'Hoco' },
];

const makitaBatteryCandidates: Candidate[] = [
  { index: 30, name: 'Makita baterija 12V 2Ah', code: 'BL1021B', category: 'Baterije za alat', brand: 'Makita' },
  { index: 31, name: 'Makita baterija 18V 3Ah', code: 'BL1830B', category: 'Baterije za alat', brand: 'Makita' },
  { index: 32, name: 'Makita baterija 18V 5Ah', code: 'BL1850B', category: 'Baterije za alat', brand: 'Makita' },
  { index: 33, name: 'Makita baterija 20V Max', code: 'BL2030B', category: 'Baterije za alat', brand: 'Makita' },
];

describe('selectProducts — negative constraints (STORY-150)', () => {
  it('iPhone 15 query: simulated LLM response excludes iPhone 14 and iPhone 16', () => {
    const simulatedLLMResponse = JSON.stringify({
      indices: [21, 22],
      reasoning: 'Only iPhone 15 and iPhone 15 Pro match; iPhone 14 and iPhone 16 are excluded.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, iphoneNegativeCandidates, 0);
    expect(result).toContain(21);      // iPhone 15 ✓
    expect(result).toContain(22);      // iPhone 15 Pro ✓
    expect(result).not.toContain(20);  // iPhone 14 ✗
    expect(result).not.toContain(23);  // iPhone 16 ✗
  });

  it('Makita 18V baterija query: simulated LLM response excludes 12V and 20V batteries', () => {
    const simulatedLLMResponse = JSON.stringify({
      indices: [31, 32],
      reasoning: 'Only 18V Makita batteries match the query; 12V and 20V are excluded.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, makitaBatteryCandidates, 0);
    expect(result).toContain(31);      // 18V 3Ah ✓
    expect(result).toContain(32);      // 18V 5Ah ✓
    expect(result).not.toContain(30);  // 12V ✗
    expect(result).not.toContain(33);  // 20V ✗
  });

  it('hallucinated indices outside candidate list are rejected even in negative-constraint scenarios', () => {
    const simulatedLLMResponse = JSON.stringify({
      indices: [21, 22, 99, 100],
      reasoning: 'iPhone 15 matches plus hallucinated indices.',
    });
    const result = parseSelectProductsResponse(simulatedLLMResponse, iphoneNegativeCandidates, 0);
    expect(result).toContain(21);
    expect(result).toContain(22);
    expect(result).not.toContain(99);
    expect(result).not.toContain(100);
  });
});

// ---------------------------------------------------------------------------
// STORY-130 T2: model-scope — when user asks for a specific model, only matching candidates
// ---------------------------------------------------------------------------

const modelScopeCandidates: Candidate[] = [
  { index: 10, name: 'Futrola za iPhone 14', code: 'FUT-14', category: 'Futrole', brand: 'Hoco' },
  { index: 11, name: 'Futrola za iPhone 15', code: 'FUT-15', category: 'Futrole', brand: 'Hoco' },
  { index: 12, name: 'Futrola za iPhone 15 Pro', code: 'FUT-15P', category: 'Futrole', brand: 'Baseus' },
  { index: 13, name: 'Futrola za iPhone 16', code: 'FUT-16', category: 'Futrole', brand: 'Hoco' },
];

describe('selectProducts — model-scope (STORY-130 T2)', () => {
  const minimalCtx: TrpcContext = {
    req: {} as any,
    res: {} as any,
    user: null,
  };

  beforeEach(() => {
    mockInvokeLLM.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns only candidates matching the requested model when query is model-specific', async () => {
    // Query "iPhone 15 futrole" → LLM must return only iPhone 15 (indices 11, 12), exclude 14 and 16
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '{"indices":[11,12],"reasoning":"Only iPhone 15 cases match."}',
          },
        },
      ],
    } as any);

    const caller = catalogRouter.createCaller(minimalCtx as any);
    const resultPromise = caller.selectProducts({
      query: 'iPhone 15 futrole',
      candidates: modelScopeCandidates,
      maxSelect: 0,
    });

    await vi.advanceTimersByTimeAsync(0);
    const result = await resultPromise;

    expect(result.indices).toEqual([11, 12]);
    const returnedNames = result.indices.map(
      (i) => modelScopeCandidates.find((c) => c.index === i)!.name,
    );
    expect(returnedNames).toContain('Futrola za iPhone 15');
    expect(returnedNames).toContain('Futrola za iPhone 15 Pro');
    expect(result.indices).not.toContain(10); // iPhone 14 excluded
    expect(result.indices).not.toContain(13); // iPhone 16 excluded
  });

  it('system prompt includes structured sections (Role, Task, Constraints, Format) and entity-strict rules (STORY-150)', async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '{"indices":[11],"reasoning":"iPhone 15 only."}',
          },
        },
      ],
    } as any);

    const caller = catalogRouter.createCaller(minimalCtx as any);
    await caller.selectProducts({
      query: 'iPhone 15 cases',
      candidates: modelScopeCandidates,
      maxSelect: 0,
    });

    expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
    const systemContent = (mockInvokeLLM.mock.calls[0]! as any)[0].messages.find(
      (m: { role: string }) => m.role === 'system',
    )?.content as string;

    // STORY-150: structured sections — Constraints (not Rules), Format (not Output)
    expect(systemContent).toContain('Role');
    expect(systemContent).toContain('Task');
    expect(systemContent).toContain('Constraints');
    expect(systemContent).toContain('Format');
    // Entity scope and exclusion rules present
    expect(systemContent).toMatch(/include ONLY candidates that match that exact entity/i);
    expect(systemContent).toMatch(/EXCLUDE/i);
    // Category-agnostic: cross-category example (not mobile-only)
    expect(systemContent).toMatch(/Makita 18V|18V battery/i);
  });
});
