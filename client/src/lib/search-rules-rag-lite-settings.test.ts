import { describe, expect, it, beforeEach } from 'vitest';
import {
  readSearchRulesRagLiteEnabled,
  writeSearchRulesRagLiteEnabled,
  SEARCH_RULES_RAG_LITE_STORAGE_KEY,
} from './search-rules-rag-lite-settings';

describe('search-rules-rag-lite-settings', () => {
  beforeEach(() => {
    localStorage.removeItem(SEARCH_RULES_RAG_LITE_STORAGE_KEY);
  });

  it('defaults to false', () => {
    expect(readSearchRulesRagLiteEnabled()).toBe(false);
  });

  it('round-trips enabled flag', () => {
    writeSearchRulesRagLiteEnabled(true);
    expect(readSearchRulesRagLiteEnabled()).toBe(true);
    writeSearchRulesRagLiteEnabled(false);
    expect(readSearchRulesRagLiteEnabled()).toBe(false);
  });
});
