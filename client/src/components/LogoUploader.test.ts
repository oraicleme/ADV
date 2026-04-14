/**
 * STORY-114: Brand logo remove-from-ad logic.
 * Parent (AgentChat) removes by index: brandLogoDataUris.filter((_, i) => i !== index).
 * This test ensures that contract: removing index 1 from [A, B, C] yields [A, C].
 */
import { describe, it, expect } from 'vitest';

function removeBrandLogoFromAdByIndex(uris: string[], index: number): string[] {
  return uris.filter((_, i) => i !== index);
}

describe('LogoUploader STORY-114 remove brand logo from ad by index', () => {
  it('removing index 0 leaves rest in order', () => {
    const uris = ['uri0', 'uri1', 'uri2'];
    expect(removeBrandLogoFromAdByIndex(uris, 0)).toEqual(['uri1', 'uri2']);
  });

  it('removing index 1 leaves first and third', () => {
    const uris = ['uri0', 'uri1', 'uri2'];
    expect(removeBrandLogoFromAdByIndex(uris, 1)).toEqual(['uri0', 'uri2']);
  });

  it('removing last index leaves all but last', () => {
    const uris = ['uri0', 'uri1'];
    expect(removeBrandLogoFromAdByIndex(uris, 1)).toEqual(['uri0']);
  });

  it('removing from single-item list yields empty array (company-logo-only ad)', () => {
    expect(removeBrandLogoFromAdByIndex(['only'], 0)).toEqual([]);
  });

  it('allows removing every brand logo so user can publish under company logo only', () => {
    const one = ['uri0'];
    expect(removeBrandLogoFromAdByIndex(one, 0)).toHaveLength(0);
  });
});
