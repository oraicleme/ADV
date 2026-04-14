import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSuggestedExcludeRuleDraft,
  collectResolvedIndicesFromCatalogActions,
  hashSearchFeedbackFingerprint,
  hashSearchFeedbackQuery,
  logSearchFeedbackExplicit,
  logSearchFeedbackImplicitDeselect,
} from './search-feedback';
import { clearSessionLogs, getSessionLogs } from './retail-promo-log';
import type { AgentAction } from './agent-actions';

describe('search-feedback', () => {
  beforeEach(() => {
    clearSessionLogs();
  });

  it('hashSearchFeedbackFingerprint is stable for equivalent strings', () => {
    expect(hashSearchFeedbackFingerprint('  Hello  ')).toBe(hashSearchFeedbackFingerprint('hello'));
  });

  it('hashSearchFeedbackQuery normalizes before hash', () => {
    const a = hashSearchFeedbackQuery('  USB  punjač  ');
    const b = hashSearchFeedbackQuery('usb punjač');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('collectResolvedIndicesFromCatalogActions merges indices', () => {
    const actions: AgentAction[] = [
      { type: 'catalog_filter', payload: { resolvedIndices: [1, 2] } },
      { type: 'layout_change', payload: {} },
      { type: 'catalog_filter', payload: { resolvedIndices: [2, 3] } },
    ];
    const s = collectResolvedIndicesFromCatalogActions(actions);
    expect(s).not.toBeNull();
    expect([...(s as Set<number>)].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('collectResolvedIndicesFromCatalogActions returns null when empty', () => {
    expect(collectResolvedIndicesFromCatalogActions([])).toBeNull();
    expect(
      collectResolvedIndicesFromCatalogActions([{ type: 'catalog_filter', payload: {} }]),
    ).toBeNull();
  });

  it('buildSuggestedExcludeRuleDraft returns STORY-196 shape', () => {
    const d = buildSuggestedExcludeRuleDraft('  Futrola  Samsung ', { code: 'ML-1', name: 'X' });
    expect(d).toEqual({
      queryPattern: 'futrola samsung',
      productKey: 'ML-1',
      action: 'exclude',
    });
  });

  it('buildSuggestedExcludeRuleDraft falls back to name when no code', () => {
    const d = buildSuggestedExcludeRuleDraft('a', { name: '  Product  ' });
    expect(d?.productKey).toBe('Product');
  });

  it('logSearchFeedbackImplicitDeselect writes session log with hashes only', () => {
    logSearchFeedbackImplicitDeselect({
      queryRaw: 'test query',
      product: { code: 'SKU-9' },
    });
    const entries = getSessionLogs().filter((e) => e.type === 'search_feedback_implicit');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.payload?.queryHash).toBeTruthy();
    expect(entries[0]!.payload?.productKeyHash).toBeTruthy();
    expect(entries[0]!.payload?.source).toBe('deselect_after_agent');
    expect(JSON.stringify(entries[0])).not.toContain('test query');
    expect(JSON.stringify(entries[0])).not.toContain('SKU-9');
  });

  it('logSearchFeedbackExplicit includes relevant flag', () => {
    logSearchFeedbackExplicit({
      queryRaw: 'q',
      product: { name: 'N' },
      relevant: false,
    });
    const e = getSessionLogs().find((x) => x.type === 'search_feedback_explicit');
    expect(e?.payload?.relevant).toBe(false);
  });
});
