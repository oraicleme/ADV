import type { LayoutId } from '../lib/ad-layouts/types';

interface LayoutOption {
  id: LayoutId;
  label: string;
  subtitle: string;
}

const OPTIONS: LayoutOption[] = [
  { id: 'single-hero', label: 'Single Product', subtitle: 'Hero focus' },
  { id: 'multi-grid', label: 'Product Grid', subtitle: '2-6 products' },
  { id: 'category-group', label: 'By Category', subtitle: 'Grouped sections' },
  { id: 'sale-discount', label: 'Sale / Discount', subtitle: 'Promo pricing' },
];

interface LayoutPickerProps {
  value: LayoutId;
  onChange: (layout: LayoutId) => void;
}

export default function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Layout</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`layout-option-${option.id}`}
              onClick={() => onChange(option.id)}
              className={`rounded-lg border-2 p-3 text-left transition hover:scale-[1.03] ${
                selected
                  ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="mb-2 h-12 rounded-md bg-white/5 p-1.5 shadow-inner border border-white/5">
                {option.id === 'single-hero' && (
                  <div className="h-full w-full rounded border border-white/10 bg-white/10" />
                )}
                {option.id === 'multi-grid' && (
                  <div className="grid h-full grid-cols-2 gap-1">
                    <div className="rounded border border-white/10 bg-white/10" />
                    <div className="rounded border border-white/10 bg-white/10" />
                    <div className="rounded border border-white/10 bg-white/10" />
                    <div className="rounded border border-white/10 bg-white/10" />
                  </div>
                )}
                {option.id === 'category-group' && (
                  <div className="flex h-full flex-col gap-1">
                    <div className="h-2 rounded bg-orange-500/50" />
                    <div className="flex-1 rounded border border-white/10 bg-white/10" />
                  </div>
                )}
                {option.id === 'sale-discount' && (
                  <div className="flex h-full flex-col gap-1">
                    <div className="h-3 rounded bg-red-500/50" />
                    <div className="grid flex-1 grid-cols-2 gap-1">
                      <div className="rounded border border-white/10 bg-white/10" />
                      <div className="rounded border border-white/10 bg-white/10" />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-sm font-semibold text-gray-200">{option.label}</div>
              <div className="text-xs text-gray-500">{option.subtitle}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
