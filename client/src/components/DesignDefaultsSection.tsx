/**
 * STORY-176: Workspace Settings → Design defaults — format, layout, palette, font.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORMAT_PRESETS } from '@/lib/ad-constants';
import {
  DESIGN_DEFAULTS_CHANGED_EVENT,
  readDesignDefaultsSnapshot,
  requestApplyDesignDefaultsToCanvas,
  resetDesignDefaultsToFactory,
  writeDesignDefaults,
  type DesignDefaultsSnapshot,
} from '@/lib/design-defaults-storage';
import type { LayoutId } from '@/lib/ad-layouts/types';
import { Palette } from 'lucide-react';

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function safeColorForPicker(hex: string): string {
  return HEX6.test(hex.trim()) ? hex.trim() : '#888888';
}

const LAYOUT_OPTIONS: Array<{ value: LayoutId; label: string }> = [
  { value: 'multi-grid', label: 'Multi grid' },
  { value: 'single-hero', label: 'Single hero' },
  { value: 'category-group', label: 'Category group' },
  { value: 'sale-discount', label: 'Sale / discount' },
];

export default function DesignDefaultsSection() {
  const [draft, setDraft] = useState<DesignDefaultsSnapshot>(() => readDesignDefaultsSnapshot());
  const [baseline, setBaseline] = useState<DesignDefaultsSnapshot>(() => readDesignDefaultsSnapshot());

  const sync = useCallback(() => {
    const s = readDesignDefaultsSnapshot();
    setDraft(s);
    setBaseline(s);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(DESIGN_DEFAULTS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(DESIGN_DEFAULTS_CHANGED_EVENT, sync);
  }, [sync]);

  const dirty =
    draft.formatId !== baseline.formatId ||
    draft.layoutId !== baseline.layoutId ||
    draft.backgroundColor !== baseline.backgroundColor ||
    draft.accentColor !== baseline.accentColor ||
    draft.fontFamily !== baseline.fontFamily;

  const save = () => {
    writeDesignDefaults(draft);
    sync();
  };

  const reset = () => {
    resetDesignDefaultsToFactory();
    sync();
  };

  const setField = <K extends keyof DesignDefaultsSnapshot>(key: K, value: DesignDefaultsSnapshot[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <div className="space-y-3 pt-2" data-testid="design-defaults-section">
      <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/20 px-2.5 py-2">
        <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/90" aria-hidden />
        <p className="text-[11px] leading-snug text-muted-foreground">
          Used when you open this workspace and when you click Apply below. The canvas still controls this ad — this
          is only defaults.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="design-default-format" className="text-[11px]">
          Default format
        </Label>
        <select
          id="design-default-format"
          value={draft.formatId}
          onChange={(e) => setField('formatId', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-[11px] shadow-xs"
          data-testid="design-default-format"
        >
          {FORMAT_PRESETS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.icon ? `${f.icon} ` : ''}
              {f.label} ({f.width}×{f.height})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="design-default-layout" className="text-[11px]">
          Default layout
        </Label>
        <select
          id="design-default-layout"
          value={draft.layoutId}
          onChange={(e) => setField('layoutId', e.target.value as LayoutId)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-[11px] shadow-xs"
          data-testid="design-default-layout"
        >
          {LAYOUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="design-default-bg" className="text-[11px]">
            Background
          </Label>
          <div className="flex gap-1">
            <Input
              id="design-default-bg"
              type="color"
              value={safeColorForPicker(draft.backgroundColor)}
              onChange={(e) => setField('backgroundColor', e.target.value)}
              className="h-9 w-12 cursor-pointer p-1"
              data-testid="design-default-bg"
            />
            <Input
              type="text"
              value={draft.backgroundColor}
              onChange={(e) => setField('backgroundColor', e.target.value)}
              className="h-9 flex-1 font-mono text-[11px]"
              spellCheck={false}
              aria-label="Background color hex"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="design-default-accent" className="text-[11px]">
            Accent
          </Label>
          <div className="flex gap-1">
            <Input
              id="design-default-accent"
              type="color"
              value={safeColorForPicker(draft.accentColor)}
              onChange={(e) => setField('accentColor', e.target.value)}
              className="h-9 w-12 cursor-pointer p-1"
              data-testid="design-default-accent"
            />
            <Input
              type="text"
              value={draft.accentColor}
              onChange={(e) => setField('accentColor', e.target.value)}
              className="h-9 flex-1 font-mono text-[11px]"
              spellCheck={false}
              aria-label="Accent color hex"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="design-default-font" className="text-[11px]">
          Font stack (CSS)
        </Label>
        <Input
          id="design-default-font"
          value={draft.fontFamily}
          onChange={(e) => setField('fontFamily', e.target.value)}
          className="h-9 font-mono text-[11px]"
          data-testid="design-default-font"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="h-8 text-xs" disabled={!dirty} onClick={save} data-testid="design-default-save">
          Save defaults
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={reset} data-testid="design-default-reset">
          Reset to factory
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          onClick={() => requestApplyDesignDefaultsToCanvas()}
          data-testid="design-default-apply-canvas"
        >
          Apply to current ad
        </Button>
      </div>
    </div>
  );
}
