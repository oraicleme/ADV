import { renderCategoryGroup } from './ad-layouts/category-group';
import { renderMultiGrid } from './ad-layouts/multi-grid';
import { renderSaleDiscount } from './ad-layouts/sale-discount';
import { renderSingleHero } from './ad-layouts/single-hero';
import { renderDocument, renderCompanyLogo, renderOrderedElements, MINIMAL_PLACEHOLDER_HTML } from './ad-layouts/shared';
import type { FormatPreset, LayoutId, LayoutRenderer, StyleOptions } from './ad-layouts/types';
import { FORMAT_PRESETS, DEFAULT_STYLE } from './ad-constants';
import type { AdTemplateData } from './ad-constants';

export type { ProductItem, AdTemplateData } from './ad-constants';
export { FORMAT_PRESETS, DEFAULT_STYLE };

const LAYOUT_RENDERERS: Record<LayoutId, LayoutRenderer> = {
  'single-hero': renderSingleHero,
  'multi-grid': renderMultiGrid,
  'category-group': renderCategoryGroup,
  'sale-discount': renderSaleDiscount,
};

function normalizeFormat(format?: FormatPreset): FormatPreset {
  if (!format) return FORMAT_PRESETS[0];
  const width = Number.isFinite(format.width) ? Math.max(1, Math.floor(format.width)) : 1080;
  const height = Number.isFinite(format.height) ? Math.max(1, Math.floor(format.height)) : 1920;
  return {
    id: format.id || 'custom',
    label: format.label || `${width} x ${height}`,
    width,
    height,
    icon: format.icon,
  };
}

function normalizeStyle(data: AdTemplateData): StyleOptions {
  return {
    ...DEFAULT_STYLE,
    ...data.style,
    ...(data.backgroundColor ? { backgroundColor: data.backgroundColor } : {}),
    ...(data.accentColor ? { accentColor: data.accentColor } : {}),
  };
}

/** Renders a minimal ad template (logo + placeholder) when there are no products but a company logo is set. */
function renderMinimalAdTemplate(data: AdTemplateData, format: FormatPreset, style: StyleOptions): string {
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, MINIMAL_PLACEHOLDER_HTML),
  ].join('');
  return renderDocument(format, style, content);
}

/** Text-only preview when no products and no logo but headline/CTA/badge set (STORY-35). */
function renderTextOnlyTemplate(data: AdTemplateData, format: FormatPreset, style: StyleOptions): string {
  const placeholderHtml =
    '<div style="text-align:center;padding:48px 24px;font-size:16px;color:#6b7280;line-height:1.5;">Add products and logo to see your ad</div>';
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, placeholderHtml),
  ].join('');
  return renderDocument(format, style, content);
}

export function renderAdTemplate(data: AdTemplateData): string {
  const format = normalizeFormat(data.format);
  const style = normalizeStyle(data);
  const hasAnyCta = !!(
    (data.ctaButtons && data.ctaButtons.some((b) => b.trim())) ||
    data.ctaText?.trim()
  );
  const hasContent =
    data.products.length > 0 ||
    !!data.companyLogoDataUri ||
    !!data.title?.trim() ||
    hasAnyCta ||
    !!data.badgeText?.trim() ||
    !!data.disclaimerText?.trim() ||
    !!data.emojiOrIcon?.trim();
  if (!hasContent) return '';

  const hasLogoNoProducts = data.products.length === 0 && data.companyLogoDataUri;
  if (hasLogoNoProducts) {
    return renderMinimalAdTemplate(data, format, style);
  }
  const hasTextNoProductsNoLogo =
    data.products.length === 0 &&
    !data.companyLogoDataUri &&
    (!!data.title?.trim() || hasAnyCta || !!data.badgeText?.trim() || !!data.disclaimerText?.trim() || !!data.emojiOrIcon?.trim());
  if (hasTextNoProductsNoLogo) {
    return renderTextOnlyTemplate(data, format, style);
  }
  const layoutId = data.layout ?? 'multi-grid';
  const renderer = LAYOUT_RENDERERS[layoutId] ?? renderMultiGrid;
  return renderer(data, format, style);
}
