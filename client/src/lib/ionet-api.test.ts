import { describe, it, expect } from 'vitest';

/**
 * Test to validate VITE_IONET_API_KEY frontend secret.
 * This test verifies that the IO.NET API key is properly configured
 * and can be used to call the AI Design Assistant.
 */
describe('IO.NET Frontend API', () => {
  it('should have VITE_IONET_API_KEY configured', () => {
    const apiKey = import.meta.env.VITE_IONET_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(apiKey).toMatch(/^io-v2-/);
  });

  it('should be able to call IO.NET API with the key', async () => {
    const apiKey = import.meta.env.VITE_IONET_API_KEY;
    
    if (!apiKey) {
      console.warn('VITE_IONET_API_KEY not configured, skipping API test');
      return;
    }

    try {
      const response = await fetch('https://api.intelligence.io.solutions/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(Array.isArray(data.data) || Array.isArray(data)).toBe(true);
    } catch (error) {
      console.error('IO.NET API test failed:', error);
      throw error;
    }
  });
});
