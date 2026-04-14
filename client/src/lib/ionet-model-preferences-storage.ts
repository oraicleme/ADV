/**
 * STORY-183: Persist user-selected io.net chat model pair (Custom mode) in the browser.
 */

import { CHAT_MODEL_PAIR_BY_MODE } from './agent-chat-engine';
import type { ChatModelMode } from './agent-chat-engine';

const CHAT_MODEL_MODE_KEY = 'oraicle-chat-model-mode-v1';

export const IONET_MODEL_PREFS_STORAGE_KEY = 'oraicle-ionet-chat-model-prefs-v1';

export const IONET_MODEL_PREFS_CHANGED_EVENT = 'oraicle-ionet-model-prefs-changed';

export type IonetChatModelPrefs = {
  customPrimary: string;
  customFallback: string;
};

const DEFAULT_CUSTOM: IonetChatModelPrefs = {
  customPrimary: CHAT_MODEL_PAIR_BY_MODE.smart.primary,
  customFallback: CHAT_MODEL_PAIR_BY_MODE.smart.fallback,
};

function normalizePrefs(raw: unknown): IonetChatModelPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CUSTOM };
  const o = raw as Record<string, unknown>;
  const primary = typeof o.customPrimary === 'string' ? o.customPrimary.trim() : '';
  const fallback = typeof o.customFallback === 'string' ? o.customFallback.trim() : '';
  return {
    customPrimary: primary || DEFAULT_CUSTOM.customPrimary,
    customFallback: fallback || DEFAULT_CUSTOM.customFallback,
  };
}

export function readIonetChatModelPrefs(): IonetChatModelPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CUSTOM };
  try {
    const raw = localStorage.getItem(IONET_MODEL_PREFS_STORAGE_KEY);
    if (!raw?.trim()) return { ...DEFAULT_CUSTOM };
    return normalizePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_CUSTOM };
  }
}

export function writeIonetChatModelPrefs(partial: Partial<IonetChatModelPrefs>): void {
  if (typeof localStorage === 'undefined') return;
  const cur = readIonetChatModelPrefs();
  const next: IonetChatModelPrefs = {
    customPrimary: partial.customPrimary?.trim() || cur.customPrimary,
    customFallback: partial.customFallback?.trim() || cur.customFallback,
  };
  try {
    localStorage.setItem(IONET_MODEL_PREFS_STORAGE_KEY, JSON.stringify(next));
    dispatchPrefsChanged();
  } catch {
    /* quota */
  }
}

export function resetIonetChatModelPrefsToDefaults(): void {
  writeIonetChatModelPrefs({ ...DEFAULT_CUSTOM });
}

function dispatchPrefsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(IONET_MODEL_PREFS_CHANGED_EVENT));
}

/** Resolve primary/fallback model ids for the given mode. */
export function resolveModelPairForMode(mode: ChatModelMode): { primary: string; fallback: string } {
  if (mode === 'custom') {
    const p = readIonetChatModelPrefs();
    return { primary: p.customPrimary, fallback: p.customFallback };
  }
  return CHAT_MODEL_PAIR_BY_MODE[mode];
}

export function readChatModelMode(): ChatModelMode {
  if (typeof localStorage === 'undefined') return 'smart';
  try {
    const v = localStorage.getItem(CHAT_MODEL_MODE_KEY);
    if (v === 'fast' || v === 'smart' || v === 'custom') return v;
  } catch {
    /* ignore */
  }
  return 'smart';
}

export function writeChatModelMode(mode: ChatModelMode): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CHAT_MODEL_MODE_KEY, mode);
    dispatchPrefsChanged();
  } catch {
    /* ignore */
  }
}
