import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_SETTINGS_SECTION_IDS,
  isWorkspaceSettingsSectionId,
} from './workspace-settings-sections';

describe('workspace-settings-sections', () => {
  it('defines section ids including models and prompts (STORY-183)', () => {
    expect(WORKSPACE_SETTINGS_SECTION_IDS).toHaveLength(7);
    expect(WORKSPACE_SETTINGS_SECTION_IDS).toContain('models');
    expect(WORKSPACE_SETTINGS_SECTION_IDS).toContain('prompts');
  });

  it('isWorkspaceSettingsSectionId guards unknown strings', () => {
    expect(isWorkspaceSettingsSectionId('search')).toBe(true);
    expect(isWorkspaceSettingsSectionId('nope')).toBe(false);
  });
});
