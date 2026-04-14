import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logRetailPromoEvent,
  logRetailPromoError,
  getSessionLogs,
  clearSessionLogs,
} from './retail-promo-log';

describe('retail-promo-log', () => {
  beforeEach(() => {
    clearSessionLogs();
  });

  it('does not throw when calling logRetailPromoEvent with event type only', () => {
    expect(() => logRetailPromoEvent('page_load')).not.toThrow();
  });

  it('accepts event type and optional payload', () => {
    expect(() =>
      logRetailPromoEvent('file_upload_success', { productCount: 5 })
    ).not.toThrow();
    const logs = getSessionLogs();
    const last = logs[logs.length - 1];
    expect(last.type).toBe('file_upload_success');
    expect(last.payload?.productCount).toBe(5);
    expect(last.timestamp).toBeDefined();
  });

  it('writes to session buffer so getSessionLogs returns entries', () => {
    const before = getSessionLogs().length;
    logRetailPromoEvent('paste_products', { productCount: 3 });
    const after = getSessionLogs().length;
    expect(after).toBe(before + 1);
    const last = getSessionLogs()[getSessionLogs().length - 1];
    expect(last.type).toBe('paste_products');
    expect(last.payload?.productCount).toBe(3);
  });

  it('logRetailPromoError does not throw and logs retail_promo_error', () => {
    expect(() => logRetailPromoError(new Error('test error'))).not.toThrow();
    const logs = getSessionLogs();
    const errEntry = logs.filter((e) => e.type === 'retail_promo_error').pop();
    expect(errEntry).toBeDefined();
    expect(errEntry?.payload?.message).toBe('test error');
  });

  it('sanitizes error in logRetailPromoError when not Error instance', () => {
    logRetailPromoError('string error');
    const logs = getSessionLogs();
    const errEntry = logs.filter((e) => e.type === 'retail_promo_error').pop();
    expect(errEntry?.payload?.message).toBeDefined();
  });

  it('does not throw when console is missing', () => {
    const orig = globalThis.console;
    // @ts-expect-error - removing console for test
    globalThis.console = undefined;
    expect(() => logRetailPromoEvent('generate_start')).not.toThrow();
    globalThis.console = orig;
  });

  it('logs STORY-169 suggestion funnel events with hashed tip key', () => {
    expect(() =>
      logRetailPromoEvent('suggestion_shown', { actionsCount: 2, tipKeyHash: 'a1b2c3d4' }),
    ).not.toThrow();
    expect(() => logRetailPromoEvent('proactive_suggestions_session_mute', { muted: true })).not.toThrow();
    const logs = getSessionLogs();
    expect(logs.some((e) => e.type === 'suggestion_shown' && e.payload?.tipKeyHash === 'a1b2c3d4')).toBe(true);
  });
});
