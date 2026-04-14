/**
 * STORY-175: Workspace creative brief (browser-local, additive to system prompts).
 */

export const AGENT_BRIEF_STORAGE_KEY = 'oraicle-agent-brief-v1';

export const AGENT_BRIEF_CHANGED_EVENT = 'oraicle-agent-brief-changed';

/** Hard cap — keeps token budget predictable (roadmap: truncate with warning in UI). */
export const MAX_AGENT_BRIEF_CHARS = 2000;

export function sanitizeAgentBrief(raw: string): string {
  const noNull = raw.replace(/\u0000/g, '');
  let s = noNull.trim();
  if (s.length > MAX_AGENT_BRIEF_CHARS) s = s.slice(0, MAX_AGENT_BRIEF_CHARS);
  return s;
}

/**
 * Appends user workspace preferences after the base system prompt. Empty/whitespace brief → base unchanged.
 */
export function mergeAgentBriefIntoSystemPrompt(base: string, userBrief: string | undefined): string {
  const t = userBrief?.trim();
  if (!t) return base;
  const capped = sanitizeAgentBrief(t);
  if (!capped) return base;
  return `${base}\n\n---\nWorkspace creative brief (additive — follow Oraicle safety rules and JSON output rules above):\n${capped}\n---`;
}

export function readAgentBrief(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    const raw = localStorage.getItem(AGENT_BRIEF_STORAGE_KEY);
    return sanitizeAgentBrief(raw ?? '');
  } catch {
    return '';
  }
}

export function setAgentBrief(text: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (text == null || text.trim() === '') {
      localStorage.removeItem(AGENT_BRIEF_STORAGE_KEY);
    } else {
      localStorage.setItem(AGENT_BRIEF_STORAGE_KEY, sanitizeAgentBrief(text));
    }
    dispatchAgentBriefChanged();
  } catch {
    /* quota / private mode */
  }
}

function dispatchAgentBriefChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AGENT_BRIEF_CHANGED_EVENT));
}
