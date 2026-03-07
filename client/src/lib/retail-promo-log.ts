/**
 * Event logging for Retail Promo Designer (/agents/retail-promo).
 * No PII: only event types, counts, and sanitized error messages.
 */

const PREFIX = '[RetailPromo]';

export type RetailPromoEventType =
  | 'page_load'
  | 'file_upload_start'
  | 'file_upload_success'
  | 'file_upload_failure'
  | 'paste_products'
  | 'product_list_change'
  | 'image_upload'
  | 'mobileland_fetch'
  | 'web_search_toggle'
  | 'generate_start'
  | 'generate_success'
  | 'generate_failure'
  | 'creative_saved'
  | 'creative_loaded'
  | 'ai_chat_message'
  | 'retail_promo_error';

export interface RetailPromoEventPayload {
  productCount?: number;
  resolvedCount?: number;
  reason?: string;
  message?: string;
  enabled?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface LogEntry {
  type: RetailPromoEventType;
  timestamp: string;
  payload?: RetailPromoEventPayload;
}

const sessionLog: LogEntry[] = [];
const maxSessionEntries = 500;

function safeString(value: unknown): string {
  if (value == null) return 'unknown';
  if (typeof value === 'string') return value.slice(0, 500);
  if (value instanceof Error) return value.message?.slice(0, 500) ?? 'Error';
  try {
    return String(value).slice(0, 500);
  } catch {
    return 'unknown';
  }
}

/**
 * Log a Retail Promo event. Safe to call from any context; does not throw.
 * In test env or when console is unavailable, may no-op or use predictable output.
 */
export function logRetailPromoEvent(
  type: RetailPromoEventType,
  payload?: RetailPromoEventPayload
): void {
  const entry: LogEntry = {
    type,
    timestamp: new Date().toISOString(),
    ...(payload && Object.keys(payload).length > 0 ? { payload } : {}),
  };

  sessionLog.push(entry);
  if (sessionLog.length > maxSessionEntries) sessionLog.shift();

  const hasConsole =
    typeof console !== 'undefined' && typeof console.log === 'function';
  if (!hasConsole) return;

  const out = `${PREFIX} ${entry.timestamp} ${type}${
    entry.payload ? ` ${JSON.stringify(entry.payload)}` : ''
  }`;
  console.log(out);
}

/**
 * Log an unhandled error with consistent event type. Sanitizes message/stack.
 */
export function logRetailPromoError(error: unknown): void {
  const message = error instanceof Error ? error.message : safeString(error);
  const payload: RetailPromoEventPayload = { message };
  if (error instanceof Error && error.stack) {
    payload.reason = error.stack.slice(0, 300);
  }
  logRetailPromoEvent('retail_promo_error', payload);
}

/**
 * Get session log entries (for dev copy/download). Does not clear the buffer.
 */
export function getSessionLogs(): LogEntry[] {
  return [...sessionLog];
}

/**
 * Clear session log buffer. For testing only; not for production use.
 */
export function clearSessionLogs(): void {
  sessionLog.length = 0;
}

/**
 * Copy session logs to clipboard as JSON lines. Dev-only; no-op if clipboard unavailable.
 */
export function copySessionLogsToClipboard(): boolean {
  if (typeof navigator?.clipboard?.writeText !== 'function') return false;
  const lines = sessionLog.map((e) => JSON.stringify(e));
  navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  return true;
}

/**
 * Trigger download of session logs as a .jsonl file. Dev-only.
 */
export function downloadSessionLogs(): void {
  const lines = sessionLog.map((e) => JSON.stringify(e));
  const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `retail-promo-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
}
