import { describe, expect, it } from 'vitest';
import { RETAIL_PROMO_CHAT_STARTERS } from './agent-chat-starters';

describe('RETAIL_PROMO_CHAT_STARTERS (STORY-189)', () => {
  it('has at least three distinct starters covering search, design, and full ad', () => {
    expect(RETAIL_PROMO_CHAT_STARTERS.length).toBeGreaterThanOrEqual(3);
    const joined = RETAIL_PROMO_CHAT_STARTERS.map((s) => `${s.label} ${s.text}`).join(' ');
    expect(joined.toLowerCase()).toMatch(/min-Score|pretraga|search/i);
    expect(joined.toLowerCase()).toMatch(/naslov|bez catalog_filter|dizajn|design/i);
    expect(joined.toLowerCase()).toMatch(/kompletn|full|puna|profesional/i);
  });

  it('each starter has non-empty label and text', () => {
    for (const s of RETAIL_PROMO_CHAT_STARTERS) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.text.trim().length).toBeGreaterThan(10);
    }
  });
});
