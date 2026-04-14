/**
 * STORY-172: llm-api-key-storage — localStorage roundtrip (no import.meta in assertions).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LLM_API_KEY_STORAGE_KEY,
  getUserStoredLlmApiKey,
  setUserLlmApiKey,
} from './llm-api-key-storage';

describe('llm-api-key-storage', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => (k in store ? store[k]! : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      } as Storage,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of Object.keys(store)) delete store[k];
  });

  it('stores and reads user key', () => {
    expect(getUserStoredLlmApiKey()).toBeUndefined();
    setUserLlmApiKey('sk-test-123');
    expect(store[LLM_API_KEY_STORAGE_KEY]).toBe('sk-test-123');
    expect(getUserStoredLlmApiKey()).toBe('sk-test-123');
  });

  it('clears user key', () => {
    setUserLlmApiKey('a');
    setUserLlmApiKey(null);
    expect(store[LLM_API_KEY_STORAGE_KEY]).toBeUndefined();
    expect(getUserStoredLlmApiKey()).toBeUndefined();
  });

  it('trims whitespace', () => {
    setUserLlmApiKey('  abc  ');
    expect(getUserStoredLlmApiKey()).toBe('abc');
  });
});
