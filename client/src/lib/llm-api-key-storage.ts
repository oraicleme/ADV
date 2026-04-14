/**
 * STORY-172: BYOK — user LLM API key in localStorage, with env fallback.
 * Keys are sensitive; never log. localStorage is visible to same-origin JS (XSS risk) — UI warns users.
 */

export const LLM_API_KEY_STORAGE_KEY = 'oraicle-retail-promo-ionet-api-key-v1';

/** Dispatched on same tab after save/clear so AgentChat can re-check key. */
export const LLM_API_KEY_CHANGED_EVENT = 'oraicle-llm-api-key-changed';

function readEnvKeys(): string | undefined {
  const a = import.meta.env.VITE_IONET_API_KEY;
  const b = import.meta.env.PUBLIC_IONET_API_KEY;
  const c = import.meta.env.IO_NET_API_TOKEN;
  const d = import.meta.env.IONET_API_KEY;
  for (const v of [a, b, c, d]) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Env-based key only (for status UI + fallback). */
export function getEnvLlmApiKey(): string | undefined {
  return readEnvKeys();
}

/** User-saved key from localStorage (no env merge). */
export function getUserStoredLlmApiKey(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const v = localStorage.getItem(LLM_API_KEY_STORAGE_KEY);
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** User key wins over environment (BYOK). */
export function getResolvedLlmApiKey(): string | undefined {
  const user = getUserStoredLlmApiKey();
  if (user) return user;
  return getEnvLlmApiKey();
}

export function setUserLlmApiKey(key: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (key == null || key.trim() === '') {
      localStorage.removeItem(LLM_API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(LLM_API_KEY_STORAGE_KEY, key.trim());
    }
    dispatchLlmApiKeyChanged();
  } catch {
    /* quota / private mode */
  }
}

function dispatchLlmApiKeyChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LLM_API_KEY_CHANGED_EVENT));
}
