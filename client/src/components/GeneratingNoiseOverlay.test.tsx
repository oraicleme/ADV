import { describe, it, expect } from 'vitest';
import { GeneratingNoiseOverlay } from './GeneratingNoiseOverlay';

describe('GeneratingNoiseOverlay', () => {
  it('component exists and is importable', () => {
    expect(GeneratingNoiseOverlay).toBeDefined();
    expect(typeof GeneratingNoiseOverlay).toBe('function');
  });

  it('renders without errors', () => {
    const component = GeneratingNoiseOverlay();
    expect(component).toBeDefined();
    expect(component.type).toBe('div');
  });
});
