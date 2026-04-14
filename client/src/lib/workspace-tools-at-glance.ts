/**
 * STORY-186: Read-only strings for Chat → Workspace tools “at a glance” strip.
 * Layout labels mirror DesignDefaultsSection LAYOUT_OPTIONS — keep in sync on layout changes.
 */

import type { LayoutId } from '@/lib/ad-layouts/types';
import { FORMAT_PRESETS } from '@/lib/ad-constants';
import type { DesignDefaultsSnapshot } from '@/lib/design-defaults-storage';

const LAYOUT_LABEL: Record<LayoutId, string> = {
  'multi-grid': 'Multi grid',
  'single-hero': 'Single hero',
  'category-group': 'Category group',
  'sale-discount': 'Sale / discount',
};

/**
 * One line for design defaults: e.g. "Instagram Post · Multi grid".
 */
export function designDefaultsSummaryLine(s: DesignDefaultsSnapshot): string {
  const formatLabel = FORMAT_PRESETS.find((f) => f.id === s.formatId)?.label ?? s.formatId;
  const layoutLabel = LAYOUT_LABEL[s.layoutId] ?? s.layoutId;
  return `${formatLabel} · ${layoutLabel}`;
}
