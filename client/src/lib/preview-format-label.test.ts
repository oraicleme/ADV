/**
 * STORY-132 T4: Format label under preview must be a discrete UI caption (no black background).
 */
import { describe, it, expect } from 'vitest';
import { PREVIEW_FORMAT_LABEL_CLASS } from './preview-format-label';

describe('PREVIEW_FORMAT_LABEL_CLASS (STORY-132 T4)', () => {
  it('does not use black background (format label is discrete UI, not part of ad)', () => {
    expect(PREVIEW_FORMAT_LABEL_CLASS).not.toMatch(/bg-black/);
  });

  it('uses muted text color for discrete caption', () => {
    expect(PREVIEW_FORMAT_LABEL_CLASS).toMatch(/text-gray/);
  });
});
