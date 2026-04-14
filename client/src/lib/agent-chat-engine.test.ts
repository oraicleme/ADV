/**
 * STORY-62: Tests for agent-chat-engine.ts
 * Covers parseAgentResponse(), buildMessagesForApi(), requestProactiveSuggestion(), and response parsing robustness.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CHAT_MODEL_PAIR_BY_MODE,
  parseAgentResponse,
  buildMessagesForApi,
  AGENT_SYSTEM_PROMPT,
  AGENT_MAIN_CHAT_SYSTEM_PROMPT,
  AGENT_INTENT_ROUTING_PROMPT,
  classifyEmptyActionsLogReason,
  jsonBraceDepthOutsideStrings,
  requestProactiveSuggestion,
  type ConversationMessage,
} from './agent-chat-engine';

vi.mock('./ionet-client', () => ({ chatCompletion: vi.fn() }));

const AGENT_CHAT_ENGINE_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'agent-chat-engine.ts'),
  'utf8',
);

const MINIMAL_CANVAS_STATE = {
  blocks: {
    headline: { text: 'Test', fontSize: 32, emojiOrIcon: '' },
    products: { columns: 0, maxProducts: 0, imageHeight: 80, showFields: {
      image: true, code: true, name: true, description: true,
      originalPrice: true, price: true, discountBadge: true, brandLogo: true,
    }},
    badge: { text: '' },
    cta: { buttons: [] },
    disclaimer: { text: '' },
    logo: { height: 64, alignment: 'center', companion: 'none' },
  },
  meta: {
    layout: 'multi-grid' as const,
    format: { id: 'viber-story', width: 1080, height: 1920 },
    elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'] as const,
    accentColor: '#f97316',
    backgroundColor: '#f8fafc',
    productCount: 3,
    dataQuality: {
      hasAllCapsNames: false,
      hasMissingPrices: false,
      hasOriginalPrices: false,
      hasDiscounts: false,
      avgDescriptionLength: 0,
      imageAnalysis: null,
    },
    catalogSummary: {
      totalProducts: 3,
      selectedCount: 3,
      categories: [{ name: 'Electronics', count: 3 }],
      sampleNames: ['Item 1', 'Item 2', 'Item 3'],
    },
  },
};

const LLAMA_33_70B = 'meta-llama/Llama-3.3-70B-Instruct';

describe('CHAT_MODEL_PAIR_BY_MODE', () => {
  it('uses Llama-3.3-70B-Instruct where gpt-oss-20b was the fast primary / smart fallback', () => {
    expect(CHAT_MODEL_PAIR_BY_MODE.fast.primary).toBe(LLAMA_33_70B);
    expect(CHAT_MODEL_PAIR_BY_MODE.smart.fallback).toBe(LLAMA_33_70B);
    expect(CHAT_MODEL_PAIR_BY_MODE.fast.fallback).toBe('openai/gpt-oss-120b');
    expect(CHAT_MODEL_PAIR_BY_MODE.smart.primary).toBe('openai/gpt-oss-120b');
  });
});

// ---- parseAgentResponse ----

describe('parseAgentResponse', () => {
  it('parses a clean JSON response with message and actions', () => {
    const raw = JSON.stringify({
      message: 'Updated the headline.',
      actions: [
        { type: 'block_patch', payload: { blockType: 'headline', property: 'text', value: 'New Headline' } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.message).toBe('Updated the headline.');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]!.type).toBe('block_patch');
  });

  it('parses a response with multiple action types', () => {
    const raw = JSON.stringify({
      message: 'Applied style and layout changes.',
      actions: [
        { type: 'style_change', payload: { backgroundColor: '#1a1a2e', accentColor: '#e94560' } },
        { type: 'layout_change', payload: { layout: 'single-hero' } },
        { type: 'format_change', payload: { format: 'story' } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.actions).toHaveLength(3);
    expect(result.actions.map((a) => a.type)).toEqual([
      'style_change',
      'layout_change',
      'format_change',
    ]);
  });

  it('returns empty message and actions for empty input', () => {
    const result = parseAgentResponse('');
    expect(result.message).toBe('');
    expect(result.actions).toHaveLength(0);
  });

  it('falls back to treating the text as message when JSON is invalid', () => {
    const result = parseAgentResponse('Not JSON — just a plain text response.');
    expect(result.message).toBe('Not JSON — just a plain text response.');
    expect(result.actions).toHaveLength(0);
  });

  it('handles JSON wrapped in markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify({ message: 'Done!', actions: [] }) + '\n```';
    const result = parseAgentResponse(raw);
    expect(result.message).toBe('Done!');
  });

  it('handles JSON preceded by explanation text', () => {
    const json = JSON.stringify({ message: 'Applied changes.', actions: [] });
    const raw = `Here is the result:\n${json}`;
    const result = parseAgentResponse(raw);
    expect(result.message).toBe('Applied changes.');
  });

  it('filters out actions with unknown types', () => {
    const raw = JSON.stringify({
      message: 'Done',
      actions: [
        { type: 'unknown_action', payload: {} },
        { type: 'layout_change', payload: { layout: 'multi-grid' } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]!.type).toBe('layout_change');
  });

  it('handles actions array with null/invalid entries gracefully', () => {
    const raw = JSON.stringify({
      message: 'Done',
      actions: [null, undefined, 'string', { type: 'style_change', payload: { accentColor: '#fff' } }],
    });
    const result = parseAgentResponse(raw);
    expect(result.actions).toHaveLength(1);
  });

  it('handles response with no actions field', () => {
    const raw = JSON.stringify({ message: 'Nothing to change.' });
    const result = parseAgentResponse(raw);
    expect(result.message).toBe('Nothing to change.');
    expect(result.actions).toHaveLength(0);
  });

  it('correctly parses a Serbian language response', () => {
    const raw = JSON.stringify({
      message: 'Napravio sam promjene na reklami!',
      actions: [
        { type: 'block_patch', payload: { blockType: 'badge', property: 'text', value: 'RASPRODAJA' } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.message).toBe('Napravio sam promjene na reklami!');
    expect(result.actions[0]?.payload).toMatchObject({ blockType: 'badge', property: 'text', value: 'RASPRODAJA' });
  });

  it('handles element_reorder action type', () => {
    const raw = JSON.stringify({
      message: 'Reordered elements.',
      actions: [
        {
          type: 'element_reorder',
          payload: { order: ['badge', 'headline', 'products', 'cta', 'disclaimer'] },
        },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.actions[0]!.type).toBe('element_reorder');
  });

  it('handles product_action type', () => {
    const raw = JSON.stringify({
      message: 'Showing first 3 products only.',
      actions: [
        { type: 'product_action', payload: { action: 'deselect', indices: [3, 4] } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.actions[0]!.type).toBe('product_action');
  });

  it('captures reasoning field from chain-of-thought response', () => {
    const raw = JSON.stringify({
      reasoning: '6 electronics products on story canvas — Dark Premium palette, AIDA framework, 3 columns at 180px.',
      message: 'Applied Dark Premium palette with optimized layout.',
      actions: [
        { type: 'style_change', payload: { backgroundColor: '#0d0d1a', accentColor: '#6366f1' } },
      ],
    });
    const result = parseAgentResponse(raw);
    expect(result.reasoning).toBe('6 electronics products on story canvas — Dark Premium palette, AIDA framework, 3 columns at 180px.');
    expect(result.message).toBe('Applied Dark Premium palette with optimized layout.');
    expect(result.actions).toHaveLength(1);
  });

  it('returns undefined reasoning when not present in response', () => {
    const raw = JSON.stringify({ message: 'Done!', actions: [] });
    const result = parseAgentResponse(raw);
    expect(result.reasoning).toBeUndefined();
  });

  // Truncation recovery — these simulate the real failure mode where the LLM
  // hits max_completion_tokens mid-response and the JSON is cut off.
  it('recovers message from truncated JSON (no closing brace)', () => {
    const truncated = `{"reasoning":"6 products on story...","message":"Odabrao sam Denmen držače!","actions":[{"type":"catalog_filter","payload":{"nameContains":"Denmen","category":"Držači za mob. tel.","maxSelect":0`;
    const result = parseAgentResponse(truncated);
    expect(result.message).toBe('Odabrao sam Denmen držače!');
  });

  it('recovers complete actions from a response truncated mid-actions-array', () => {
    const completeAction = `{"type":"catalog_filter","payload":{"nameContains":"Denmen","category":"Test","maxSelect":0,"deselectOthers":true}}`;
    const truncated = `{"message":"Filtering...","actions":[${completeAction},{"type":"style_change","payload":{"backgroundCo`;
    const result = parseAgentResponse(truncated);
    expect(result.message).toBe('Filtering...');
    // At least the complete action should be recovered
    expect(result.actions.length).toBeGreaterThanOrEqual(1);
    expect(result.actions[0]!.type).toBe('catalog_filter');
  });

  it('does not show raw JSON reasoning prefix in fallback message', () => {
    const rawWithPrefix = `"reasoning": "Some technical reasoning...","message": `;
    const result = parseAgentResponse(rawWithPrefix);
    expect(result.message).not.toMatch(/^"reasoning"/);
  });
});

// ---- buildMessagesForApi ----

describe('buildMessagesForApi', () => {
  it('starts with system message', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Hello');
    expect(messages[0]!.role).toBe('system');
    expect(messages[0]!.content).toBe(AGENT_MAIN_CHAT_SYSTEM_PROMPT);
  });

  it('STORY-189: system message includes intent routing section', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Hi');
    const sys = messages[0]!.content as string;
    expect(sys).toContain('USER INTENT ROUTING');
    expect(sys).toContain('SEARCH / CATALOG / WORKSPACE HELP');
    expect(AGENT_INTENT_ROUTING_PROMPT.length).toBeGreaterThan(100);
  });

  it('STORY-195: system message includes grounded search architecture for merchant/developer explanations', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'How does search work?');
    const sys = messages[0]!.content as string;
    expect(sys).toContain('SEARCH ARCHITECTURE');
    expect(sys).toContain('MiniSearch');
    expect(sys).toContain('Meilisearch');
    expect(sys).toContain('selectProducts');
  });

  it('ends with user message embedding canvas state', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Make it dark');
    const last = messages[messages.length - 1]!;
    expect(last.role).toBe('user');
    expect(typeof last.content).toBe('string');
    const content = last.content as string;
    expect(content).toContain('Make it dark');
    expect(content).toContain('multi-grid');
  });

  it('includes conversation history between system and current user message', () => {
    const history: ConversationMessage[] = [
      { role: 'user', content: 'First message', timestamp: 1 },
      { role: 'assistant', content: 'First response', timestamp: 2 },
    ];
    const messages = buildMessagesForApi(history, MINIMAL_CANVAS_STATE, 'Second message');
    expect(messages).toHaveLength(4); // system + 2 history + current user
    expect(messages[1]!.content).toBe('First message');
    expect(messages[2]!.content).toBe('First response');
  });

  it('trims history to last 10 messages', () => {
    const history: ConversationMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant' as const,
      content: `Message ${i}`,
      timestamp: i,
    }));
    const messages = buildMessagesForApi(history, MINIMAL_CANVAS_STATE, 'New message');
    // system(1) + history(10) + current(1) = 12
    expect(messages).toHaveLength(12);
  });

  it('handles empty history', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Hello');
    // system(1) + current(1) = 2
    expect(messages).toHaveLength(2);
  });

  it('embeds the current canvas state JSON in the user message', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Test');
    const userMsg = messages[messages.length - 1]!.content as string;
    expect(userMsg).toContain('"layout": "multi-grid"');
    expect(userMsg).toContain('"productCount": 3');
  });

  it('STORY-175: merges workspace brief into system message when provided', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Hi', 'Prefer Balkan retail tone.');
    expect(messages[0]!.role).toBe('system');
    const sys = messages[0]!.content as string;
    expect(sys).toContain('Workspace creative brief');
    expect(sys).toContain('Prefer Balkan retail tone.');
    expect(sys.startsWith(AGENT_SYSTEM_PROMPT)).toBe(true);
  });
});

// ---- System prompt ----

describe('AGENT_SYSTEM_PROMPT', () => {
  it('mentions all required output format fields', () => {
    expect(AGENT_SYSTEM_PROMPT).toContain('"message"');
    expect(AGENT_SYSTEM_PROMPT).toContain('"actions"');
    expect(AGENT_SYSTEM_PROMPT).toContain('"type"');
    expect(AGENT_SYSTEM_PROMPT).toContain('"payload"');
    expect(AGENT_SYSTEM_PROMPT).toContain('"reasoning"');
  });

  it('lists all action types', () => {
    expect(AGENT_SYSTEM_PROMPT).toContain('block_patch');
    expect(AGENT_SYSTEM_PROMPT).toContain('layout_change');
    expect(AGENT_SYSTEM_PROMPT).toContain('format_change');
    expect(AGENT_SYSTEM_PROMPT).toContain('style_change');
    expect(AGENT_SYSTEM_PROMPT).toContain('product_action');
    expect(AGENT_SYSTEM_PROMPT).toContain('element_reorder');
  });

  it('includes language instruction', () => {
    expect(AGENT_SYSTEM_PROMPT.toUpperCase()).toContain('LANGUAGE');
  });

  it('includes AIDA copywriting framework', () => {
    expect(AGENT_SYSTEM_PROMPT).toContain('AIDA');
  });

  it('includes PAS copywriting framework', () => {
    expect(AGENT_SYSTEM_PROMPT).toContain('PAS');
  });

  it('includes reasoning instruction for chain-of-thought', () => {
    expect(AGENT_SYSTEM_PROMPT.toLowerCase()).toContain('reasoning');
  });
});

describe('SUGGESTION_SYSTEM_PROMPT (invariants)', () => {
  it('forbids non-actionable messages and anti-multipage product-capping advice', () => {
    expect(AGENT_CHAT_ENGINE_SOURCE).toContain(
      'Never output non-empty "message" with an empty "actions"',
    );
    expect(AGENT_CHAT_ENGINE_SOURCE).toContain('NEVER suggest lowering maxProducts');
    expect(AGENT_CHAT_ENGINE_SOURCE).toContain('productBlockOptions.columns');
  });
});

// ---- STORY-191: empty-actions classification ----

describe('jsonBraceDepthOutsideStrings', () => {
  it('returns 0 for balanced JSON object', () => {
    expect(jsonBraceDepthOutsideStrings('{"message":"hi","actions":[]}')).toBe(0);
  });

  it('returns non-zero when an object is not closed (truncation)', () => {
    expect(
      jsonBraceDepthOutsideStrings(
        '{"message":"hi","actions":[{"type":"block_patch","payload":{"blockType":"headline"',
      ),
    ).not.toBe(0);
  });

  it('ignores braces inside JSON string values', () => {
    expect(jsonBraceDepthOutsideStrings('{"message":"brace { in text","actions":[]}')).toBe(0);
  });
});

describe('classifyEmptyActionsLogReason (STORY-191)', () => {
  it('informational_empty for complete JSON with empty actions', () => {
    expect(classifyEmptyActionsLogReason('{"message":"Explained search.","actions":[]}')).toBe(
      'informational_empty',
    );
  });

  it('truncation_suspected when braces are unbalanced', () => {
    expect(
      classifyEmptyActionsLogReason(
        '{"reasoning":"x","message":"y","actions":[{"type":"catalog_filter","payload":',
      ),
    ).toBe('truncation_suspected');
  });

  it('informational_empty for prose without JSON braces', () => {
    expect(classifyEmptyActionsLogReason('Just plain assistant text.')).toBe('informational_empty');
  });

  it('strips markdown fence before classifying', () => {
    const inner = '{"message":"x","actions":[]}';
    expect(classifyEmptyActionsLogReason('```json\n' + inner + '\n```')).toBe('informational_empty');
  });
});

// ---- requestProactiveSuggestion (Phase 2) ----

describe('requestProactiveSuggestion', () => {
  const minimalCanvasState = {
    headline: '',
    titleFontSize: 32,
    emojiOrIcon: '',
    badgeText: '',
    ctaButtons: [] as string[],
    disclaimerText: '',
    elementOrder: ['headline', 'products', 'badge', 'cta', 'disclaimer'] as const,
    layout: 'multi-grid' as const,
    style: { backgroundColor: '#f8fafc', accentColor: '#f97316', fontFamily: '' },
    logoHeight: 64,
    logoAlignment: 'center' as const,
    logoCompanion: 'none' as const,
    productBlockOptions: {
      columns: 0,
      maxProducts: 0,
      imageHeight: 80,
      showFields: {
        image: true,
        code: true,
        name: true,
        description: true,
        originalPrice: true,
        price: true,
        discountBadge: true,
        brandLogo: true,
      },
    },
    productCount: 3,
    format: { id: 'viber-story', width: 1080, height: 1920 },
    dataQuality: {
      hasAllCapsNames: false,
      hasMissingPrices: false,
      hasOriginalPrices: false,
      hasDiscounts: false,
      avgDescriptionLength: 0,
      imageAnalysis: null,
    },
    catalogSummary: {
      totalProducts: 3,
      selectedCount: 3,
      categories: [{ name: 'Electronics', count: 3 }],
      sampleNames: ['A', 'B', 'C'],
    },
  };

  beforeEach(async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockReset();
  });

  it('returns parsed message and actions when API returns valid suggestion JSON', async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: 'Your headline is empty. Add a short headline to increase engagement.',
              actions: [
                { type: 'block_patch', payload: { blockType: 'headline', property: 'text', value: 'Best Deals' } },
              ],
            }),
            finish_reason: 'stop',
          },
        },
      ],
    });
    const result = await requestProactiveSuggestion({
      apiKey: 'test-key',
      canvasState: minimalCanvasState,
    });
    expect(result.message).toBe('Your headline is empty. Add a short headline to increase engagement.');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]!.type).toBe('block_patch');
  });

  it('returns empty message and actions when API returns no suggestion', async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify({ message: '', actions: [] }), finish_reason: 'stop' } },
      ],
    });
    const result = await requestProactiveSuggestion({
      apiKey: 'test-key',
      canvasState: minimalCanvasState,
    });
    expect(result.message).toBe('');
    expect(result.actions).toHaveLength(0);
  });

  it('returns empty when API returns message without actions (not actionable)', async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: 'You should really improve this.',
              actions: [],
            }),
            finish_reason: 'stop',
          },
        },
      ],
    });
    const result = await requestProactiveSuggestion({
      apiKey: 'test-key',
      canvasState: minimalCanvasState,
    });
    expect(result.message).toBe('');
    expect(result.actions).toHaveLength(0);
  });

  it('uses fallback label when API returns actions but empty message', async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: '',
              actions: [
                { type: 'block_patch', payload: { blockType: 'badge', property: 'text', value: 'SALE' } },
              ],
            }),
            finish_reason: 'stop',
          },
        },
      ],
    });
    const result = await requestProactiveSuggestion({
      apiKey: 'test-key',
      canvasState: minimalCanvasState,
    });
    expect(result.message).toBe('Suggested update');
    expect(result.actions).toHaveLength(1);
  });

  it('STORY-175: includes workspace brief in suggestion system prompt when provided', async () => {
    const { chatCompletion } = await import('./ionet-client');
    vi.mocked(chatCompletion).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ message: '', actions: [] }), finish_reason: 'stop' } }],
    });
    await requestProactiveSuggestion({
      apiKey: 'test-key',
      canvasState: minimalCanvasState,
      userBrief: 'Always suggest luxury palettes.',
    });
    const call = vi.mocked(chatCompletion).mock.calls[0];
    expect(call).toBeDefined();
    const payload = call![1] as { messages: { role: string; content: string }[] };
    expect(payload.messages[0]!.role).toBe('system');
    expect(payload.messages[0]!.content).toContain('Always suggest luxury palettes.');
    expect(payload.messages[0]!.content).toContain('Workspace creative brief');
  });
});
