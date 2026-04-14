/**
 * STORY-176: Workspace design defaults (format, layout, style) — browser-local.
 */

import { DEFAULT_STYLE, FORMAT_PRESETS } from './ad-constants';
import type { FormatPreset, LayoutId, StyleOptions } from './ad-layouts/types';

export const DESIGN_DEFAULTS_STORAGE_KEY = 'oraicle-design-defaults-v1';

export const DESIGN_DEFAULTS_CHANGED_EVENT = 'oraicle-design-defaults-changed';

/** User clicks "Apply to current ad" in Settings — AgentChat applies resolved defaults. */
export const APPLY_DESIGN_DEFAULTS_TO_CANVAS_EVENT = 'oraicle-apply-design-defaults-to-canvas';

const LAYOUT_IDS: LayoutId[] = ['single-hero', 'multi-grid', 'category-group', 'sale-discount'];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const MAX_FONT_LEN = 400;

export type DesignDefaultsSnapshot = {
  formatId: string;
  layoutId: LayoutId;
  backgroundColor: string;
  accentColor: string;
  fontFamily: string;
};

function isLayoutId(s: string): s is LayoutId {
  return (LAYOUT_IDS as string[]).includes(s);
}

function normalizeHex(raw: string, fallback: string): string {
  const t = raw?.trim() ?? '';
  return HEX_RE.test(t) ? t : fallback;
}

function truncateFont(s: string): string {
  if (s.length <= MAX_FONT_LEN) return s;
  return s.slice(0, MAX_FONT_LEN);
}

function defaultSnapshot(): DesignDefaultsSnapshot {
  const f = FORMAT_PRESETS[0]!;
  return {
    formatId: f.id,
    layoutId: 'multi-grid',
    backgroundColor: DEFAULT_STYLE.backgroundColor,
    accentColor: DEFAULT_STYLE.accentColor,
    fontFamily: DEFAULT_STYLE.fontFamily,
  };
}

function normalizeSnapshot(raw: unknown): DesignDefaultsSnapshot {
  const d = defaultSnapshot();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;

  const formatId =
    typeof o.formatId === 'string' && FORMAT_PRESETS.some((f) => f.id === o.formatId)
      ? o.formatId
      : d.formatId;

  const layoutId =
    typeof o.layoutId === 'string' && isLayoutId(o.layoutId) ? o.layoutId : d.layoutId;

  const backgroundColor = normalizeHex(
    typeof o.backgroundColor === 'string' ? o.backgroundColor : '',
    d.backgroundColor,
  );
  const accentColor = normalizeHex(
    typeof o.accentColor === 'string' ? o.accentColor : '',
    d.accentColor,
  );

  const fontRaw = typeof o.fontFamily === 'string' ? o.fontFamily : d.fontFamily;
  const fontFamily = truncateFont(fontRaw.trim()) || d.fontFamily;

  return { formatId, layoutId, backgroundColor, accentColor, fontFamily };
}

export function readDesignDefaultsSnapshot(): DesignDefaultsSnapshot {
  if (typeof localStorage === 'undefined') return defaultSnapshot();
  try {
    const raw = localStorage.getItem(DESIGN_DEFAULTS_STORAGE_KEY);
    if (!raw?.trim()) return defaultSnapshot();
    return normalizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return defaultSnapshot();
  }
}

/**
 * Resolved objects for React state — always valid; falls back to FORMAT_PRESETS[0] and DEFAULT_STYLE fields.
 */
export function resolveWorkspaceDesignDefaults(): {
  format: FormatPreset;
  layout: LayoutId;
  style: StyleOptions;
} {
  const s = readDesignDefaultsSnapshot();
  const format = FORMAT_PRESETS.find((f) => f.id === s.formatId) ?? FORMAT_PRESETS[0]!;
  return {
    format,
    layout: s.layoutId,
    style: {
      backgroundColor: s.backgroundColor,
      accentColor: s.accentColor,
      fontFamily: s.fontFamily,
    },
  };
}

export function writeDesignDefaults(partial: Partial<DesignDefaultsSnapshot>): void {
  if (typeof localStorage === 'undefined') return;
  const cur = readDesignDefaultsSnapshot();
  const next = normalizeSnapshot({ ...cur, ...partial });
  try {
    localStorage.setItem(DESIGN_DEFAULTS_STORAGE_KEY, JSON.stringify(next));
    dispatchDesignDefaultsChanged();
  } catch {
    /* quota */
  }
}

export function resetDesignDefaultsToFactory(): void {
  writeDesignDefaults(defaultSnapshot());
}

function dispatchDesignDefaultsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DESIGN_DEFAULTS_CHANGED_EVENT));
}

export function requestApplyDesignDefaultsToCanvas(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APPLY_DESIGN_DEFAULTS_TO_CANVAS_EVENT));
}
