/**
 * STORY-189: Retail Promo chat starter chips insert full prompt text.
 */
import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import AgentChatPanel from './AgentChatPanel';
import { RETAIL_PROMO_CHAT_STARTERS } from '../lib/agent-chat-starters';

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

describe('AgentChatPanel starter prompts', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it('clicking a starter chip inserts the full text into the input', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const first = RETAIL_PROMO_CHAT_STARTERS[0]!;
    await act(async () => {
      root!.render(
        createElement(AgentChatPanel, {
          messages: [],
          onSend: async () => {},
          pending: false,
          error: null,
          model: 'smart',
          onModelChange: () => {},
          onUndo: () => {},
          canUndo: false,
          starterPrompts: RETAIL_PROMO_CHAT_STARTERS,
        }),
      );
    });

    const chip = container.querySelector('[data-testid="chat-starter-chip"]');
    expect(chip).toBeTruthy();
    await act(async () => {
      (chip as HTMLButtonElement).click();
    });

    const ta = container.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement | null;
    expect(ta?.value).toBe(first.text);
  });
});
