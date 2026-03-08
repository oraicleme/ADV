/**
 * AdCanvasEditor — STORY-41 / STORY-37
 * Full-canvas WYSIWYG ad editor.  Each ad element is a directly-editable block;
 * no separate side panel required.  Drag handles allow layer reordering.
 *
 * STORY-37: adaptive text contrast so inputs are always visible regardless of
 * which background colour the user has selected.
 */
import React, { useRef, useState, useCallback } from 'react';
import { GripVertical, X, Plus, AlignLeft, AlignCenter, AlignRight, Sparkles, Loader2 } from 'lucide-react';
import AgentChatPanel from './AgentChatPanel';
import MultiAgentSuggestionPanel from './MultiAgentSuggestionPanel';
import type { MultiAgentSuggestion, MultiAgentSuggestionResult } from '../lib/multi-agent-suggestions';
import ExportPanel from './ExportPanel';
import { HeaderFooterConfigPanel } from './HeaderFooterConfigPanel';
import { PanelTabBar, type PanelTab } from './PanelTabBar';
import ProductSelectionPanel from './ProductSelectionPanel';
import type { HeaderConfig, FooterConfig } from '../lib/ad-config-schema';
import type { ConversationMessage, ChatModelMode } from '../lib/agent-chat-engine';
import type { AgentAction } from '../lib/agent-actions';
import type { AdElementKey, ProductBlockOptions } from '../lib/ad-constants';
import type { ProductItem } from '../lib/ad-constants';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';
import PhotoPickerPopover from './PhotoPickerPopover';
import type { StyleOptions } from '../lib/ad-layouts/types';
import {
  MIN_TITLE_FONT_SIZE,
  MAX_TITLE_FONT_SIZE,
  MAX_TITLE_LENGTH,
  MAX_CTA_LENGTH,
  MAX_BADGE_LENGTH,
  MAX_DISCLAIMER_LENGTH,
  MAX_CTA_BUTTONS,
  MIN_LOGO_HEIGHT,
  MAX_LOGO_HEIGHT,
  DEFAULT_LOGO_HEIGHT,
  MIN_PRODUCT_IMAGE_HEIGHT,
  MAX_PRODUCT_IMAGE_HEIGHT,
  DEFAULT_PRODUCT_IMAGE_HEIGHT,
  DEFAULT_PRODUCT_BLOCK_OPTIONS,
  HEADER_BRAND_LOGO_MAX_COUNT,
  HEADER_BRAND_LOGO_HEIGHT_PX,
  HEADER_BRAND_LOGO_MAX_WIDTH_PX,
} from '../lib/ad-constants';

export type LogoAlignment = 'left' | 'center' | 'right';
export type LogoCompanion = 'none' | 'headline' | 'badge' | 'emoji';

/* ── Adaptive contrast helpers (STORY-37) ──────────────────────────────── */

function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1; // fallback to light theme
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

interface AdaptiveColors {
  text: string;
  textMuted: string;
  labelText: string;
  borderColor: string;
}

function getAdaptiveColors(bgHex: string): AdaptiveColors {
  const safeHex = bgHex?.startsWith('#') ? bgHex : '#f8fafc';
  const isDark = getLuminance(safeHex) < 0.179;
  return {
    text: isDark ? '#f1f5f9' : '#111827',
    textMuted: isDark ? '#94a3b8' : '#4b5563',
    labelText: isDark ? '#64748b' : '#9ca3af',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
  };
}

/* ── ─────────────────────────────────────────────────────────────────────── */

const CTA_SUGGESTIONS = ['Shop now', 'See offers', 'Buy now', 'Learn more', 'Get offer'] as const;

const EMOJI_PRESETS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: '🔥', label: '🔥 Hot' },
  { value: '📢', label: '📢 Announce' },
  { value: '✨', label: '✨ Sparkle' },
  { value: '🎉', label: '🎉 Celebrate' },
  { value: '🏷️', label: '🏷️ Tag' },
  { value: '⭐', label: '⭐ Star' },
  { value: '💥', label: '💥 Boom' },
  { value: '🛒', label: '🛒 Shop' },
];

function getGridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  return 3;
}

export interface AdCanvasEditorProps {
  headline: string;
  onHeadlineChange: (v: string) => void;
  titleFontSize: number;
  onTitleFontSizeChange: (v: number) => void;
  ctaButtons: string[];
  onCtaButtonsChange: (v: string[]) => void;
  badgeText: string;
  onBadgeTextChange: (v: string) => void;
  disclaimerText: string;
  onDisclaimerTextChange: (v: string) => void;
  emojiOrIcon: string;
  onEmojiOrIconChange: (v: string) => void;
  elementOrder: AdElementKey[];
  onElementOrderChange: (v: AdElementKey[]) => void;
  products: ProductItem[];
  companyLogoDataUri?: string;
  /** Uploaded brand logos (data URIs) — shown in canvas so user sees their upload; also used per-product in final ad */
  brandLogoDataUris?: string[];
  /** STORY-47: Header brand logos — shown right-aligned in the logo row at fixed 32px height. */
  headerBrandLogoDataUris?: string[];
  style: StyleOptions;
  /** Logo height in px (STORY-43). Default DEFAULT_LOGO_HEIGHT. */
  logoHeight?: number;
  onLogoHeightChange?: (v: number) => void;
  /** Logo alignment (STORY-43). Default 'center'. */
  logoAlignment?: LogoAlignment;
  onLogoAlignmentChange?: (v: LogoAlignment) => void;
  /** Element rendered beside the logo (STORY-43). Default 'none'. */
  logoCompanion?: LogoCompanion;
  onLogoCompanionChange?: (v: LogoCompanion) => void;
  /** Product image height in px (STORY-52). Default DEFAULT_PRODUCT_IMAGE_HEIGHT. */
  productImageHeight?: number;
  onProductImageHeightChange?: (v: number) => void;
  /** STORY-55: saved photos library — when provided, "No img" cells become clickable pickers. */
  savedProductPhotos?: SavedProductPhotoEntry[];
  /** STORY-55: called when user assigns a photo from the canvas product cell. canvasIndex = position in `products` prop. */
  onAssignProductPhoto?: (canvasIndex: number, dataUri: string) => void;
  /** STORY-55: called when user uploads a new photo from the canvas product cell. */
  onUploadProductPhoto?: (canvasIndex: number, file: File) => void;
  /** STORY-56: per-product-block options (columns, field visibility, image height). */
  productBlockOptions?: ProductBlockOptions;
  onProductBlockOptionsChange?: (v: ProductBlockOptions) => void;
  /** STORY-58: AI "edit with prompt" (single-turn, legacy). Shown only when chat props are absent. */
  onAiEditPrompt?: (prompt: string) => Promise<void>;
  aiEditPending?: boolean;
  aiEditError?: string | null;
  /** STORY-62: Conversational AI chat panel (replaces single-turn bar when provided). */
  chatMessages?: ConversationMessage[];
  onChatSend?: (message: string) => Promise<void>;
  chatPending?: boolean;
  chatError?: string | null;
  chatModel?: ChatModelMode;
  onChatModelChange?: (v: ChatModelMode) => void;
  onChatUndo?: () => void;
  canChatUndo?: boolean;
  /** STORY-62 Phase 2: proactive suggestions */
  suggestionsEnabled?: boolean;
  onSuggestionsToggle?: (enabled: boolean) => void;
  onApplySuggestion?: (timestamp: number, actions: AgentAction[]) => void;
  onDismissSuggestion?: (timestamp: number) => void;
  /** Multi-agent suggestions */
  multiAgentSuggestions?: MultiAgentSuggestionResult | null;
  multiAgentPending?: boolean;
  multiAgentError?: string | null;
  onApplyMultiAgentSuggestion?: (suggestion: MultiAgentSuggestion) => void;
  onDismissMultiAgentSuggestion?: (suggestionId: string) => void;
  /** Header/Footer configuration */
  header?: HeaderConfig;
  onHeaderChange?: (header: HeaderConfig) => void;
  footer?: FooterConfig;
  onFooterChange?: (footer: FooterConfig) => void;
  showHeaderFooterPanel?: boolean;
  onToggleHeaderFooterPanel?: (show: boolean) => void;
}

/** Thin wrapper that draws the orange selection ring + drag handle + label. */
function CanvasBlock({
  label,
  elementKey,
  children,
  onDragStart,
  onDrop,
  labelColor,
}: {
  label: string;
  elementKey: AdElementKey;
  children: React.ReactNode;
  onDragStart: () => void;
  onDrop: () => void;
  labelColor: string;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      data-testid={`canvas-block-${elementKey}`}
      className="group relative rounded-xl border-2 border-transparent hover:border-orange-500/25 transition-all duration-150"
    >
      {/* Top bar: drag handle + label */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5 select-none">
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 cursor-grab"
          style={{ color: labelColor }}
          aria-hidden
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

export default function AdCanvasEditor({
  headline,
  onHeadlineChange,
  titleFontSize,
  onTitleFontSizeChange,
  ctaButtons,
  onCtaButtonsChange,
  badgeText,
  onBadgeTextChange,
  disclaimerText,
  onDisclaimerTextChange,
  emojiOrIcon,
  onEmojiOrIconChange,
  elementOrder,
  onElementOrderChange,
  products,
  companyLogoDataUri,
  brandLogoDataUris = [],
  headerBrandLogoDataUris,
  style,
  logoHeight: logoHeightProp,
  onLogoHeightChange,
  logoAlignment: logoAlignmentProp,
  onLogoAlignmentChange,
  logoCompanion: logoCompanionProp,
  onLogoCompanionChange,
  productImageHeight: productImageHeightProp,
  onProductImageHeightChange,
  savedProductPhotos = [],
  onAssignProductPhoto,
  onUploadProductPhoto,
  productBlockOptions: productBlockOptionsProp,
  onProductBlockOptionsChange,
  onAiEditPrompt,
  aiEditPending = false,
  aiEditError = null,
  chatMessages,
  onChatSend,
  chatPending = false,
  chatError = null,
  chatModel = 'smart',
  onChatModelChange,
  onChatUndo,
  canChatUndo = false,
  suggestionsEnabled = true,
  onSuggestionsToggle,
  onApplySuggestion,
  onDismissSuggestion,
  multiAgentSuggestions = null,
  multiAgentPending = false,
  multiAgentError = null,
  onApplyMultiAgentSuggestion,
  onDismissMultiAgentSuggestion,
  header,
  onHeaderChange,
  footer,
  onFooterChange,
  showHeaderFooterPanel = false,
  onToggleHeaderFooterPanel,
}: AdCanvasEditorProps) {
  const dragIdxRef = useRef<number | null>(null);
  const [anyFocused, setAnyFocused] = useState(false);
  const [openPickerIdx, setOpenPickerIdx] = useState<number | null>(null);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);
  const [aiPromptText, setAiPromptText] = useState('');
  const [activePanel, setActivePanel] = useState<PanelTab>('chat');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isCreatingNewAd, setIsCreatingNewAd] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const onFocus = useCallback(() => setAnyFocused(true), []);
  const [panelShowHeaderFooter, setPanelShowHeaderFooter] = useState(showHeaderFooterPanel);
  
  /* Header/Footer state */
  const headerConfig = header ?? { enabled: true, options: ['logo', 'badge'], backgroundColor: '#ffffff', textColor: '#000000', height: 80, padding: 16 };
  const footerConfig = footer ?? { enabled: true, options: ['cta-button'], backgroundColor: '#f5f5f5', textColor: '#000000', height: 60, padding: 16 };
  const onBlur = useCallback(() => setAnyFocused(false), []);

  // Handle creating new ad with remaining products
  const handleCreateNewAd = useCallback(
    async (remainingProducts: ProductItem[]) => {
      try {
        setIsCreatingNewAd(true);
        setCreationError(null);
        // TODO: Implement actual new ad creation logic
        // This would typically:
        // 1. Create a new canvas with remaining products
        // 2. Reset selected product IDs
        // 3. Switch back to chat tab
        console.log('Creating new ad with products:', remainingProducts);
        setSelectedProductIds([]);
        setActivePanel('chat');
      } catch (error) {
        setCreationError(error instanceof Error ? error.message : 'Failed to create new ad');
      } finally {
        setIsCreatingNewAd(false);
      }
    },
    []
  );

  /* Logo state — use prop-controlled if provided, else internal fallback */
  const logoHeight = logoHeightProp ?? DEFAULT_LOGO_HEIGHT;
  const logoAlignment = logoAlignmentProp ?? 'center';
  const logoCompanion = logoCompanionProp ?? 'none';

  /* Product image height — prop-controlled or default (STORY-52) */
  const productImageHeight = productImageHeightProp ?? DEFAULT_PRODUCT_IMAGE_HEIGHT;

  /* Product block options — prop-controlled or default (STORY-56) */
  const productBlockOptions = productBlockOptionsProp ?? DEFAULT_PRODUCT_BLOCK_OPTIONS;
  const setProductBlockField = useCallback(
    (key: keyof ProductBlockOptions, value: ProductBlockOptions[keyof ProductBlockOptions]) => {
      onProductBlockOptionsChange?.({ ...productBlockOptions, [key]: value });
    },
    [productBlockOptions, onProductBlockOptionsChange],
  );
  const setShowField = useCallback(
    (field: keyof ProductBlockOptions['showFields'], value: boolean) => {
      onProductBlockOptionsChange?.({
        ...productBlockOptions,
        showFields: { ...productBlockOptions.showFields, [field]: value },
      });
    },
    [productBlockOptions, onProductBlockOptionsChange],
  );

  const colors = getAdaptiveColors(style.backgroundColor);

  /* Logo drag-resize handler (STORY-43) */
  const startLogoResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = logoHeight;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startY;
        const next = Math.min(MAX_LOGO_HEIGHT, Math.max(MIN_LOGO_HEIGHT, Math.round(startH + delta)));
        onLogoHeightChange?.(next);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [logoHeight, onLogoHeightChange],
  );

  const handleDragStart = (idx: number) => {
    dragIdxRef.current = idx;
  };

  const handleDrop = (targetIdx: number) => {
    const srcIdx = dragIdxRef.current;
    if (srcIdx === null || srcIdx === targetIdx) return;
    const next = [...elementOrder];
    const [item] = next.splice(srcIdx, 1);
    next.splice(targetIdx, 0, item);
    onElementOrderChange(next);
    dragIdxRef.current = null;
  };

  const addCta = () => {
    if (ctaButtons.filter((b) => b.trim()).length >= MAX_CTA_BUTTONS) return;
    onCtaButtonsChange([...ctaButtons, '']);
  };

  const removeCta = (idx: number) => {
    const next = ctaButtons.filter((_, i) => i !== idx);
    onCtaButtonsChange(next.length === 0 ? [''] : next);
  };

  const updateCta = (idx: number, value: string) => {
    onCtaButtonsChange(ctaButtons.map((b, i) => (i === idx ? value.slice(0, MAX_CTA_LENGTH) : b)));
  };

  const appendCtaSuggestion = (s: string) => {
    const filled = ctaButtons.filter((b) => b.trim());
    if (filled.length >= MAX_CTA_BUTTONS) return;
    onCtaButtonsChange([...filled, s]);
  };

  const elementLabels: Record<AdElementKey, string> = {
    headline: 'Headline',
    products: 'Products',
    badge: 'Badge',
    cta: 'CTA Buttons',
    disclaimer: 'Disclaimer',
  };

  /* ── Element renderers ─────────────────────────────────────────── */

  const renderHeadline = () => (
    <div className="space-y-2">
      {/* Headline input row */}
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all"
        style={{ borderBottom: `1.5px dashed ${colors.borderColor}` }}
        data-testid="headline-input-wrapper"
      >
        {/* Emoji inline picker */}
        <div className="group/emoji relative shrink-0">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-base leading-none hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            title="Pick emoji"
            data-testid="canvas-emoji-button"
          >
            {emojiOrIcon || '○'}
          </button>
          {/* Hover dropdown */}
          <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-max max-w-xs flex-wrap gap-1 rounded-xl border border-white/10 bg-gray-900/95 p-2 shadow-xl backdrop-blur group-hover/emoji:pointer-events-auto group-hover/emoji:flex"
            data-testid="emoji-picker"
          >
            {EMOJI_PRESETS.map(({ value, label }) => (
              <button
                key={value || 'none'}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onEmojiOrIconChange(value);
                }}
                className={`rounded px-2 py-0.5 text-sm hover:bg-white/10 ${emojiOrIcon === value ? 'bg-white/10' : ''}`}
                data-testid={`emoji-option-${value || 'none'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Headline text — adaptive color so it's always readable */}
        <input
          type="text"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value.slice(0, MAX_TITLE_LENGTH))}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Your headline…"
          maxLength={MAX_TITLE_LENGTH}
          style={{
            fontSize: Math.min(MAX_TITLE_FONT_SIZE, Math.max(MIN_TITLE_FONT_SIZE, titleFontSize)),
            fontWeight: 800,
            color: colors.text,
            fontFamily: style.fontFamily,
          }}
          className="flex-1 min-w-0 bg-transparent border-none outline-none leading-tight"
          data-testid="ad-option-headline"
        />
        <span
          className="shrink-0 text-[10px] tabular-nums"
          style={{ color: colors.labelText }}
          data-testid="headline-char-count"
        >
          {headline.length}/{MAX_TITLE_LENGTH}
        </span>
      </div>

      {/* Font size control — always visible */}
      <div className="flex items-center gap-2" data-testid="font-size-control">
        <span className="shrink-0 text-[10px] text-gray-600">Size</span>
        <input
          type="range"
          min={MIN_TITLE_FONT_SIZE}
          max={MAX_TITLE_FONT_SIZE}
          step={1}
          value={titleFontSize}
          onChange={(e) => onTitleFontSizeChange(Number(e.target.value))}
          className="flex-1 accent-orange-500 cursor-pointer"
          aria-label="Headline font size"
          data-testid="font-size-slider"
        />
        <input
          type="number"
          min={MIN_TITLE_FONT_SIZE}
          max={MAX_TITLE_FONT_SIZE}
          value={titleFontSize}
          onChange={(e) => {
            const v = Math.min(
              MAX_TITLE_FONT_SIZE,
              Math.max(MIN_TITLE_FONT_SIZE, Number(e.target.value) || MIN_TITLE_FONT_SIZE),
            );
            onTitleFontSizeChange(v);
          }}
          className="w-12 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-center text-xs text-gray-200 focus:border-orange-500/50 focus:outline-none"
          aria-label="Headline font size value"
          data-testid="font-size-input"
        />
        <span className="text-[10px] text-gray-600">px</span>
      </div>
    </div>
  );

  const renderBadge = () => (
    <div className="flex justify-center py-1">
      <input
        type="text"
        value={badgeText}
        onChange={(e) => onBadgeTextChange(e.target.value.slice(0, MAX_BADGE_LENGTH))}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Badge text (e.g. 30% OFF)"
        maxLength={MAX_BADGE_LENGTH}
        style={{
          background: style.accentColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: '16px',
          borderRadius: '999px',
          padding: '8px 20px',
          border: 'none',
          outline: 'none',
          textAlign: 'center',
          minWidth: '80px',
          width: 'auto',
        }}
        className="focus:ring-2 focus:ring-white/30 focus:ring-offset-0"
        data-testid="ad-option-badge"
      />
    </div>
  );

  const renderCta = () => (
    <div className="space-y-2">
      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-1">
        {CTA_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => appendCtaSuggestion(s)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300 transition hover:bg-white/10 focus:outline-none"
            data-testid={`cta-suggestion-${s.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Button-shaped editable inputs */}
      <div className="flex flex-wrap gap-2 items-center" data-testid="cta-buttons-list">
        {ctaButtons.map((btn, idx) => (
          <div key={idx} className="relative flex items-center">
            <input
              type="text"
              value={btn}
              onChange={(e) => updateCta(idx, e.target.value)}
              placeholder="Button text"
              maxLength={MAX_CTA_LENGTH}
              style={{
                background: style.accentColor,
                color: '#fff',
                fontWeight: 800,
                fontSize: '15px',
                borderRadius: '10px',
                padding: '10px 18px',
                border: 'none',
                outline: 'none',
                minWidth: '80px',
                textAlign: 'center',
              }}
              className="focus:ring-2 focus:ring-white/30"
              data-testid={idx === 0 ? 'ad-option-cta' : `ad-option-cta-${idx}`}
            />
            {ctaButtons.length > 1 && (
              <button
                type="button"
                onClick={() => removeCta(idx)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/30 text-red-400 hover:bg-red-500/50 focus:outline-none"
                aria-label={`Remove CTA button ${idx + 1}`}
                data-testid={`remove-cta-${idx}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {ctaButtons.filter((b) => b.trim()).length < MAX_CTA_BUTTONS && (
        <button
          type="button"
          onClick={addCta}
          className="flex items-center gap-1 text-xs text-orange-400/80 hover:text-orange-400 focus:outline-none"
          data-testid="add-cta-button"
        >
          <Plus className="h-3.5 w-3.5" />
          Add CTA button
        </button>
      )}
    </div>
  );

  const renderDisclaimer = () => (
    <div
      style={{ borderBottom: `1.5px dashed ${colors.borderColor}` }}
      className="py-1"
    >
      <input
        type="text"
        value={disclaimerText}
        onChange={(e) => onDisclaimerTextChange(e.target.value.slice(0, MAX_DISCLAIMER_LENGTH))}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Disclaimer / footer text (optional)"
        maxLength={MAX_DISCLAIMER_LENGTH}
        style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', fontFamily: style.fontFamily }}
        className="w-full bg-transparent border-none outline-none"
        data-testid="ad-option-disclaimer"
      />
    </div>
  );

  const renderProducts = () => {
    if (products.length === 0) {
      return (
        <p className="py-4 text-center text-xs text-gray-600">
          No products selected — use the left panel to add products.
        </p>
      );
    }
    const { showFields } = productBlockOptions;
    const maxShow = productBlockOptions.maxProducts > 0 ? productBlockOptions.maxProducts : 0;
    const shown = maxShow > 0 ? products.slice(0, maxShow) : products;
    const rest = products.length - shown.length;
    const cols =
      productBlockOptions.columns > 0
        ? productBlockOptions.columns
        : getGridColumns(shown.length);

    const FIELD_TOGGLES: { key: keyof typeof showFields; label: string }[] = [
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Desc' },
      { key: 'originalPrice', label: 'Sale' },
      { key: 'discountBadge', label: 'Badge' },
      { key: 'brandLogo', label: 'Logo' },
    ];

    return (
      <div>
        {/* Max products to show (0 = all) — scalable 3+ products */}
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <span className="shrink-0 text-[10px]" style={{ color: colors.labelText }}>Show</span>
          {([0, 3, 5, 10, 20] as const).map((n) => (
            <button
              key={n}
              type="button"
              data-testid={n === 0 ? 'show-all-btn' : `show-${n}-btn`}
              onClick={() => setProductBlockField('maxProducts', n)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
              style={{
                background: productBlockOptions.maxProducts === n ? style.accentColor : 'rgba(0,0,0,0.07)',
                color: productBlockOptions.maxProducts === n ? '#fff' : colors.text,
              }}
            >
              {n === 0 ? 'All' : String(n)}
            </button>
          ))}
        </div>
        {/* Columns toolbar */}
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <span className="shrink-0 text-[10px]" style={{ color: colors.labelText }}>Cols</span>
          {([0, 1, 2, 3, 4] as const).map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`col-btn-${c}`}
              onClick={() => setProductBlockField('columns', c)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
              style={{
                background: productBlockOptions.columns === c ? style.accentColor : 'rgba(0,0,0,0.07)',
                color: productBlockOptions.columns === c ? '#fff' : colors.text,
              }}
            >
              {c === 0 ? 'Auto' : c}
            </button>
          ))}
          <span className="ml-2 shrink-0 text-[10px]" style={{ color: colors.labelText }}>Fields</span>
          {FIELD_TOGGLES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              data-testid={`field-toggle-${key}`}
              onClick={() => setShowField(key, !showFields[key])}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
              style={{
                background: showFields[key] ? style.accentColor : 'rgba(0,0,0,0.07)',
                color: showFields[key] ? '#fff' : colors.labelText,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Product image size control (STORY-52) */}
        <div className="mb-2.5 flex items-center gap-2" data-testid="product-image-size-control">
          <span className="shrink-0 text-[10px]" style={{ color: colors.labelText }}>Photo size</span>
          <input
            type="range"
            min={MIN_PRODUCT_IMAGE_HEIGHT}
            max={MAX_PRODUCT_IMAGE_HEIGHT}
            step={4}
            value={productImageHeight}
            onChange={(e) => onProductImageHeightChange?.(Number(e.target.value))}
            className="flex-1 accent-orange-500 cursor-pointer"
            aria-label="Product image size"
            data-testid="product-image-size-slider"
          />
          <input
            type="number"
            min={MIN_PRODUCT_IMAGE_HEIGHT}
            max={MAX_PRODUCT_IMAGE_HEIGHT}
            value={productImageHeight}
            onChange={(e) => {
              const v = Math.min(
                MAX_PRODUCT_IMAGE_HEIGHT,
                Math.max(MIN_PRODUCT_IMAGE_HEIGHT, Number(e.target.value) || DEFAULT_PRODUCT_IMAGE_HEIGHT),
              );
              onProductImageHeightChange?.(v);
            }}
            className="w-12 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-center text-xs focus:border-orange-500/50 focus:outline-none"
            style={{ color: colors.text }}
            aria-label="Product image size value"
            data-testid="product-image-size-input"
          />
          <span className="text-[10px] select-none" style={{ color: colors.labelText }}>px</span>
        </div>

        {/* Product grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: '8px',
          }}
        >
          {shown.map((p, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: '10px',
                padding: '6px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              {/* Product image — clickable when onAssignProductPhoto provided (STORY-55) */}
              {showFields.image && (
                p.imageDataUri ? (
                  <div
                    style={{
                      width: '100%',
                      height: `${productImageHeight}px`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.10)',
                      background: '#f3f4f6',
                      position: 'relative',
                      cursor: onAssignProductPhoto ? 'pointer' : 'default',
                    }}
                    data-testid={`product-image-wrap-${i}`}
                    onClick={onAssignProductPhoto ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setOpenPickerIdx((prev) => prev === i ? null : i);
                      setPickerRect(rect);
                    } : undefined}
                    title={onAssignProductPhoto ? 'Click to change photo' : undefined}
                  >
                    <img
                      src={p.imageDataUri}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                    {onAssignProductPhoto && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                      >
                        <span style={{ fontSize: '9px', color: '#fff', fontWeight: 700, opacity: 0, pointerEvents: 'none' }}>Change</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: `${productImageHeight}px`,
                      background: '#f0f4ff',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      cursor: onAssignProductPhoto ? 'pointer' : 'default',
                      border: onAssignProductPhoto ? '1.5px dashed #f97316' : '1.5px dashed #d1d5db',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    data-testid={`product-no-image-${i}`}
                    onClick={onAssignProductPhoto ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setOpenPickerIdx((prev) => prev === i ? null : i);
                      setPickerRect(rect);
                    } : undefined}
                    title={onAssignProductPhoto ? 'Click to add photo' : undefined}
                    onMouseEnter={onAssignProductPhoto ? e => { (e.currentTarget as HTMLDivElement).style.background = '#fff7ed'; } : undefined}
                    onMouseLeave={onAssignProductPhoto ? e => { (e.currentTarget as HTMLDivElement).style.background = '#f0f4ff'; } : undefined}
                  >
                    <span style={{ fontSize: '16px' }}>📷</span>
                    <span style={{ fontSize: '9px', color: onAssignProductPhoto ? '#f97316' : '#9ca3af', fontWeight: onAssignProductPhoto ? 600 : 400 }}>
                      {onAssignProductPhoto ? 'Add photo' : 'No img'}
                    </span>
                  </div>
                )
              )}

              {/* STORY-55: photo picker popover for this product cell */}
              {openPickerIdx === i && pickerRect && onAssignProductPhoto && (
                <PhotoPickerPopover
                  productIndex={i}
                  productName={p.name}
                  productCode={p.code}
                  productPrice={p.retailPrice ?? p.price}
                  savedPhotos={savedProductPhotos}
                  onAssign={(dataUri) => {
                    onAssignProductPhoto(i, dataUri);
                    setOpenPickerIdx(null);
                  }}
                  onUploadAndSave={(file) => {
                    onUploadProductPhoto?.(i, file);
                    setOpenPickerIdx(null);
                  }}
                  onClose={() => setOpenPickerIdx(null)}
                  anchorRect={pickerRect}
                />
              )}

              {/* Brand logo */}
              {showFields.brandLogo && p.brandLogoDataUri && (
                <div style={{ marginTop: '4px' }}>
                  <img
                    src={p.brandLogoDataUri}
                    alt="Brand"
                    style={{ height: '14px', maxWidth: '56px', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Code */}
              {showFields.code && p.code && (
                <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '3px' }}>
                  {p.code}
                </div>
              )}

              {/* Name */}
              {showFields.name && (
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    marginTop: '4px',
                    lineHeight: 1.2,
                    color: '#1f2937',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </div>
              )}

              {/* Description */}
              {showFields.description && p.description && (
                <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px', lineHeight: 1.3 }}>
                  {p.description.slice(0, 60)}
                </div>
              )}

              {/* Original price (strikethrough) */}
              {showFields.originalPrice && p.originalPrice && (
                <div style={{ fontSize: '9px', color: '#9ca3af', textDecoration: 'line-through', marginTop: '2px' }}>
                  {p.originalPrice}{p.currency ? ` ${p.currency}` : ''}
                </div>
              )}

              {/* Current price */}
              {showFields.price && (p.discountPrice ?? p.price) && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: style.accentColor }}>
                  {p.discountPrice ?? p.price}
                  {p.currency ? ` ${p.currency}` : ''}
                </div>
              )}

              {/* Discount badge */}
              {showFields.discountBadge && typeof p.discountPercent === 'number' && (
                <div style={{
                  display: 'inline-flex',
                  marginTop: '2px',
                  padding: '1px 5px',
                  borderRadius: '999px',
                  background: style.accentColor,
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                }}>
                  -{Math.abs(p.discountPercent)}%
                </div>
              )}
            </div>
          ))}
        </div>
        {rest > 0 && (
          <p className="mt-1 text-center text-[10px] text-gray-500">+{rest} more products</p>
        )}
        <p className="mt-1 text-center text-[10px] text-gray-600">
          {products.length} product{products.length !== 1 ? 's' : ''} · manage in left panel
        </p>
      </div>
    );
  };

  const renderContent = (key: AdElementKey): React.ReactNode => {
    switch (key) {
      case 'headline':
        return renderHeadline();
      case 'badge':
        return renderBadge();
      case 'cta':
        return renderCta();
      case 'disclaimer':
        return renderDisclaimer();
      case 'products':
        return renderProducts();
      default:
        return null;
    }
  };

  const isEmpty =
    !companyLogoDataUri &&
    products.length === 0 &&
    !headline.trim() &&
    !badgeText.trim() &&
    !disclaimerText.trim() &&
    !ctaButtons.some((b) => b.trim());

  const showEditHint = !headline.trim() && !badgeText.trim();

  return (
    <div
      className="flex flex-col gap-1.5 p-4 min-h-full overflow-y-auto"
      style={{ background: style.backgroundColor, fontFamily: style.fontFamily }}
      data-testid="ad-canvas-editor"
    >
      {/* Live-edit hint — visible until user starts typing (STORY-37) */}
      {showEditHint && (
        <p
          className="text-center select-none"
          style={{ color: colors.labelText, fontSize: '11px', padding: '2px 0 4px', letterSpacing: '0.01em' }}
          data-testid="canvas-edit-hint"
        >
          ✎ Click any field to edit — changes apply live
        </p>
      )}

      {/* Company + brand logos — same row, resizable via logo height (STORY-43) */}
      {(companyLogoDataUri || brandLogoDataUris.length > 0) && (
        <div
          className="rounded-xl border-2 border-transparent hover:border-orange-500/25 transition-all duration-150 pb-1"
          data-testid="canvas-logo-block"
        >
          {/* Logo controls bar */}
          <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-1 select-none">
            {/* Alignment buttons */}
            <div className="flex items-center gap-0.5" data-testid="logo-alignment-group">
              {([
                { id: 'left' as LogoAlignment, Icon: AlignLeft },
                { id: 'center' as LogoAlignment, Icon: AlignCenter },
                { id: 'right' as LogoAlignment, Icon: AlignRight },
              ] as const).map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onLogoAlignmentChange?.(id)}
                  data-testid={`logo-align-${id}`}
                  aria-label={`Align logo ${id}`}
                  className={`rounded p-1 transition ${
                    logoAlignment === id
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>

            {/* Companion picker */}
            <select
              value={logoCompanion}
              onChange={(e) => onLogoCompanionChange?.(e.target.value as LogoCompanion)}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              style={{ color: colors.labelText }}
              data-testid="logo-companion-picker"
              aria-label="Element beside logo"
            >
              <option value="none">+ Add beside logo</option>
              <option value="headline">Headline</option>
              <option value="badge">Badge</option>
              <option value="emoji">Emoji</option>
            </select>
          </div>

          {/* Logo row — company logo + optional companion + brand logos (same resize) */}
          <div
            className="px-3 py-2 flex items-center gap-3 flex-wrap"
            style={{
              justifyContent:
                logoAlignment === 'left' ? 'flex-start' : logoAlignment === 'right' ? 'flex-end' : 'center',
            }}
            data-testid="canvas-logo-row"
          >
            {companyLogoDataUri && (
              <span
                className="logo-compat inline-block rounded-lg overflow-hidden"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                data-testid="canvas-company-logo-wrap"
              >
                <img
                  src={companyLogoDataUri}
                  alt="Company logo"
                  style={{
                    maxHeight: `${logoHeight}px`,
                    maxWidth: `${Math.round(logoHeight * 3.75)}px`,
                    objectFit: 'contain',
                    flexShrink: 0,
                    transition: 'max-height 0.1s ease',
                  }}
                />
              </span>
            )}
            {/* Companion element inline */}
            {logoCompanion === 'headline' && (
              <input
                type="text"
                value={headline}
                onChange={(e) => onHeadlineChange(e.target.value.slice(0, 60))}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Headline beside logo…"
                style={{
                  fontSize: `${Math.max(14, Math.min(28, Math.round(logoHeight * 0.45)))}px`,
                  fontWeight: 800,
                  color: colors.text,
                  fontFamily: style.fontFamily,
                  minWidth: '80px',
                  maxWidth: '200px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderBottom: `1.5px dashed ${colors.borderColor}`,
                }}
                data-testid="logo-companion-headline-input"
              />
            )}
            {logoCompanion === 'badge' && (
              <input
                type="text"
                value={badgeText}
                onChange={(e) => onBadgeTextChange(e.target.value.slice(0, MAX_BADGE_LENGTH))}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Badge…"
                style={{
                  background: style.accentColor,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '14px',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  border: 'none',
                  outline: 'none',
                  textAlign: 'center',
                  minWidth: '60px',
                }}
                className="focus:ring-2 focus:ring-white/30"
                data-testid="logo-companion-badge-input"
              />
            )}
            {logoCompanion === 'emoji' && (
              <div className="group/logo-emoji relative">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 leading-none hover:bg-white/10 focus:outline-none"
                  style={{ fontSize: `${Math.max(20, logoHeight - 16)}px` }}
                  title="Pick emoji"
                  data-testid="logo-companion-emoji-button"
                >
                  {emojiOrIcon || '○'}
                </button>
                <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden w-max max-w-xs flex-wrap gap-1 rounded-xl border border-white/10 bg-gray-900/95 p-2 shadow-xl backdrop-blur group-hover/logo-emoji:pointer-events-auto group-hover/logo-emoji:flex">
                  {EMOJI_PRESETS.map(({ value, label }) => (
                    <button
                      key={value || 'none'}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); onEmojiOrIconChange(value); }}
                      className={`rounded px-2 py-0.5 text-sm hover:bg-white/10 ${emojiOrIcon === value ? 'bg-white/10' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Per-product brand logos in header row (STORY-48: logo-compat, scales with company logo) */}
            {brandLogoDataUris.map((dataUri, i) => (
              <span
                key={i}
                className="logo-compat inline-block rounded-lg overflow-hidden"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                data-testid={`canvas-brand-logo-wrap-${i}`}
              >
                <img
                  src={dataUri}
                  alt=""
                  style={{
                    maxHeight: `${logoHeight}px`,
                    maxWidth: `${Math.round(logoHeight * 3.75)}px`,
                    objectFit: 'contain',
                    flexShrink: 0,
                    transition: 'max-height 0.1s ease',
                  }}
                  data-testid={`canvas-brand-logo-${i}`}
                />
              </span>
            ))}
            {/* STORY-47: Header brand logos — right-aligned, fixed 32px height */}
            {headerBrandLogoDataUris && headerBrandLogoDataUris.length > 0 && (
              <div
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                data-testid="header-brand-logos"
              >
                {headerBrandLogoDataUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT).map((src, i) => (
                  <span
                    key={i}
                    className="brand-logo-compat inline-block rounded overflow-hidden"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <img
                      src={src}
                      alt="Brand"
                      style={{
                        height: `${HEADER_BRAND_LOGO_HEIGHT_PX}px`,
                        maxWidth: `${HEADER_BRAND_LOGO_MAX_WIDTH_PX}px`,
                        objectFit: 'contain',
                      }}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resize handle — drag down/up to change logo height */}
          <div
            onMouseDown={startLogoResize}
            data-testid="logo-resize-handle"
            className="mx-3 flex cursor-ns-resize items-center justify-center gap-1 rounded-md py-0.5 transition hover:bg-white/5"
            title={`Logo height: ${logoHeight}px — drag to resize`}
          >
            <div className="h-0.5 w-8 rounded-full" style={{ background: colors.borderColor }} />
            <span className="text-[9px] select-none" style={{ color: colors.labelText }}>{logoHeight}px</span>
            <div className="h-0.5 w-8 rounded-full" style={{ background: colors.borderColor }} />
          </div>

          {/* Size slider */}
          <div className="flex items-center gap-2 px-3 pb-2 pt-1">
            <input
              type="range"
              min={MIN_LOGO_HEIGHT}
              max={MAX_LOGO_HEIGHT}
              step={2}
              value={logoHeight}
              onChange={(e) => onLogoHeightChange?.(Number(e.target.value))}
              className="flex-1 accent-orange-500 cursor-pointer"
              aria-label="Logo height"
              data-testid="logo-height-slider"
            />
            <input
              type="number"
              min={MIN_LOGO_HEIGHT}
              max={MAX_LOGO_HEIGHT}
              value={logoHeight}
              onChange={(e) => {
                const v = Math.min(MAX_LOGO_HEIGHT, Math.max(MIN_LOGO_HEIGHT, Number(e.target.value) || DEFAULT_LOGO_HEIGHT));
                onLogoHeightChange?.(v);
              }}
              className="w-12 rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-center text-xs focus:border-orange-500/50 focus:outline-none"
              style={{ color: colors.text }}
              aria-label="Logo height value"
              data-testid="logo-height-input"
            />
            <span className="text-[10px] select-none" style={{ color: colors.labelText }}>px</span>
          </div>
        </div>
      )}

      {/* Ordered blocks */}
      {elementOrder.map((key, idx) => (
        <CanvasBlock
          key={key}
          label={elementLabels[key]}
          elementKey={key}
          onDragStart={() => handleDragStart(idx)}
          onDrop={() => handleDrop(idx)}
          labelColor={colors.labelText}
        >
          {renderContent(key)}
        </CanvasBlock>
      ))}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm" style={{ color: colors.textMuted }}>Your ad will appear here.</p>
          <p className="mt-1 text-xs" style={{ color: colors.labelText }}>
            Upload a logo or add products to get started, then edit text directly above.
          </p>
        </div>
      )}

      {/* Figma-style tab-based panel system */}
      <div className="border-t border-border bg-background flex flex-col max-h-96">
        <PanelTabBar
          activeTab={activePanel}
          onTabChange={setActivePanel}
          productCount={products.length}
          unreadMessages={chatMessages?.length}
        />

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activePanel === 'chat' && (onChatSend && chatMessages !== undefined ? (
            <div className="h-full overflow-y-auto">
              <AgentChatPanel
                messages={chatMessages}
                onSend={onChatSend}
                pending={chatPending}
                error={chatError}
                model={chatModel}
                onModelChange={onChatModelChange ?? (() => undefined)}
                onUndo={onChatUndo ?? (() => undefined)}
                canUndo={canChatUndo}
                suggestionsEnabled={suggestionsEnabled}
                onSuggestionsToggle={onSuggestionsToggle}
                onApplySuggestion={onApplySuggestion}
                onDismissSuggestion={onDismissSuggestion}
              />
            </div>
          ) : onAiEditPrompt ? (
            <div className="p-3 h-full overflow-y-auto">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: colors.labelText }}>
                  Edit with AI
                </span>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const prompt = aiPromptText.trim();
                  if (!prompt || aiEditPending) return;
                  await onAiEditPrompt(prompt);
                  setAiPromptText('');
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  placeholder='Describe a change, e.g. "show product codes" or "make headline larger"'
                  disabled={aiEditPending}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs placeholder:text-gray-600 focus:border-orange-500/50 focus:outline-none disabled:opacity-50"
                  style={{ color: colors.text }}
                  data-testid="ai-edit-prompt-input"
                  maxLength={300}
                />
                <button
                  type="submit"
                  disabled={aiEditPending || !aiPromptText.trim()}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-400 disabled:opacity-40"
                  data-testid="ai-edit-prompt-submit"
                >
                  {aiEditPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {aiEditPending ? 'Thinking…' : 'Apply'}
                </button>
              </form>
              {aiEditError && (
                <p className="mt-1.5 text-[10px] text-red-400" data-testid="ai-edit-prompt-error">
                  {aiEditError}
                </p>
              )}
            </div>
          ) : null)}

          {activePanel === 'products' && (
            <div className="h-full overflow-y-auto">
              <ProductSelectionPanel
                allProducts={products}
                selectedProductIds={selectedProductIds}
                onSelectionChange={setSelectedProductIds}
                onCreateNewAd={handleCreateNewAd}
                isCreatingAd={isCreatingNewAd}
                creationError={creationError}
              />
            </div>
          )}

          {activePanel === 'export' && (
            <div className="h-full overflow-y-auto p-4">
              <ExportPanel canvasElementId="ad-preview-canvas" adName="ad-creative" />
            </div>
          )}

          {activePanel === 'settings' && (
            <div className="h-full overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Settings</h3>
                  <p className="text-xs text-muted-foreground">Additional settings coming soon</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-agent suggestions overlay */}
      {multiAgentSuggestions && (
        <MultiAgentSuggestionPanel
          result={multiAgentSuggestions}
          isLoading={multiAgentPending}
          error={multiAgentError}
          onApplySuggestion={(suggestion) => {
            onApplyMultiAgentSuggestion?.(suggestion);
          }}
          onDismissSuggestion={onDismissMultiAgentSuggestion ?? (() => {})}
        />
      )}

      {/* Mobile "Done" button — blurs focused input on small screens (STORY-37) */}
      {anyFocused && (
        <button
          type="button"
          className="fixed bottom-4 right-4 z-50 sm:hidden rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-lg active:bg-orange-600"
          onMouseDown={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement)?.blur();
            setAnyFocused(false);
          }}
          data-testid="canvas-done-button"
        >
          Done
        </button>
      )}
    </div>
  );
}
