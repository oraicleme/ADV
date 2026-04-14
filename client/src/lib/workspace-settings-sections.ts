/**
 * STORY-171: Workspace Settings accordion section ids (no JSX — safe for tests / imports).
 */

export const WORKSPACE_SETTINGS_SECTION_IDS = [
  'connections',
  /** STORY-183: io.net model picker (after Connections — needs API key) */
  'models',
  'import',
  'search',
  'agent',
  'design',
  /** STORY-183: read-only merged prompts for power users */
  'prompts',
] as const;

export type WorkspaceSettingsSectionId = (typeof WORKSPACE_SETTINGS_SECTION_IDS)[number];

export function isWorkspaceSettingsSectionId(
  v: string,
): v is WorkspaceSettingsSectionId {
  return (WORKSPACE_SETTINGS_SECTION_IDS as readonly string[]).includes(v);
}
