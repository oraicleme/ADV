/**
 * Industry-standard emoji picker: click to open, search, scrollable grid.
 * Replaces hover-based picker that was hard to use (STORY-126 style).
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { cn } from '@/lib/utils';

export interface EmojiOption {
  value: string;
  label: string;
  keywords: string;
}

const EMOJI_LIST: EmojiOption[] = [
  { value: '', label: 'None', keywords: 'remove clear' },
  { value: '🔥', label: '🔥', keywords: 'fire hot sale' },
  { value: '📢', label: '📢', keywords: 'announce megaphone' },
  { value: '✨', label: '✨', keywords: 'sparkle new' },
  { value: '🎉', label: '🎉', keywords: 'celebrate party' },
  { value: '🏷️', label: '🏷️', keywords: 'tag label' },
  { value: '⭐', label: '⭐', keywords: 'star favorite' },
  { value: '💥', label: '💥', keywords: 'boom wow' },
  { value: '🛒', label: '🛒', keywords: 'shop cart' },
  { value: '💰', label: '💰', keywords: 'money deal' },
  { value: '🏷', label: '🏷', keywords: 'tag' },
  { value: '✅', label: '✅', keywords: 'check done' },
  { value: '🎁', label: '🎁', keywords: 'gift' },
  { value: '💎', label: '💎', keywords: 'diamond premium' },
  { value: '🚀', label: '🚀', keywords: 'launch fast' },
  { value: '❤️', label: '❤️', keywords: 'love heart' },
  { value: '👍', label: '👍', keywords: 'thumbs up' },
  { value: '🆕', label: '🆕', keywords: 'new' },
  { value: '📦', label: '📦', keywords: 'package box' },
  { value: '🏪', label: '🏪', keywords: 'store shop' },
  { value: '⚡', label: '⚡', keywords: 'fast flash' },
  { value: '🌟', label: '🌟', keywords: 'star glow' },
  { value: '💯', label: '💯', keywords: 'hundred percent' },
  { value: '🎯', label: '🎯', keywords: 'target offer' },
  { value: '🔔', label: '🔔', keywords: 'notification' },
  { value: '📣', label: '📣', keywords: 'announce' },
  { value: '🛍️', label: '🛍️', keywords: 'shopping bag' },
  { value: '👀', label: '👀', keywords: 'look see' },
  { value: '💪', label: '💪', keywords: 'strong' },
  { value: '🌙', label: '🌙', keywords: 'night' },
  { value: '☀️', label: '☀️', keywords: 'sun summer' },
];

export interface EmojiPickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
  /** Trigger: e.g. button showing current emoji */
  trigger: React.ReactNode;
  /** Optional class for the trigger wrapper */
  triggerClassName?: string;
  /** Optional test id for the popover content */
  'data-testid'?: string;
}

export default function EmojiPickerPopover({
  value,
  onChange,
  trigger,
  triggerClassName,
  'data-testid': dataTestId = 'emoji-picker-popover',
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EMOJI_LIST;
    return EMOJI_LIST.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.keywords.toLowerCase().includes(q) ||
        (e.value === '' && 'none'.includes(q)),
    );
  }, [search]);

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className={cn('inline-flex', triggerClassName)}>{trigger}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[280px] p-0"
        data-testid={dataTestId}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-black/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emoji…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-2 text-sm placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              data-testid="emoji-picker-search"
            />
          </div>
        </div>
        <div className="max-h-[220px] overflow-y-auto p-2">
          <div className="grid grid-cols-8 gap-0.5">
            {filtered.map((opt) => (
              <button
                key={opt.value === '' ? 'none' : opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-orange-50',
                  value === opt.value ? 'bg-orange-100 ring-1 ring-orange-300' : '',
                )}
                title={opt.value === '' ? 'None' : opt.keywords}
                data-testid={opt.value === '' ? 'emoji-option-none' : `emoji-option-${opt.value}`}
              >
                {opt.value === '' ? '○' : opt.label}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">No emojis match</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
