/**
 * STORY-167: Proactive suggestion Phase B — dedup + cooldown helpers.
 * Used by AgentChat only; keeps copy/paste thresholds in one place.
 */

/** Max stored dismissal keys (rolling). */
export const PROACTIVE_SUGGESTION_RECENT_DISMISSALS_MAX = 12;

/** After canvas edits, wait longer before the next suggestion API call (ms). */
export const PROACTIVE_SUGGESTION_MIN_INTERVAL_DURING_ACTIVITY_MS = 15_000;

/** When canvas has been idle, allow suggestions at least this often (ms). */
export const PROACTIVE_SUGGESTION_MIN_INTERVAL_IDLE_MS = 5000;

/** "Recently edited" window: within this many ms of last edit, use activity interval + longer debounce. */
export const PROACTIVE_SUGGESTION_RECENT_ACTIVITY_WINDOW_MS = 10_000;

/** Debounce before calling the suggestion API when canvas is idle (ms). */
export const PROACTIVE_SUGGESTION_DEBOUNCE_IDLE_MS = 2000;

/** Debounce when the canvas was recently edited — fewer surprise pings while adjusting (ms). */
export const PROACTIVE_SUGGESTION_DEBOUNCE_ACTIVE_MS = 4500;

/**
 * Stable key for comparing suggestion copy (locale-insensitive, punctuation-insensitive).
 */
export function proactiveSuggestionDedupKey(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

/**
 * Push a key to the front of the list, dedupe, cap length.
 */
export function rememberDismissedSuggestionKey(
  previous: readonly string[],
  newKey: string,
  max = PROACTIVE_SUGGESTION_RECENT_DISMISSALS_MAX,
): string[] {
  if (!newKey) return [...previous];
  const next = [newKey, ...previous.filter((k) => k !== newKey)];
  return next.slice(0, max);
}

export function shouldSkipProactiveSuggestionForRecentDismissals(
  message: string,
  recentDismissedKeys: readonly string[],
): boolean {
  const k = proactiveSuggestionDedupKey(message);
  if (!k) return false;
  return recentDismissedKeys.includes(k);
}

/**
 * STORY-169: Non-reversible fingerprint for analytics — no raw copy in logs.
 * 8 hex chars from djb2 over the same normalized key as dedup.
 */
export function hashProactiveSuggestionTipForAnalytics(message: string): string {
  const k = proactiveSuggestionDedupKey(message);
  let h = 5381;
  for (let i = 0; i < k.length; i++) {
    h = (h * 33) ^ k.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
