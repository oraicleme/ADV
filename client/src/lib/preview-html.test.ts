/**
 * STORY-128: Preview follows canvas — tests for getPreviewHtmlToShow.
 * T1: multi-page → preview = htmlPerPage[currentPageIndex]
 * T2: single-page (htmlPerPage undefined) → preview = livePreviewHtml
 */

import { describe, it, expect } from 'vitest';
import { getPreviewHtmlToShow } from './preview-html';

describe('getPreviewHtmlToShow', () => {
  const livePreviewHtml = '<div>live</div>';
  const htmlPage0 = '<div>page0</div>';
  const htmlPage1 = '<div>page1</div>';

  it('T1: when htmlPerPage has 2 elements, currentPageIndex 0 returns htmlPerPage[0]', () => {
    const htmlPerPage = [htmlPage0, htmlPage1];
    expect(getPreviewHtmlToShow(null, livePreviewHtml, htmlPerPage, 0)).toBe(htmlPage0);
  });

  it('T1: when htmlPerPage has 2 elements, currentPageIndex 1 returns htmlPerPage[1]', () => {
    const htmlPerPage = [htmlPage0, htmlPage1];
    expect(getPreviewHtmlToShow(null, livePreviewHtml, htmlPerPage, 1)).toBe(htmlPage1);
  });

  it('T2: when htmlPerPage is undefined, returns livePreviewHtml', () => {
    expect(getPreviewHtmlToShow(null, livePreviewHtml, undefined, 0)).toBe(livePreviewHtml);
  });

  it('when htmlPerPage has 1 element (single-page), returns livePreviewHtml (no multi-page)', () => {
    expect(getPreviewHtmlToShow(null, livePreviewHtml, ['only'], 0)).toBe(livePreviewHtml);
  });

  it('when generatedHtml is set, it overrides (multi-page)', () => {
    const generated = '<div>generated</div>';
    expect(getPreviewHtmlToShow(generated, livePreviewHtml, [htmlPage0, htmlPage1], 1)).toBe(generated);
  });

  it('when generatedHtml is set, it overrides (single-page)', () => {
    const generated = '<div>generated</div>';
    expect(getPreviewHtmlToShow(generated, livePreviewHtml, undefined, 0)).toBe(generated);
  });

  it('when multi-page and currentPageIndex out of range, falls back to livePreviewHtml', () => {
    const htmlPerPage = [htmlPage0, htmlPage1];
    expect(getPreviewHtmlToShow(null, livePreviewHtml, htmlPerPage, 5)).toBe(livePreviewHtml);
  });
});
