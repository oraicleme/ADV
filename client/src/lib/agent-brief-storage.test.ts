import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGENT_BRIEF_CHANGED_EVENT,
  AGENT_BRIEF_STORAGE_KEY,
  MAX_AGENT_BRIEF_CHARS,
  mergeAgentBriefIntoSystemPrompt,
  readAgentBrief,
  sanitizeAgentBrief,
  setAgentBrief,
} from './agent-brief-storage';

describe('agent-brief-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sanitizeAgentBrief strips null bytes and truncates', () => {
    expect(sanitizeAgentBrief('a\u0000b')).toBe('ab');
    const long = 'x'.repeat(MAX_AGENT_BRIEF_CHARS + 50);
    expect(sanitizeAgentBrief(long).length).toBe(MAX_AGENT_BRIEF_CHARS);
  });

  it('mergeAgentBriefIntoSystemPrompt leaves base unchanged when brief empty', () => {
    expect(mergeAgentBriefIntoSystemPrompt('BASE', undefined)).toBe('BASE');
    expect(mergeAgentBriefIntoSystemPrompt('BASE', '')).toBe('BASE');
    expect(mergeAgentBriefIntoSystemPrompt('BASE', '   ')).toBe('BASE');
  });

  it('mergeAgentBriefIntoSystemPrompt appends brief block', () => {
    const out = mergeAgentBriefIntoSystemPrompt('BASE', 'Prefer short Balkan headlines.');
    expect(out.startsWith('BASE\n\n---\nWorkspace creative brief')).toBe(true);
    expect(out).toContain('Prefer short Balkan headlines.');
    expect(out.endsWith('\n---')).toBe(true);
  });

  it('readAgentBrief returns empty when missing', () => {
    expect(readAgentBrief()).toBe('');
  });

  it('setAgentBrief persists and read round-trips', () => {
    setAgentBrief('  Tone: premium  ');
    expect(readAgentBrief()).toBe('Tone: premium');
    expect(localStorage.getItem(AGENT_BRIEF_STORAGE_KEY)).toBe('Tone: premium');
  });

  it('setAgentBrief(null) clears storage', () => {
    setAgentBrief('hello');
    setAgentBrief(null);
    expect(readAgentBrief()).toBe('');
    expect(localStorage.getItem(AGENT_BRIEF_STORAGE_KEY)).toBeNull();
  });

  it('dispatches AGENT_BRIEF_CHANGED_EVENT on set', () => {
    const spy = vi.fn();
    window.addEventListener(AGENT_BRIEF_CHANGED_EVENT, spy);
    setAgentBrief('x');
    expect(spy).toHaveBeenCalled();
    window.removeEventListener(AGENT_BRIEF_CHANGED_EVENT, spy);
  });
});
