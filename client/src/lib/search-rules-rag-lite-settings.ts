/**
 * STORY-201: Opt-in client-side “RAG-lite” rule retrieval (lexical similarity vs exact queryPattern).
 */

export const SEARCH_RULES_RAG_LITE_STORAGE_KEY = 'oraicle-search-rules-rag-lite-v1';

/** Dispatched when the flag changes so search UIs can re-filter. */
export const SEARCH_RULES_RAG_LITE_CHANGED_EVENT = 'oraicle-search-rules-rag-lite-changed';

export function readSearchRulesRagLiteEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SEARCH_RULES_RAG_LITE_STORAGE_KEY) === '1';
}

export function writeSearchRulesRagLiteEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(SEARCH_RULES_RAG_LITE_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(SEARCH_RULES_RAG_LITE_STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SEARCH_RULES_RAG_LITE_CHANGED_EVENT));
    }
  } catch {
    /* quota */
  }
}
