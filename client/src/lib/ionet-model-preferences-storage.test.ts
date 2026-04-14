import { describe, it, expect, beforeEach } from 'vitest';
import {
  IONET_MODEL_PREFS_STORAGE_KEY,
  readIonetChatModelPrefs,
  writeIonetChatModelPrefs,
  resolveModelPairForMode,
  readChatModelMode,
  writeChatModelMode,
} from './ionet-model-preferences-storage';
import { CHAT_MODEL_PAIR_BY_MODE } from './agent-chat-engine';

describe('ionet-model-preferences-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults custom pair to Smart preset', () => {
    const p = readIonetChatModelPrefs();
    expect(p.customPrimary).toBe(CHAT_MODEL_PAIR_BY_MODE.smart.primary);
    expect(p.customFallback).toBe(CHAT_MODEL_PAIR_BY_MODE.smart.fallback);
  });

  it('persists custom primary/fallback', () => {
    writeIonetChatModelPrefs({
      customPrimary: 'org/test-primary',
      customFallback: 'org/test-fallback',
    });
    expect(readIonetChatModelPrefs()).toEqual({
      customPrimary: 'org/test-primary',
      customFallback: 'org/test-fallback',
    });
    const raw = localStorage.getItem(IONET_MODEL_PREFS_STORAGE_KEY);
    expect(raw).toBeTruthy();
  });

  it('resolveModelPairForMode returns stored pair for custom', () => {
    writeIonetChatModelPrefs({
      customPrimary: 'a',
      customFallback: 'b',
    });
    expect(resolveModelPairForMode('custom')).toEqual({ primary: 'a', fallback: 'b' });
  });

  it('resolveModelPairForMode returns presets for fast/smart', () => {
    expect(resolveModelPairForMode('fast')).toEqual(CHAT_MODEL_PAIR_BY_MODE.fast);
    expect(resolveModelPairForMode('smart')).toEqual(CHAT_MODEL_PAIR_BY_MODE.smart);
  });

  it('read/write chat model mode', () => {
    expect(readChatModelMode()).toBe('smart');
    writeChatModelMode('fast');
    expect(readChatModelMode()).toBe('fast');
    writeChatModelMode('custom');
    expect(readChatModelMode()).toBe('custom');
  });
});
