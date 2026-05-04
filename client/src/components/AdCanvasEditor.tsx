/**
 * AdCanvasEditor — STORY-99 Canva-style visual redesign
 * Full-canvas WYSIWYG ad editor with neutral workspace background,
 * centered artboard card, and hover-revealed block controls.
 *
 * Lineage: STORY-41 (foundation), STORY-37 (adaptive contrast),
 * STORY-99 (Canva-style visual redesign).
 */
import React, { useRef, useState, useCallback } from 'react';
import { GripVertical, X, Plus, AlignLeft, AlignCenter, AlignRight, Sparkles, Loader2, Layers } from 'lucide-react';
import AgentChatPanel, { type AgentChatStarterPrompt } from './AgentChatPanel';
import MultiAgentSuggestionPanel from './MultiAgentSuggestionPanel';
import type { MultiAgentSuggestion, MultiAgentSuggestionResult } from '../lib/multi-agent-suggestions';
import ExportPanel from './ExportPanel';
import { HeaderFooterConfigPanel } from './HeaderFooterConfigPanel';
import { PanelTabBar, type PanelTab } from './PanelTabBar';
import ProductSelectionPanel from './ProductSelectionPanel';
import type { ProductSelectionCanvasScope } from '@/lib/product-selection-panel-filters';
import WorkspaceSettingsPanel from './WorkspaceSettingsPanel';
import ChatWorkspaceTools from './ChatWorkspaceTools';
import type { WorkspaceSettingsSectionId } from '@/lib/workspace-settings-sections';
import type { HeaderConfig, FooterConfig } from '../lib/ad-config-schema';
import type { ConversationMessage, ChatModelMode } from '../lib/agent-chat-engine';
import type { AgentAction } from '../lib/agent-actions';
import type { AdElementKey, ProductBlockOptions } from '../lib/ad-constants';
import type { ProductItem } from '../lib/ad-constants';
import type { SavedProductPhotoEntry } from '../lib/saved-product-photos';
import PhotoPickerPopover from './PhotoPickerPopover';
import ProductSlotModal from './ProductSlotModal';
import EmojiPickerPopover from './EmojiPickerPopover';
import type { FormatPreset, StyleOptions } from '../lib/ad-layouts/types';
import { computeEffectiveImageHeight } from '../lib/ad-layouts/shared';
import {
  FORMAT_PRESETS,
  MIN_TITLE_FONT_SIZE,
  MAX_TITLE_FONT_SIZE,
  TITLE_FONT_SIZE_PRESETS,
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
import { getPages } from '../lib/canvas-pages';

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
  /** STORY-209: Replace the catalog row backing this canvas slot (indices into full `selectionCatalogProducts`). */
  onSwapCanvasProduct?: (canvasIndex: number, sourceCatalogIndex: number) => void;
  /** STORY-209: For each canvas `products[i]`, the catalog row index in `selectionCatalogProducts` (parallel array). */
  templateProductCatalogIndices?: number[];
  /** STORY-210: Resolve thumbnail URL for a full-catalog row (e.g. Mobileland + imageDataUri). */
  getCatalogThumbnail?: (catalogIndex: number) => string | undefined;
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
  /** STORY-169: mute proactive API calls only for this browser session */
  proactiveSessionMuted?: boolean;
  onProactiveSessionMuteToggle?: () => void;
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
  /** STORY-127: Format for multi-page distribution (9 Story/Square, 4 Landscape per page). */
  format?: FormatPreset;
  /** STORY-127: When multi-page, one full-document HTML per page for export (PNG/HTML per page). */
  htmlPerPage?: string[];
  /** STORY-128: Controlled current page index (when provided with onCurrentPageChange). */
  currentPageIndex?: number;
  /** STORY-128: Called when user changes page in canvas; enables controlled mode with AgentChat. */
  onCurrentPageChange?: (index: number) => void;
  /** STORY-159: Full retail catalog for the Products tab list (defaults to canvas `products` if omitted). */
  selectionCatalogProducts?: ProductItem[];
  /** STORY-178: Settings → Import — replace catalog after API sync */
  onCatalogSync?: (products: ProductItem[]) => void;
  /** STORY-181: Shared catalog search string (Add Products + Products tab). */
  catalogSearchQuery?: string;
  onCatalogSearchQueryChange?: (q: string) => void;
  /** STORY-194: Last agent `catalog_filter` query — copy into Products search when tab opens. */
  lastAgentCatalogFilterQuery?: string;
  /** STORY-183: Collapsible search/brief/API tools above chat (retail promo). */
  showChatWorkspaceTools?: boolean;
  /** STORY-189: Intent starter chips (search / design / full ad) for chat empty state. */
  chatStarterPrompts?: AgentChatStarterPrompt[];
}

function CanvasBlock({
  label,
  elementKey,
  children,
  onDragStart,
  onDrop,
}: {
  label: string;
  elementKey: AdElementKey;
  children: React.ReactNode;
  onDragStart: () => void;
  onDrop: () => void;
  labelColor?: string;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      data-testid={`canvas-block-${elementKey}`}
      className="group/block relative rounded-lg transition-all duration-200 hover:ring-1 hover:ring-orange-400/30"
    >
      {/* Hover-revealed label pill + drag handle */}
      <div className="pointer-events-none absolute -top-2.5 left-3 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/block:opacity-100">
        <span className="pointer-events-auto flex cursor-grab items-center gap-1 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          <GripVertical className="h-3 w-3 text-gray-400" aria-hidden />
          {label}
        </span>
      </div>
      <div className="px-2 py-2">{children}</div>
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
  onSwapCanvasProduct,
  templateProductCatalogIndices,
  getCatalogThumbnail,
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
  proactiveSessionMuted = false,
  onProactiveSessionMuteToggle,
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
  format: formatProp,
  htmlPerPage,
  currentPageIndex: currentPageIndexProp,
  onCurrentPageChange,
  selectionCatalogProducts,
  onCatalogSync,
  catalogSearchQuery,
  onCatalogSearchQueryChange,
  lastAgentCatalogFilterQuery,
  showChatWorkspaceTools = false,
  chatStarterPrompts,
}: AdCanvasEditorProps) {
  const format = formatProp ?? FORMAT_PRESETS[0];
  const productBlockOptions = productBlockOptionsProp ?? DEFAULT_PRODUCT_BLOCK_OPTIONS;
  const dragIdxRef = useRef<number | null>(null);
  const [anyFocused, setAnyFocused] = useState(false);
  /** STORY-210: Single modal for “pick product” / “change photo” on canvas tile. */
  const [productSlotModalIdx, setProductSlotModalIdx] = useState<number | null>(null);
  /** STORY-127/128: Current page index — controlled when currentPageIndexProp + onCurrentPageChange provided. */
  const pages = React.useMemo(
    () => getPages(products.length, format, productBlockOptions.columns),
    [products.length, format, productBlockOptions.columns],
  );
  const [internalPageIndex, setInternalPageIndex] = useState(0);
  const isPageControlled = currentPageIndexProp !== undefined && onCurrentPageChange !== undefined;
  const currentPageIndex = isPageControlled ? currentPageIndexProp! : internalPageIndex;
  const setCurrentPageIndex = useCallback(
    (update: number | ((prev: number) => number)) => {
      const next = typeof update === 'function' ? update(isPageControlled ? currentPageIndexProp! : internalPageIndex) : update;
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      if (isPageControlled) onCurrentPageChange?.(clamped);
      else setInternalPageIndex(clamped);
    },
    [isPageControlled, currentPageIndexProp, internalPageIndex, pages.length, onCurrentPageChange],
  );
  React.useEffect(() => {
    if (currentPageIndex >= pages.length) {
      const clamped = Math.max(0, pages.length - 1);
      if (isPageControlled) onCurrentPageChange?.(clamped);
      else setInternalPageIndex(clamped);
    }
  }, [pages.length, currentPageIndex, isPageControlled, onCurrentPageChange]);
  const [aiPromptText, setAiPromptText] = useState('');
  const [activePanel, setActivePanel] = useState<PanelTab>('chat');
  /** STORY-171: which Settings accordion section is open (deep link from Products). STORY-179: may be null (all collapsed). */
  const [workspaceSettingsSection, setWorkspaceSettingsSection] =
    useState<WorkspaceSettingsSectionId | null>('connections');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  /** STORY-164: Persist while bottom tab !== products (panel unmounts). STORY-181: optional parent control. */
  const [internalProductPanelSearchQuery, setInternalProductPanelSearchQuery] = useState('');
  const catalogSearchControlled =
    catalogSearchQuery !== undefined && onCatalogSearchQueryChange !== undefined;
  const productPanelSearchQuery = catalogSearchControlled
    ? (catalogSearchQuery ?? '')
    : internalProductPanelSearchQuery;
  const setProductPanelSearchQuery = catalogSearchControlled
    ? onCatalogSearchQueryChange
    : setInternalProductPanelSearchQuery;
  /** STORY-194: When user switches to Products tab, mirror the last agent catalog_filter text into search. */
  const prevBottomPanelRef = useRef<PanelTab>(activePanel);
  React.useEffect(() => {
    const prev = prevBottomPanelRef.current;
    prevBottomPanelRef.current = activePanel;
    if (activePanel !== 'products' || prev === 'products') return;
    const q = lastAgentCatalogFilterQuery?.trim();
    if (!q) return;
    setProductPanelSearchQuery(q);
  }, [activePanel, lastAgentCatalogFilterQuery, setProductPanelSearchQuery]);
  /** STORY-206: default `not_on_canvas` preserves STORY-159 “remaining SKUs” workflow. */
  const [productPanelCanvasScope, setProductPanelCanvasScope] =
    useState<ProductSelectionCanvasScope>('not_on_canvas');
  /** STORY-208: default on — Products tab lists only search hits until user unchecks. */
  const [productPanelListOnlySearchMatches, setProductPanelListOnlySearchMatches] = useState(true);
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

  /** STORY-171: Open Settings tab on a specific accordion section (e.g. from Products). */
  const navigateToWorkspaceSettings = useCallback((section: WorkspaceSettingsSectionId) => {
    setWorkspaceSettingsSection(section);
    setActivePanel('settings');
  }, []);

  /* Logo state — use prop-controlled if provided, else internal fallback */
  const logoHeight = logoHeightProp ?? DEFAULT_LOGO_HEIGHT;
  const logoAlignment = logoAlignmentProp ?? 'center';
  const logoCompanion = logoCompanionProp ?? 'none';

  /* Product image height — prop-controlled or default (STORY-52) */
  const productImageHeight = productImageHeightProp ?? DEFAULT_PRODUCT_IMAGE_HEIGHT;

  /* Product block options — prop-controlled or default (STORY-56) */
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
    footer: 'Footer',
  };

  /* ── Element renderers ─────────────────────────────────────────── */

  const renderHeadline = () => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2" data-testid="headline-input-wrapper">
        {/* Emoji picker — click to open, search, grid (industry-standard) */}
        <EmojiPickerPopover
          value={emojiOrIcon}
          onChange={onEmojiOrIconChange}
          data-testid="emoji-picker"
          trigger={
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base transition hover:bg-black/5 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
              style={{ background: colors.borderColor }}
              title="Pick emoji"
              data-testid="canvas-emoji-button"
            >
              {emojiOrIcon || '○'}
            </button>
          }
        />
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
          className="min-w-0 flex-1 bg-transparent border-none outline-none leading-tight placeholder:opacity-30"
          data-testid="ad-option-headline"
        />
        <span className="shrink-0 text-[10px] tabular-nums text-gray-400" data-testid="headline-char-count">
          {headline.length}/{MAX_TITLE_LENGTH}
        </span>
      </div>
      {/* Font size — preset chips + direct number input (STORY-109) */}
      <div className="flex flex-wrap items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100" data-testid="font-size-control">
        <span className="shrink-0 text-[10px] font-medium" style={{ color: colors.labelText }}>Aa</span>
        {TITLE_FONT_SIZE_PRESETS.map((preset) => {
          const isActive = titleFontSize === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onTitleFontSizeChange(preset)}
              aria-label={`Font size ${preset}`}
              data-testid={`font-size-chip-${preset}`}
              className={`rounded border px-1.5 py-0.5 text-[10px] leading-none transition-colors ${
                isActive
                  ? 'border-orange-500 bg-orange-50 font-bold text-orange-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300'
              }`}
            >
              {preset}
            </button>
          );
        })}
        <input
          type="number"
          min={MIN_TITLE_FONT_SIZE}
          max={MAX_TITLE_FONT_SIZE}
          value={titleFontSize}
          onChange={(e) => {
            const v = Math.min(MAX_TITLE_FONT_SIZE, Math.max(MIN_TITLE_FONT_SIZE, Number(e.target.value) || MIN_TITLE_FONT_SIZE));
            onTitleFontSizeChange(v);
          }}
          className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-[10px] text-gray-600 focus:border-orange-400 focus:outline-none"
          aria-label="Headline font size value"
          data-testid="font-size-input"
        />
      </div>
    </div>
  );

  const renderBadge = () => (
    <div className="flex justify-center">
      <input
        type="text"
        value={badgeText}
        onChange={(e) => onBadgeTextChange(e.target.value.slice(0, MAX_BADGE_LENGTH))}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Badge text (e.g. 30% OFF)"
        maxLength={MAX_BADGE_LENGTH}
        className="rounded-full px-5 py-2 text-center text-sm font-extrabold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-white/50"
        style={{ background: style.accentColor, minWidth: '80px' }}
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
            className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
            data-testid={`cta-suggestion-${s.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="cta-buttons-list">
        {ctaButtons.map((btn, idx) => (
          <div key={idx} className="group/cta relative flex items-center">
            <input
              type="text"
              value={btn}
              onChange={(e) => updateCta(idx, e.target.value)}
              placeholder="Button text"
              maxLength={MAX_CTA_LENGTH}
              className="rounded-lg px-4 py-2.5 text-center text-sm font-extrabold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-white/50"
              style={{ background: style.accentColor, minWidth: '80px' }}
              data-testid={idx === 0 ? 'ad-option-cta' : `ad-option-cta-${idx}`}
            />
            {ctaButtons.length > 1 && (
              <button
                type="button"
                onClick={() => removeCta(idx)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition group-hover/cta:opacity-100 focus:outline-none"
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
          className="flex items-center gap-1 text-xs font-medium text-orange-500 transition hover:text-orange-600 focus:outline-none"
          data-testid="add-cta-button"
        >
          <Plus className="h-3.5 w-3.5" />
          Add button
        </button>
      )}
    </div>
  );

  const renderDisclaimer = () => (
    <input
      type="text"
      value={disclaimerText}
      onChange={(e) => onDisclaimerTextChange(e.target.value.slice(0, MAX_DISCLAIMER_LENGTH))}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder="Disclaimer / footer text (optional)"
      maxLength={MAX_DISCLAIMER_LENGTH}
      style={{ color: colors.textMuted, fontFamily: style.fontFamily }}
      className="w-full bg-transparent border-none text-center text-xs outline-none placeholder:opacity-30"
      data-testid="ad-option-disclaimer"
    />
  );

  /* STORY-109/127: FooterBar — follows canvas colors (same background as artboard, readable text). */
  const renderFooter = (): React.ReactNode => {
    if (!footer?.enabled) return null;
    const bg = style.backgroundColor;
    const fg = colors.text;
    const hasCompany = !!footer.companyName?.trim();
    const hasPhone = !!footer.contact?.phone?.trim();
    const hasWebsite = !!footer.contact?.website?.trim();
    const hasAddress = !!footer.contact?.address?.trim();
    const hasAnyField = hasCompany || hasPhone || hasWebsite || hasAddress;
    return (
      <div
        data-testid="canvas-footer-bar"
        style={{ background: bg, color: fg, padding: '8px 12px', borderRadius: '0 0 12px 12px', margin: '-20px -20px 0', fontSize: 11 }}
        className="flex items-center justify-between gap-3 text-[11px]"
      >
        <div className="flex flex-col gap-0.5">
          {hasCompany && (
            <span className="font-bold" data-testid="footer-display-company">
              {footer.companyName}
            </span>
          )}
          {hasAddress && (
            <span className="opacity-80" data-testid="footer-display-address">
              {footer.contact!.address}
            </span>
          )}
          {!hasAnyField && <span className="opacity-60">Company & contact</span>}
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          {hasPhone && (
            <span data-testid="footer-display-phone">{footer.contact!.phone}</span>
          )}
          {hasWebsite && (
            <span className="opacity-80" data-testid="footer-display-website">
              {footer.contact!.website}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    if (products.length === 0) {
      return (
        <p className="py-6 text-center text-xs text-gray-400">
          No products selected yet.
        </p>
      );
    }
    const { showFields } = productBlockOptions;
    const isMultiPage = pages.length > 1;
    const shownEntries: { product: ProductItem; globalIndex: number }[] = isMultiPage
      ? (pages[currentPageIndex]?.productIndices ?? []).map((globalIndex) => ({
          product: products[globalIndex]!,
          globalIndex,
        }))
      : (() => {
          const maxShow = productBlockOptions.maxProducts > 0 ? productBlockOptions.maxProducts : 0;
          const slice = maxShow > 0 ? products.slice(0, maxShow) : products;
          return slice.map((product, i) => ({ product, globalIndex: i }));
        })();
    const rest = products.length - shownEntries.length;
    const cols =
      productBlockOptions.columns > 0
        ? productBlockOptions.columns
        : getGridColumns(shownEntries.length);
    const rows = Math.ceil(shownEntries.length / Math.max(1, cols));
    const effectiveProductImageHeight = computeEffectiveImageHeight(format, rows, productImageHeight);

    const swapCatalog = selectionCatalogProducts ?? products;
    const canSwap =
      typeof onSwapCanvasProduct === 'function' &&
      Array.isArray(templateProductCatalogIndices) &&
      templateProductCatalogIndices.length === products.length &&
      swapCatalog.length > 0;
    const imageInteractive = Boolean(onAssignProductPhoto || canSwap);

    const handleImageAreaClick = (e: React.MouseEvent, globalIndex: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (canSwap && onAssignProductPhoto) {
        setOpenPickerIdx(null);
        setOpenSwapIdx(null);
        setImageSlotMenu({ idx: globalIndex, rect });
        setPickerRect(rect);
        return;
      }
      if (canSwap && !onAssignProductPhoto) {
        setOpenSwapIdx((prev) => (prev === globalIndex ? null : globalIndex));
        setPickerRect(rect);
        return;
      }
      if (onAssignProductPhoto) {
        setOpenPickerIdx((prev) => (prev === globalIndex ? null : globalIndex));
        setPickerRect(rect);
      }
    };

    const FIELD_TOGGLES: { key: keyof typeof showFields; label: string }[] = [
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Desc' },
      { key: 'originalPrice', label: 'Sale' },
      { key: 'discountBadge', label: 'Badge' },
      { key: 'brandLogo', label: 'Logo' },
    ];

    const ToolbarBtn = ({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) => (
      <button
        type="button"
        {...props}
        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
          active
            ? 'bg-orange-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        {children}
      </button>
    );

    return (
      <div className="space-y-2">
        {isMultiPage && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5 ring-1 ring-gray-200" data-testid="canvas-page-switcher">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPageIndex === 0}
              onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
              className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent"
              data-testid="canvas-page-prev"
            >
              ‹
            </button>
            <span className="min-w-[4ch] text-center text-xs font-medium text-gray-600 tabular-nums" data-testid="canvas-page-indicator">
              {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={currentPageIndex >= pages.length - 1}
              onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}
              className="rounded p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent"
              data-testid="canvas-page-next"
            >
              ›
            </button>
          </div>
        )}
        {/* Compact controls bar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-gray-50 px-2.5 py-2 ring-1 ring-gray-100">
          {!isMultiPage && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">Show</span>
            {([0, 3, 5, 10, 20] as const).map((n) => (
              <ToolbarBtn key={n} active={productBlockOptions.maxProducts === n} data-testid={n === 0 ? 'show-all-btn' : `show-${n}-btn`} onClick={() => setProductBlockField('maxProducts', n)}>
                {n === 0 ? 'All' : String(n)}
              </ToolbarBtn>
            ))}
          </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">Cols</span>
            {([0, 1, 2, 3, 4] as const).map((c) => (
              <ToolbarBtn key={c} active={productBlockOptions.columns === c} data-testid={`col-btn-${c}`} onClick={() => setProductBlockField('columns', c)}>
                {c === 0 ? 'Auto' : c}
              </ToolbarBtn>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">Fields</span>
            {FIELD_TOGGLES.map(({ key, label }) => (
              <ToolbarBtn key={key} active={showFields[key]} data-testid={`field-toggle-${key}`} onClick={() => setShowField(key, !showFields[key])}>
                {label}
              </ToolbarBtn>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">Show</span>
            <ToolbarBtn
              active={productBlockOptions.showProductCount !== false}
              data-testid="show-product-count-btn"
              onClick={() => setProductBlockField('showProductCount', productBlockOptions.showProductCount === false)}
            >
              Count
            </ToolbarBtn>
          </div>
        </div>

        {/* Photo size slider */}
        <div className="flex items-center gap-2 opacity-60 transition-opacity hover:opacity-100" data-testid="product-image-size-control">
          <span className="shrink-0 text-[10px] font-medium text-gray-400">Photo</span>
          <input
            type="range"
            min={MIN_PRODUCT_IMAGE_HEIGHT}
            max={MAX_PRODUCT_IMAGE_HEIGHT}
            step={4}
            value={productImageHeight}
            onChange={(e) => onProductImageHeightChange?.(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-orange-500"
            aria-label="Product image size"
            data-testid="product-image-size-slider"
          />
          <input
            type="number"
            min={MIN_PRODUCT_IMAGE_HEIGHT}
            max={MAX_PRODUCT_IMAGE_HEIGHT}
            value={productImageHeight}
            onChange={(e) => {
              const v = Math.min(MAX_PRODUCT_IMAGE_HEIGHT, Math.max(MIN_PRODUCT_IMAGE_HEIGHT, Number(e.target.value) || DEFAULT_PRODUCT_IMAGE_HEIGHT));
              onProductImageHeightChange?.(v);
            }}
            className="w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-[10px] text-gray-600 focus:border-orange-400 focus:outline-none"
            aria-label="Product image size value"
            data-testid="product-image-size-input"
          />
        </div>

        {/* Product grid */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {shownEntries.map(({ product: p, globalIndex }) => (
            <div key={globalIndex} className="overflow-hidden rounded-lg border border-gray-100 bg-white p-1.5 shadow-sm transition hover:shadow-md">
              {/* Product image */}
              {showFields.image && (
                p.imageDataUri ? (
                  <div
                    className="group/img relative w-full overflow-hidden rounded-md bg-gray-50"
                    style={{ height: `${effectiveProductImageHeight}px`, cursor: imageInteractive ? 'pointer' : 'default' }}
                    data-testid={`product-image-wrap-${globalIndex}`}
                    onClick={imageInteractive ? (e) => handleImageAreaClick(e, globalIndex) : undefined}
                    title={
                      canSwap && onAssignProductPhoto
                        ? 'Photo or swap product'
                        : canSwap
                          ? 'Swap product from catalog'
                          : onAssignProductPhoto
                            ? 'Click to change photo'
                            : undefined
                    }
                  >
                    <img
                      src={p.imageDataUri}
                      alt={p.name}
                      className="h-full w-full object-contain"
                      referrerPolicy={/^https?:\/\//i.test(p.imageDataUri) ? 'no-referrer' : undefined}
                    />
                    {imageInteractive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/img:bg-black/30">
                        <span className="text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover/img:opacity-100">
                          {canSwap && onAssignProductPhoto ? 'Choose' : canSwap ? 'Swap' : 'Change'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex w-full flex-col items-center justify-center gap-0.5 rounded-md border-[1.5px] border-dashed transition"
                    style={{
                      height: `${effectiveProductImageHeight}px`,
                      borderColor: imageInteractive ? '#f97316' : '#e5e7eb',
                      background: imageInteractive ? '#fff7ed' : '#f9fafb',
                      cursor: imageInteractive ? 'pointer' : 'default',
                    }}
                    data-testid={`product-no-image-${globalIndex}`}
                    onClick={imageInteractive ? (e) => handleImageAreaClick(e, globalIndex) : undefined}
                    title={
                      canSwap && onAssignProductPhoto
                        ? 'Photo or swap product'
                        : canSwap
                          ? 'Swap product from catalog'
                          : onAssignProductPhoto
                            ? 'Click to add photo'
                            : undefined
                    }
                  >
                    <span className="text-sm">📷</span>
                    <span className={`text-[9px] font-medium ${imageInteractive ? 'text-orange-500' : 'text-gray-400'}`}>
                      {canSwap && !onAssignProductPhoto
                        ? 'Swap'
                        : onAssignProductPhoto
                          ? 'Add photo'
                          : 'No img'}
                    </span>
                  </div>
                )
              )}

              {openPickerIdx === globalIndex && pickerRect && onAssignProductPhoto && (
                <PhotoPickerPopover
                  productIndex={globalIndex}
                  productName={p.name}
                  productCode={p.code}
                  productPrice={p.retailPrice ?? p.price}
                  savedPhotos={savedProductPhotos}
                  onAssign={(dataUri) => { onAssignProductPhoto(globalIndex, dataUri); setOpenPickerIdx(null); }}
                  onUploadAndSave={(file) => { onUploadProductPhoto?.(globalIndex, file); setOpenPickerIdx(null); }}
                  onClose={() => setOpenPickerIdx(null)}
                  anchorRect={pickerRect}
                />
              )}

              {/* Card details */}
              <div className="mt-1.5 space-y-0.5 px-0.5">
                {showFields.brandLogo && p.brandLogoDataUri && (
                  <img src={p.brandLogoDataUri} alt="Brand" className="h-3.5 max-w-[56px] object-contain" />
                )}
                {showFields.code && p.code && (
                  <p className="text-[9px] text-gray-400">{p.code}</p>
                )}
                {showFields.name && (
                  <p className="truncate text-[11px] font-semibold leading-tight text-gray-800">{p.name}</p>
                )}
                {showFields.description && p.description && (
                  <p className="text-[9px] leading-snug text-gray-500">{p.description.slice(0, 60)}</p>
                )}
                {showFields.originalPrice && p.originalPrice && (
                  <p className="text-[9px] text-gray-400 line-through">
                    {p.originalPrice}{p.currency ? ` ${p.currency}` : ''}
                  </p>
                )}
                {showFields.price && (p.discountPrice ?? p.price) && (
                  <p className="text-xs font-extrabold" style={{ color: style.accentColor }}>
                    {p.discountPrice ?? p.price}{p.currency ? ` ${p.currency}` : ''}
                  </p>
                )}
                {showFields.discountBadge && typeof p.discountPercent === 'number' && (
                  <span
                    className="inline-block rounded-full px-1.5 py-px text-[9px] font-bold text-white"
                    style={{ background: style.accentColor }}
                  >
                    -{Math.abs(p.discountPercent)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {imageSlotMenu && (
          <ProductImageSlotMenuPopover
            anchorRect={imageSlotMenu.rect}
            showChangePhoto={Boolean(onAssignProductPhoto)}
            showSwapProduct={canSwap}
            onClose={() => setImageSlotMenu(null)}
            onChangePhoto={() => {
              const m = imageSlotMenu;
              setImageSlotMenu(null);
              setOpenPickerIdx(m.idx);
              setPickerRect(m.rect);
            }}
            onSwapProduct={() => {
              const m = imageSlotMenu;
              setImageSlotMenu(null);
              setOpenSwapIdx(m.idx);
              setPickerRect(m.rect);
            }}
          />
        )}
        {openSwapIdx !== null && pickerRect && canSwap && (
          <ProductSwapPopover
            catalog={swapCatalog}
            searchQuery={productPanelSearchQuery}
            onSearchQueryChange={setProductPanelSearchQuery}
            listOnlySearchMatches={productPanelListOnlySearchMatches}
            excludeCatalogIndex={templateProductCatalogIndices?.[openSwapIdx] ?? null}
            onPick={(sourceIdx) => {
              onSwapCanvasProduct?.(openSwapIdx, sourceIdx);
              setOpenSwapIdx(null);
            }}
            onClose={() => setOpenSwapIdx(null)}
            anchorRect={pickerRect}
          />
        )}
        {productBlockOptions.showProductCount !== false && (
          <>
            {rest > 0 && (
              <p className="text-center text-[10px] text-gray-400" data-testid="canvas-more-label">
                {isMultiPage
                  ? `${rest} on next page${pages.length - currentPageIndex - 1 !== 1 ? 's' : ''} — use ‹ › to switch`
                  : `+${rest} more`}
              </p>
            )}
            <p className="text-center text-[10px] text-gray-400" data-testid="canvas-product-count">
              {isMultiPage
                ? `Page ${currentPageIndex + 1}: ${shownEntries.length} of ${products.length} products`
                : `${products.length} product${products.length !== 1 ? 's' : ''}`}
            </p>
          </>
        )}
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

  /* ── Main render ──────────────────────────────────────────────── */
  return (
    <div
      className="flex min-h-full flex-col bg-neutral-100"
      data-testid="ad-canvas-editor"
    >
      {/* ── Workspace area with centered artboard ─────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="mx-auto w-full max-w-2xl rounded-xl shadow-lg ring-1 ring-black/[0.06]"
          style={{ background: style.backgroundColor, fontFamily: style.fontFamily }}
        >
          <div className="flex flex-col gap-2 p-5">

      {/* Company + brand logos — hover-revealed controls (STORY-43 / STORY-99) */}
      {(companyLogoDataUri || brandLogoDataUris.length > 0) && (
        <div
          className="group/logo relative rounded-lg transition-all duration-200 hover:ring-1 hover:ring-orange-400/30"
          data-testid="canvas-logo-block"
        >
          {/* Hover-revealed controls toolbar */}
          <div className="pointer-events-none absolute -top-2.5 left-3 right-3 z-10 flex items-center justify-between opacity-0 transition-opacity duration-150 group-hover/logo:pointer-events-auto group-hover/logo:opacity-100">
            <div className="flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-0.5 shadow-sm ring-1 ring-black/5 backdrop-blur-sm" data-testid="logo-alignment-group">
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
                  className={`rounded p-1 transition ${logoAlignment === id ? 'bg-orange-100 text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
            <select
              value={logoCompanion}
              onChange={(e) => onLogoCompanionChange?.(e.target.value as LogoCompanion)}
              className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] text-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm focus:outline-none"
              data-testid="logo-companion-picker"
              aria-label="Element beside logo"
            >
              <option value="none">+ Beside logo</option>
              <option value="headline">Headline</option>
              <option value="badge">Badge</option>
              <option value="emoji">Emoji</option>
            </select>
          </div>

          {/* Logo row */}
          <div
            className="flex flex-wrap items-center gap-3 px-3 py-3"
            style={{
              justifyContent: logoAlignment === 'left' ? 'flex-start' : logoAlignment === 'right' ? 'flex-end' : 'center',
            }}
            data-testid="canvas-logo-row"
          >
            {companyLogoDataUri && (
              <span className="inline-block overflow-hidden rounded-lg" data-testid="canvas-company-logo-wrap">
                <img
                  src={companyLogoDataUri}
                  alt="Company logo"
                  className="shrink-0 object-contain transition-all duration-100"
                  style={{ maxHeight: `${logoHeight}px`, maxWidth: `${Math.round(logoHeight * 3.75)}px` }}
                />
              </span>
            )}
            {logoCompanion === 'headline' && (
              <input
                type="text"
                value={headline}
                onChange={(e) => onHeadlineChange(e.target.value.slice(0, 60))}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Headline beside logo…"
                className="min-w-[80px] max-w-[200px] border-none bg-transparent outline-none placeholder:opacity-30"
                style={{
                  fontSize: `${Math.max(14, Math.min(28, Math.round(logoHeight * 0.45)))}px`,
                  fontWeight: 800,
                  color: colors.text,
                  fontFamily: style.fontFamily,
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
                className="rounded-full px-3.5 py-1 text-center text-sm font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-white/40 placeholder:text-white/50"
                style={{ background: style.accentColor, minWidth: '60px' }}
                data-testid="logo-companion-badge-input"
              />
            )}
            {logoCompanion === 'emoji' && (
              <EmojiPickerPopover
                value={emojiOrIcon}
                onChange={onEmojiOrIconChange}
                data-testid="logo-companion-emoji-picker"
                trigger={
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1.5 leading-none transition hover:bg-black/5 focus:outline-none focus:ring-1 focus:ring-orange-400/40"
                    style={{ fontSize: `${Math.max(20, logoHeight - 16)}px` }}
                    title="Pick emoji"
                    data-testid="logo-companion-emoji-button"
                  >
                    {emojiOrIcon || '○'}
                  </button>
                }
              />
            )}
            {brandLogoDataUris.map((dataUri, i) => (
              <span key={i} className="inline-block overflow-hidden rounded-lg" data-testid={`canvas-brand-logo-wrap-${i}`}>
                <img
                  src={dataUri}
                  alt=""
                  className="shrink-0 object-contain transition-all duration-100"
                  style={{ maxHeight: `${logoHeight}px`, maxWidth: `${Math.round(logoHeight * 3.75)}px` }}
                  data-testid={`canvas-brand-logo-${i}`}
                />
              </span>
            ))}
            {headerBrandLogoDataUris && headerBrandLogoDataUris.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2.5" data-testid="header-brand-logos">
                {headerBrandLogoDataUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT).map((src, i) => (
                  <span key={i} className="inline-block overflow-hidden rounded">
                    <img src={src} alt="Brand" className="object-contain" style={{ height: `${HEADER_BRAND_LOGO_HEIGHT_PX}px`, maxWidth: `${HEADER_BRAND_LOGO_MAX_WIDTH_PX}px` }} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Compact resize — hover-revealed */}
          <div
            onMouseDown={startLogoResize}
            data-testid="logo-resize-handle"
            className="mx-auto flex w-16 cursor-ns-resize items-center justify-center rounded-b-lg py-1 opacity-0 transition-opacity group-hover/logo:opacity-100"
            title={`Logo height: ${logoHeight}px — drag to resize`}
          >
            <div className="h-0.5 w-8 rounded-full bg-gray-300" />
          </div>

          {/* Size slider — hover-revealed */}
          <div className="pointer-events-none mx-3 flex items-center gap-2 pb-2 pt-0.5 opacity-0 transition-opacity group-hover/logo:pointer-events-auto group-hover/logo:opacity-100">
            <input
              type="range"
              min={MIN_LOGO_HEIGHT}
              max={MAX_LOGO_HEIGHT}
              step={2}
              value={logoHeight}
              onChange={(e) => onLogoHeightChange?.(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-orange-500"
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
              className="w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-[10px] text-gray-600 focus:border-orange-400 focus:outline-none"
              aria-label="Logo height value"
              data-testid="logo-height-input"
            />
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
        >
          {renderContent(key)}
        </CanvasBlock>
      ))}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 ring-1 ring-orange-200/60">
            <Layers className="h-7 w-7 text-orange-400" aria-hidden />
          </div>
          <p className="text-sm font-medium text-gray-500">Start building your ad</p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">
            Upload a logo, add products, or describe your design to the AI assistant below.
          </p>
        </div>
      )}

          {/* STORY-109: Footer band — always last, inside padded area so margin -20px aligns to card edges */}
          {renderFooter()}
          </div>{/* end .flex.flex-col.gap-2.p-5 */}
        </div>{/* end artboard card */}
      </div>{/* end workspace scroll area */}

      {/* Figma-style tab-based panel system */}
      <div className="border-t border-border bg-background flex flex-col flex-1 min-h-0">
        <PanelTabBar
          activeTab={activePanel}
          onTabChange={setActivePanel}
          productCount={products.length}
          unreadMessages={chatMessages?.length}
        />

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activePanel === 'chat' && (onChatSend && chatMessages !== undefined ? (
            <div className="flex h-full min-h-0 flex-col">
              {showChatWorkspaceTools ? (
                <ChatWorkspaceTools
                  onOpenSettingsSection={(id) => {
                    setWorkspaceSettingsSection(id);
                    setActivePanel('settings');
                  }}
                />
              ) : null}
              <div className="min-h-0 flex-1 flex flex-col">
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
                  proactiveSessionMuted={proactiveSessionMuted}
                  onProactiveSessionMuteToggle={onProactiveSessionMuteToggle}
                  onApplySuggestion={onApplySuggestion}
                  onDismissSuggestion={onDismissSuggestion}
                  starterPrompts={chatStarterPrompts}
                />
              </div>
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
                allProducts={selectionCatalogProducts ?? products}
                namesOnCanvas={products.map((p) => p.name)}
                selectedProductIds={selectedProductIds}
                onSelectionChange={setSelectedProductIds}
                onCreateNewAd={handleCreateNewAd}
                isCreatingAd={isCreatingNewAd}
                creationError={creationError}
                searchQuery={productPanelSearchQuery}
                onSearchQueryChange={setProductPanelSearchQuery}
                canvasScope={productPanelCanvasScope}
                onCanvasScopeChange={setProductPanelCanvasScope}
                listOnlySearchMatches={productPanelListOnlySearchMatches}
                onListOnlySearchMatchesChange={setProductPanelListOnlySearchMatches}
                onNavigateToWorkspaceSettings={navigateToWorkspaceSettings}
              />
            </div>
          )}

          {activePanel === 'export' && (
            <div className="h-full overflow-y-auto p-4">
              <ExportPanel
                canvasElementId="ad-preview-canvas"
                adName="ad-creative"
                htmlPerPage={htmlPerPage}
                exportFormat={format}
                klingCanvas={{
                  products: products.map((p) => ({
                    name: p.name,
                    category: p.category,
                    brand: p.brand,
                  })),
                  headline,
                  cta: ctaButtons.map((b) => b.trim()).filter(Boolean).join(' · ') || undefined,
                  formatLabel: format.label,
                  formatWidth: format.width,
                  formatHeight: format.height,
                }}
                klingAnimate={htmlPerPage && htmlPerPage.length > 0 ? {
                  html: htmlPerPage[0],
                  width: format.width,
                  height: format.height,
                } : undefined}
                klingImageGen={{
                  aspectRatio: format.width === format.height ? '1:1' : format.width > format.height ? '16:9' : '9:16',
                  productNames: products.slice(0, 5).map((p) => p.name),
                  category: products[0]?.category,
                }}
                klingEnhance={onAssignProductPhoto && products.length > 0 ? {
                  products: products.map((p) => ({
                    name: p.name,
                    category: p.category,
                    brand: p.brand,
                    imageDataUri: p.imageDataUri,
                  })),
                  onAssignImage: (canvasIdx, imageUrl) => {
                    onAssignProductPhoto(canvasIdx, imageUrl);
                  },
                  style: 'studio',
                } : undefined}
              />
            </div>
          )}

          {activePanel === 'settings' && (
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
              <WorkspaceSettingsPanel
                openSection={workspaceSettingsSection}
                onOpenSectionChange={setWorkspaceSettingsSection}
                onCatalogSync={onCatalogSync}
              />
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
