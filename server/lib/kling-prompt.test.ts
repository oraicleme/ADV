import { describe, it, expect } from 'vitest';
import { buildKlingPromptFromCanvas } from './kling-prompt';

describe('buildKlingPromptFromCanvas', () => {
  it('includes headline, CTA, product names, and negative prompt', () => {
    const r = buildKlingPromptFromCanvas({
      headline: 'Spring Sale',
      cta: 'Shop now',
      formatLabel: 'Story 9:16',
      locale: 'en',
      products: [
        { name: 'USB-C Hub', category: 'Electronics' },
        { name: 'Wireless Mouse', brand: 'Acme' },
      ],
    });
    expect(r.prompt).toContain('Spring Sale');
    expect(r.prompt).toContain('Shop now');
    expect(r.prompt).toContain('USB-C Hub');
    expect(r.prompt).toContain('Electronics');
    expect(r.negativePrompt.length).toBeGreaterThan(10);
    expect(r.metadata.productCount).toBe(2);
    expect(r.metadata.productNamesSample).toContain('USB-C Hub');
    expect(r.metadata.locale).toBe('en');
  });

  it('truncates very long combined prompt', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ name: `Product ${i} `.repeat(40) }));
    const r = buildKlingPromptFromCanvas({
      headline: 'H',
      products: many,
    });
    expect(r.prompt.length).toBeLessThanOrEqual(2400);
  });
});
