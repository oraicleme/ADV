/**
 * STORY-62: Tests for agent-chat-engine.ts
 * Covers parseAgentResponse(), buildMessagesForApi(), requestProactiveSuggestion(), and response parsing robustness.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseAgentResponse,
  buildMessagesForApi,
  AGENT_SYSTEM_PROMPT,
  requestProactiveSuggestion,
  type ConversationMessage,
} from './agent-chat-engine';

vi.mock('./ionet-client', () => ({ chatCompletion: vi.fn() }));

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
});

// ---- buildMessagesForApi ----

describe('buildMessagesForApi', () => {
  it('starts with system message', () => {
    const messages = buildMessagesForApi([], MINIMAL_CANVAS_STATE, 'Hello');
    expect(messages[0]!.role).toBe('system');
    expect(messages[0]!.content).toBe(AGENT_SYSTEM_PROMPT);
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
});
