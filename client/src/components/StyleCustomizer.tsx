import type { StyleOptions } from '../lib/ad-layouts/types';

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'System Sans', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Georgia Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Courier Mono', value: "'Courier New', Courier, monospace" },
  { label: 'Impact Bold', value: "Impact, 'Arial Black', sans-serif" },
  { label: 'Verdana Clean', value: 'Verdana, Geneva, sans-serif' },
];

const COLOR_SWATCHES = [
  '#f8fafc', '#f1f5f9', '#ffffff', '#fef3c7', '#fecaca',
  '#bfdbfe', '#bbf7d0', '#e9d5ff', '#1e293b', '#000000',
  '#f97316', '#ef4444',
];

function ColorPicker({
  value,
  onChange,
  label,
  testId,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  testId: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-400">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-7 w-7 rounded-md border-2 transition ${
              value === color
                ? 'border-orange-500 ring-2 ring-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                : 'border-white/10 hover:border-white/20'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`${label} ${color}`}
          />
        ))}
        <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/20 hover:border-orange-500/50 hover:bg-orange-500/5">
          <input
            data-testid={testId}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Custom ${label}`}
          />
          <span className="text-xs text-gray-500">+</span>
        </label>
      </div>
    </div>
  );
}

interface StyleCustomizerProps {
  value: StyleOptions;
  onChange: (style: StyleOptions) => void;
}

export default function StyleCustomizer({ value, onChange }: StyleCustomizerProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Style</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorPicker
          label="Background"
          testId="style-background-input"
          value={value.backgroundColor}
          onChange={(backgroundColor) => onChange({ ...value, backgroundColor })}
        />
        <ColorPicker
          label="Accent"
          testId="style-accent-input"
          value={value.accentColor}
          onChange={(accentColor) => onChange({ ...value, accentColor })}
        />
        <div>
          <label className="text-xs font-medium text-gray-400">Font</label>
          <select
            data-testid="style-font-select"
            value={value.fontFamily}
            onChange={(e) => onChange({ ...value, fontFamily: e.target.value })}
            className="mt-1 h-9 w-full rounded border border-white/10 bg-white/5 px-2 text-sm text-gray-200"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
