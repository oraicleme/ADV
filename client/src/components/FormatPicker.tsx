import { useMemo, useState } from 'react';
import { Smartphone, Camera, Monitor, Puzzle } from 'lucide-react';
import type { FormatPreset } from '../lib/ad-layouts/types';

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  'viber-story': <Smartphone className="h-4 w-4 text-purple-500" />,
  'instagram-square': <Camera className="h-4 w-4 text-pink-500" />,
  'facebook-landscape': <Monitor className="h-4 w-4 text-blue-500" />,
  custom: <Puzzle className="h-4 w-4 text-gray-500" />,
};

interface FormatPickerProps {
  presets: FormatPreset[];
  value: FormatPreset;
  onChange: (format: FormatPreset) => void;
}

export default function FormatPicker({ presets, value, onChange }: FormatPickerProps) {
  const isCustom = !presets.some((preset) => preset.id === value.id);
  const [mode, setMode] = useState<'preset' | 'custom'>(isCustom ? 'custom' : 'preset');
  const [customWidth, setCustomWidth] = useState(String(value.width));
  const [customHeight, setCustomHeight] = useState(String(value.height));

  const canApplyCustom = useMemo(() => {
    const width = Number(customWidth);
    const height = Number(customHeight);
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
  }, [customWidth, customHeight]);

  const applyCustom = () => {
    if (!canApplyCustom) return;
    onChange({
      id: 'custom',
      label: `Custom ${customWidth} x ${customHeight}`,
      width: Number(customWidth),
      height: Number(customHeight),
    });
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Format</p>
      <div className="space-y-2">
        {presets.map((preset) => {
          const selected = mode === 'preset' && value.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              data-testid={`format-option-${preset.id}`}
              onClick={() => {
                setMode('preset');
                onChange(preset);
              }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                selected
                  ? 'border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/30'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
                {FORMAT_ICONS[preset.id] ?? <Puzzle className="h-4 w-4 text-gray-500" />}
                {preset.label}
              </span>
              <span className="text-xs text-gray-500">
                {preset.width} x {preset.height}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          data-testid="format-option-custom"
          onClick={() => setMode('custom')}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
            mode === 'custom'
              ? 'border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/30'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
            {FORMAT_ICONS.custom} Custom
          </span>
          <span className="text-xs text-gray-500">Width x Height</span>
        </button>

        {mode === 'custom' && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <label className="text-xs font-medium text-gray-400">
              Width
              <input
                data-testid="custom-width-input"
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-gray-200 placeholder:text-gray-600"
              />
            </label>
            <label className="text-xs font-medium text-gray-400">
              Height
              <input
                data-testid="custom-height-input"
                type="number"
                min={1}
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className="mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-gray-200 placeholder:text-gray-600"
              />
            </label>
            <button
              type="button"
              data-testid="apply-custom-format"
              disabled={!canApplyCustom}
              onClick={applyCustom}
              className="col-span-2 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply custom format
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
