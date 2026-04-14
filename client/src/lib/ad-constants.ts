import type { FormatPreset, LayoutId, StyleOptions } from './ad-layouts/types';
import type { FooterConfig } from './ad-config-schema';

export interface ProductItem {
  name: string;
  code?: string;
  price?: string;
  retailPrice?: string;
  wholesalePrice?: string;
  currency?: string;
  /** Primary category; kept for backward compatibility. */
  category?: string;
  /** Second classification dimension (e.g. brand). */
  brand?: string;
  /** Extensible classification dimensions (e.g. region, channel). */
  classifications?: Record<string, string>;
  /** Optional short description (e.g. from AI); shown in ad card when present */
  description?: string;
  imageDataUri?: string;
  brandLogoDataUri?: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number;
}

export interface AdTemplateData {
  companyLogoDataUri?: string;
  products: ProductItem[];
  title?: string;
  /** Headline font size in px (16–72). Defaults to DEFAULT_TITLE_FONT_SIZE when omitted. */
  titleFontSize?: number;
  /** Optional CTA button text (single, legacy). Used when ctaButtons is empty. */
  ctaText?: string;
  /** Multiple CTA button texts (up to MAX_CTA_BUTTONS). Takes priority over ctaText when non-empty. */
  ctaButtons?: string[];
  /** Optional badge text (e.g. "20% OFF"). */
  badgeText?: string;
  /** Optional disclaimer/footer text. */
  disclaimerText?: string;
  /** Optional emoji/icon (single character or preset); rendered e.g. next to headline. */
  emojiOrIcon?: string;
  /** Render order of the five named blocks (STORY-40). Defaults to DEFAULT_ELEMENT_ORDER. */
  elementOrder?: AdElementKey[];
  /** Logo height in px. Clamped to MIN_LOGO_HEIGHT–MAX_LOGO_HEIGHT. Default DEFAULT_LOGO_HEIGHT. */
  logoHeight?: number;
  /** Logo horizontal alignment in the header row. Default 'center'. */
  logoAlignment?: 'left' | 'center' | 'right';
  /** Element rendered beside the logo in the same header row. Default 'none'. */
  logoCompanion?: 'none' | 'headline' | 'badge' | 'emoji';
  backgroundColor?: string;
  accentColor?: string;
  layout?: LayoutId;
  format?: FormatPreset;
  style?: Partial<StyleOptions>;
  /** Per-product-block options (STORY-56): columns, field visibility, image height, max products. */
  productBlockOptions?: ProductBlockOptions;
  /** STORY-47: Brand/partner logos shown in the ad header (max 5, fixed 32px height, right-aligned). */
  headerBrandLogoDataUris?: string[];
  /** STORY-109: Footer configuration. When enabled, a footer band is appended to the HTML output. */
  footer?: FooterConfig;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'viber-story',
    label: 'Viber / IG Story',
    width: 1080,
    height: 1920,
    icon: '📱',
  },
  {
    id: 'instagram-square',
    label: 'Instagram Post',
    width: 1080,
    height: 1080,
    icon: '📸',
  },
  {
    id: 'facebook-landscape',
    label: 'Facebook Ad',
    width: 1200,
    height: 628,
    icon: '🖥️',
  },
];

export const DEFAULT_STYLE: StyleOptions = {
  backgroundColor: '#f8fafc',
  accentColor: '#f97316',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

/** Max lengths for ad text (truncation / XSS / performance). STORY-35. */
export const MAX_TITLE_LENGTH = 200;
export const MAX_CTA_LENGTH = 80;
export const MAX_BADGE_LENGTH = 60;
export const MAX_DISCLAIMER_LENGTH = 300;

/** Headline font size constraints (STORY-39). */
export const MIN_TITLE_FONT_SIZE = 16;
export const MAX_TITLE_FONT_SIZE = 72;
export const DEFAULT_TITLE_FONT_SIZE = 32;

/** STORY-109: Quick-set chip presets for headline font size (matches Canva / Adobe Express). */
export const TITLE_FONT_SIZE_PRESETS = [16, 20, 24, 32, 48, 64] as const;

/** Maximum number of CTA buttons per ad (STORY-39). */
export const MAX_CTA_BUTTONS = 4;

export const MIN_LOGO_HEIGHT = 24;
export const MAX_LOGO_HEIGHT = 160;
export const DEFAULT_LOGO_HEIGHT = 64;

/** STORY-47: Header brand/partner logo constraints. */
export const HEADER_BRAND_LOGO_MAX_COUNT = 5;
export const HEADER_BRAND_LOGO_HEIGHT_PX = 32;
export const HEADER_BRAND_LOGO_MAX_WIDTH_PX = 80;

/** Product image height in the canvas editor (STORY-52). Range 40–300 px, default 80 px. */
export const MIN_PRODUCT_IMAGE_HEIGHT = 40;
export const MAX_PRODUCT_IMAGE_HEIGHT = 300;
export const DEFAULT_PRODUCT_IMAGE_HEIGHT = 80;

/** STORY-132: Preview/export image height range — fill space without breaking layout. */
export const PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN = 80;
export const PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX = 280;

/**
 * STORY-205 / industry manner: estimated vertical budget reserved for header, footer band, and padding
 * before product rows receive height in `computeEffectiveImageHeight` (`ad-layouts/shared.ts`).
 * Not literal measured pixels in DOM — a layout contract for available content height.
 * @see docs/industry-standard-manner.md
 */
export const INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX = 300;

/**
 * Per-product-block configuration (STORY-56).
 * Controls columns, visible fields, image height, and max product count.
 * STORY-144: showProductCount toggles visibility of "N products" and "+X more" / "X on next pages".
 */
export interface ProductBlockOptions {
  /** Products per row. 0 = auto-calculate based on count. */
  columns: 0 | 1 | 2 | 3 | 4;
  /** Max products to show. 0 = no limit. */
  maxProducts: number;
  /** Card image height in px. Propagated to both canvas and HTML renderer. */
  imageHeight: number;
  /** When false, hide the product count and "more on next pages" line under the grid. Default true. */
  showProductCount?: boolean;
  /** Which fields to show on each product card. */
  showFields: {
    image: boolean;
    code: boolean;
    name: boolean;
    description: boolean;
    originalPrice: boolean;
    price: boolean;
    discountBadge: boolean;
    brandLogo: boolean;
  };
}

export const DEFAULT_PRODUCT_BLOCK_OPTIONS: ProductBlockOptions = {
  columns: 0,
  maxProducts: 0,
  imageHeight: DEFAULT_PRODUCT_IMAGE_HEIGHT,
  showProductCount: true,
  showFields: {
    image: true,
    code: true,
    name: true,
    description: true,
    originalPrice: true,
    price: true,
    discountBadge: true,
    brandLogo: true,
  },
};

/**
 * Named blocks that can be reordered within a rendered ad (STORY-40).
 * 'products' is the product grid/cards block; the others are text elements.
 * 'footer' is always last and not drag-reorderable (STORY-109).
 */
export type AdElementKey = 'headline' | 'products' | 'badge' | 'cta' | 'disclaimer' | 'footer';

/** Default top-to-bottom render order: headline → products → badge → cta → disclaimer. */
export const DEFAULT_ELEMENT_ORDER: AdElementKey[] = [
  'headline',
  'products',
  'badge',
  'cta',
  'disclaimer',
];
