import type { AdTemplateData, ProductItem } from '../ad-templates';
import {
  MAX_TITLE_LENGTH,
  MAX_CTA_LENGTH,
  MAX_BADGE_LENGTH,
  MAX_DISCLAIMER_LENGTH,
  MIN_TITLE_FONT_SIZE,
  MAX_TITLE_FONT_SIZE,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_ELEMENT_ORDER,
  MIN_LOGO_HEIGHT,
  MAX_LOGO_HEIGHT,
  DEFAULT_LOGO_HEIGHT,
  HEADER_BRAND_LOGO_MAX_COUNT,
  HEADER_BRAND_LOGO_HEIGHT_PX,
  HEADER_BRAND_LOGO_MAX_WIDTH_PX,
  PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN,
  PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX,
  INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX,
} from '../ad-constants';
import type { FormatPreset, StyleOptions } from './types';

/**
 * STORY-132 / STORY-205: Effective product image height for preview/export — fills available space.
 * Uses format height minus {@link INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX}, divided by row count, with fraction for image (0.6).
 * Optional userImageHeight is treated as a minimum preference (expanded when there is extra space),
 * clamped to [MIN, MAX].
 */
export function computeEffectiveImageHeight(
  format: FormatPreset,
  rowCount: number,
  userImageHeight?: number
): number {
  const availableHeight = Math.max(0, format.height - INDUSTRY_VERTICAL_RESERVE_FOR_CHROME_PX);
  const rows = Math.max(1, rowCount);
  const perRow = availableHeight / rows;
  const fractionForImage = 0.6;
  const computed = Math.round(perRow * fractionForImage);
  // Industry manner: on tall formats allow images to fill space; cap is at least the computed fill size.
  const effectiveMax = Math.max(PRODUCT_IMAGE_HEIGHT_PREVIEW_MAX, computed);
  const clamped = Math.min(
    effectiveMax,
    Math.max(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN, computed)
  );
  if (userImageHeight != null && Number.isFinite(userImageHeight)) {
    const userClamped = Math.min(
      effectiveMax,
      Math.max(PRODUCT_IMAGE_HEIGHT_PREVIEW_MIN, Math.round(userImageHeight))
    );
    // Industry manner: if there is extra space, photos should grow rather than leaving unused space.
    // Slider becomes the minimum; the algorithm can expand based on available height + rowCount.
    return Math.max(userClamped, clamped);
  }
  return clamped;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Adaptive text color for readable contrast on varying backgrounds. */
function getTextColorForBackground(bgHex: string): string {
  const hex = (bgHex?.startsWith('#') ? bgHex : '#f8fafc').replace('#', '');
  if (hex.length < 6) return '#111827';
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance < 0.179 ? '#f1f5f9' : '#111827';
}

export function renderDocument(
  format: FormatPreset,
  style: StyleOptions,
  content: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${format.width}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${format.width}px;
      height: ${format.height}px;
      display: flex;
      flex-direction: column;
      font-family: ${style.fontFamily};
      background: ${style.backgroundColor};
      color: ${getTextColorForBackground(style.backgroundColor)};
    }
    /* STORY-48: logo–background compatibility (rounded corners + subtle shadow on light/dark) */
    .logo-compat { display: inline-block; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .logo-compat img { display: block; vertical-align: middle; }
    .brand-logo-compat { display: inline-block; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .brand-logo-compat img { display: block; vertical-align: middle; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * STORY-47: Renders a row of brand/partner logos for the ad header.
 * Max 5 logos, fixed 32px height, 80px max-width each.
 */
export function renderHeaderBrandLogos(dataUris: string[]): string {
  const uris = dataUris.slice(0, HEADER_BRAND_LOGO_MAX_COUNT).filter(Boolean);
  if (uris.length === 0) return '';
  const imgs = uris
    .map(
      (src) =>
        `<span class="brand-logo-compat"><img src="${src}" alt="Brand" style="height:${HEADER_BRAND_LOGO_HEIGHT_PX}px;max-width:${HEADER_BRAND_LOGO_MAX_WIDTH_PX}px;object-fit:contain;" /></span>`,
    )
    .join('');
  return `<div class="header-brand-logos" data-testid="header-brand-logos" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">${imgs}</div>`;
}

export function renderCompanyLogo(data: AdTemplateData): string {
  if (!data.companyLogoDataUri) return '';

  const h = Math.min(MAX_LOGO_HEIGHT, Math.max(MIN_LOGO_HEIGHT, data.logoHeight ?? DEFAULT_LOGO_HEIGHT));
  const maxW = Math.round(h * 3.75);
  const align = data.logoAlignment ?? 'center';
  const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const justify = justifyMap[align] ?? 'center';
  const companion = data.logoCompanion ?? 'none';

  const logoImg = `<span class="logo-compat"><img src="${data.companyLogoDataUri}" alt="Company Logo" style="max-height:${h}px;max-width:${maxW}px;object-fit:contain;flex-shrink:0;" /></span>`;

  let companionHtml = '';
  if (companion === 'headline' && data.title?.trim()) {
    const fs = Math.max(16, Math.min(32, Math.round(h * 0.45)));
    companionHtml = `<div style="font-size:${fs}px;font-weight:800;color:inherit;line-height:1.2;">${escapeHtml(data.title.slice(0, 60))}</div>`;
  } else if (companion === 'badge' && data.badgeText?.trim()) {
    const accentColor = data.accentColor ?? '#f97316';
    companionHtml = `<span style="display:inline-block;padding:6px 14px;background:${accentColor};color:#fff;font-size:14px;font-weight:800;border-radius:999px;">${escapeHtml(data.badgeText.slice(0, MAX_BADGE_LENGTH))}</span>`;
  } else if (companion === 'emoji' && data.emojiOrIcon?.trim()) {
    const emojiSize = Math.max(24, h - 12);
    companionHtml = `<span style="font-size:${emojiSize}px;line-height:1;">${escapeHtml(data.emojiOrIcon.trim().slice(0, 4))}</span>`;
  }

  const inner = companionHtml
    ? `${logoImg}<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;">${companionHtml}</div>`
    : logoImg;

  // STORY-47: Include header brand logos right-aligned in the same company logo row.
  const brandLogosHtml = data.headerBrandLogoDataUris?.length
    ? renderHeaderBrandLogos(data.headerBrandLogoDataUris)
    : '';
  const fullInner = brandLogosHtml
    ? `${inner}<div style="margin-left:auto;">${brandLogosHtml}</div>`
    : inner;

  return `<div class="company-logo" style="display:flex;align-items:center;justify-content:${justify};gap:14px;padding:24px 24px 12px;flex-wrap:wrap;">${fullInner}</div>`;
}

export function renderTitle(data: AdTemplateData): string {
  if (!data.title && !data.emojiOrIcon) return '';
  const raw = data.titleFontSize ?? DEFAULT_TITLE_FONT_SIZE;
  const fontSize = Math.min(MAX_TITLE_FONT_SIZE, Math.max(MIN_TITLE_FONT_SIZE, Math.round(raw)));
  const emoji = data.emojiOrIcon?.trim() ? `<span style="margin-right:6px;">${escapeHtml(data.emojiOrIcon.trim().slice(0, 4))}</span>` : '';
  const titleText = data.title ? escapeHtml(data.title.slice(0, MAX_TITLE_LENGTH)) : '';
  const content = emoji + titleText;
  if (!content) return '';
  return `<div style="text-align:center;font-size:${fontSize}px;font-weight:800;color:inherit;padding:8px 24px 20px;line-height:1.2;">${content}</div>`;
}

export function renderCta(data: AdTemplateData, accentColor: string): string {
  // Resolve button texts: ctaButtons[] takes priority; fall back to legacy ctaText
  const buttons: string[] = [];
  if (data.ctaButtons && data.ctaButtons.length > 0) {
    for (const b of data.ctaButtons) {
      const t = b.trim().slice(0, MAX_CTA_LENGTH);
      if (t) buttons.push(t);
    }
  }
  if (buttons.length === 0 && data.ctaText?.trim()) {
    buttons.push(data.ctaText.trim().slice(0, MAX_CTA_LENGTH));
  }
  if (buttons.length === 0) return '';
  const btns = buttons
    .map(
      (text) =>
        `<a href="#" style="display:inline-block;padding:14px 28px;background:${accentColor};color:#fff;font-size:18px;font-weight:800;border-radius:12px;text-decoration:none;white-space:nowrap;">${escapeHtml(text)}</a>`,
    )
    .join('');
  return `<div style="text-align:center;padding:12px 24px 20px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">${btns}</div>`;
}

export function renderBadge(data: AdTemplateData, accentColor: string): string {
  if (!data.badgeText?.trim()) return '';
  const text = data.badgeText.trim().slice(0, MAX_BADGE_LENGTH);
  return `<div style="text-align:center;padding:8px 24px 0;"><span style="display:inline-block;padding:8px 16px;background:${accentColor};color:#fff;font-size:16px;font-weight:800;border-radius:999px;">${escapeHtml(text)}</span></div>`;
}

export function renderDisclaimer(data: AdTemplateData): string {
  if (!data.disclaimerText?.trim()) return '';
  const text = data.disclaimerText.trim().slice(0, MAX_DISCLAIMER_LENGTH);
  return `<div style="text-align:center;font-size:12px;color:#6b7280;padding:12px 24px 24px;line-height:1.4;">${escapeHtml(text)}</div>`;
}

/** Renders optional CTA + badge + disclaimer strip (only when at least one is set). */
export function renderAdOptionsStrip(data: AdTemplateData, accentColor: string): string {
  const badge = renderBadge(data, accentColor);
  const cta = renderCta(data, accentColor);
  const disclaimer = renderDisclaimer(data);
  if (!badge && !cta && !disclaimer) return '';
  return [badge, cta, disclaimer].join('');
}

/**
 * Renders the five named ad blocks in the user-defined order (STORY-40).
 *
 * @param data          - full ad template data (contains elementOrder)
 * @param accentColor   - resolved accent colour
 * @param productsHtml  - already-rendered product grid/cards HTML string from the layout renderer
 */
export function renderOrderedElements(
  data: AdTemplateData,
  accentColor: string,
  productsHtml: string,
): string {
  const order = data.elementOrder ?? DEFAULT_ELEMENT_ORDER;
  return order
    .map((key) => {
      switch (key) {
        case 'headline':
          return renderTitle(data);
        case 'products':
          return productsHtml;
        case 'badge':
          return renderBadge(data, accentColor);
        case 'cta':
          return renderCta(data, accentColor);
        case 'disclaimer':
          return renderDisclaimer(data);
        default:
          return '';
      }
    })
    .join('');
}

export function renderBrandLogo(product: ProductItem): string {
  if (!product.brandLogoDataUri) return '';
  return `<span class="brand-logo-compat"><img src="${product.brandLogoDataUri}" alt="Brand" style="height:24px;max-width:96px;object-fit:contain;" /></span>`;
}

/**
 * STORY-151: Aspect-ratio intelligence — blurred background ("Spotify trick").
 * STORY-152: Premium placeholder (accent-tinted gradient + camera icon) when no image.
 *            html2canvas compat: explicit top/left/right/bottom instead of inset shorthand.
 *
 * When imageDataUri is present: renders a blurred+scaled background layer and a crisp
 * contain-fitted foreground layer, making any aspect ratio look premium without cropping.
 *
 * When imageDataUri is absent: renders an accent-tinted gradient with a camera SVG icon
 * that visually integrates with the ad's color identity — no "No image" text.
 *
 * Note: filter:blur() is not supported by html2canvas; in exported PNGs the background
 * layer renders as a sharp cover image (still looks coherent). scale(1.15) prevents the
 * blur-edge ring artefact in browser rendering.
 */
export function renderImage(product: ProductItem, heightPx: number, accentColor = '#f97316'): string {
  if (product.imageDataUri) {
    const uri = product.imageDataUri;
    const alt = escapeHtml(product.name);
    /** STORY-155: external CDN may block cross-site Referer; helps storefront hotlink rules */
    const extRef = /^https?:\/\//i.test(uri) ? ' referrerpolicy="no-referrer"' : '';
    // STORY-152: explicit top/left/right/bottom — html2canvas does not parse `inset` shorthand
    return [
      `<div style="position:relative;width:100%;height:${heightPx}px;border-radius:12px;overflow:hidden;background:#f8fafc;">`,
      `<img src="${uri}" alt="" aria-hidden="true"${extRef} style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;object-fit:cover;filter:blur(24px) brightness(0.75) saturate(1.2);transform:scale(1.15);" />`,
      `<img src="${uri}" alt="${alt}"${extRef} style="position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;object-fit:contain;" />`,
      `</div>`,
    ].join('');
  }
  // STORY-152: accent-tinted gradient placeholder — looks intentional, matches ad identity.
  const iconSize = Math.round(heightPx * 0.28);
  const hex = (accentColor.startsWith('#') ? accentColor : '#f97316').replace('#', '');
  return [
    `<div style="width:100%;height:${heightPx}px;border-radius:12px;background:linear-gradient(135deg,#${hex}18,#${hex}2e);display:flex;align-items:center;justify-content:center;">`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#${hex}80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>`,
    `<circle cx="12" cy="13" r="4"/>`,
    `</svg>`,
    `</div>`,
  ].join('');
}

export function renderCode(product: ProductItem): string {
  if (!product.code) return '';
  return `<div style="font-size:12px;color:#6b7280;margin-top:8px;">${escapeHtml(product.code)}</div>`;
}

export function getDisplayPrice(product: ProductItem): string {
  const base = product.discountPrice ?? product.price;
  if (!base) return '';
  if (product.currency) return `${escapeHtml(base)} ${escapeHtml(product.currency)}`;
  return escapeHtml(base);
}

/** Placeholder content when there are no products but company logo is set (immediate preview). */
export const MINIMAL_PLACEHOLDER_HTML =
  '<div style="text-align:center;padding:48px 24px;font-size:16px;color:#6b7280;line-height:1.5;">Add products to see your ad</div>';
