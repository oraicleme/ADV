import { renderCategoryGroup } from './ad-layouts/category-group';
import { renderMultiGrid } from './ad-layouts/multi-grid';
import { renderSaleDiscount } from './ad-layouts/sale-discount';
import { renderSingleHero } from './ad-layouts/single-hero';
import { renderDocument, renderCompanyLogo, renderOrderedElements, MINIMAL_PLACEHOLDER_HTML, escapeHtml } from './ad-layouts/shared';
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

/** Luminance for contrast; same threshold as canvas getAdaptiveColors (STORY-37). */
function getLuminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function getTextColorForBackground(bgHex: string): string {
  const safe = bgHex?.startsWith('#') ? bgHex : '#f8fafc';
  return getLuminance(safe) < 0.179 ? '#f1f5f9' : '#111827';
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

/** STORY-109/127: Footer band follows ad background (canvas → preview → export). Same bg as reklame + readable text. XSS-safe. */
function buildFooterHtml(data: AdTemplateData): string {
  const f = data.footer;
  if (!f?.enabled) return '';
  const style = normalizeStyle(data);
  const bg = style.backgroundColor ?? DEFAULT_STYLE.backgroundColor ?? '#f8fafc';
  const fg = getTextColorForBackground(bg);
  const company = f.companyName?.trim() ? escapeHtml(f.companyName.trim()) : '';
  const phone = f.contact?.phone?.trim() ? escapeHtml(f.contact.phone.trim()) : '';
  const website = f.contact?.website?.trim() ? escapeHtml(f.contact.website.trim()) : '';
  const address = f.contact?.address?.trim() ? escapeHtml(f.contact.address.trim()) : '';
  const hasContent = company || phone || website || address;
  const inner =
    hasContent
      ? `<div style="display:flex;flex-direction:column;gap:2px;">${company ? `<span style="font-weight:700;">${company}</span>` : ''}${address ? `<span style="opacity:.8;">${address}</span>` : ''}</div>` +
        `<div style="display:flex;flex-direction:column;gap:2px;text-align:right;">${phone ? `<span>${phone}</span>` : ''}${website ? `<span style="opacity:.8;">${website}</span>` : ''}</div>`
      : '<span style="opacity:.6;">Company & contact</span>';
  return `<div data-footer style="background:${escapeHtml(bg)};color:${escapeHtml(fg)};padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;line-height:1.35;border-radius:0 0 12px 12px;margin-top:auto;flex-shrink:0;width:100%;">${inner}</div>`;
}

/**
 * Injects the footer band HTML just before the closing </body> tag.
 * Works regardless of which layout renderer produced the HTML.
 * Same HTML is used for preview and export (STORY-131: canvas bottom → preview end → export end).
 */
function injectFooter(html: string, footerHtml: string): string {
  if (!footerHtml) return html;
  return html.replace('</body>', `${footerHtml}\n</body>`);
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

  const footerHtml = buildFooterHtml(data);

  const hasLogoNoProducts = data.products.length === 0 && data.companyLogoDataUri;
  if (hasLogoNoProducts) {
    return injectFooter(renderMinimalAdTemplate(data, format, style), footerHtml);
  }
  const hasTextNoProductsNoLogo =
    data.products.length === 0 &&
    !data.companyLogoDataUri &&
    (!!data.title?.trim() || hasAnyCta || !!data.badgeText?.trim() || !!data.disclaimerText?.trim() || !!data.emojiOrIcon?.trim());
  if (hasTextNoProductsNoLogo) {
    return injectFooter(renderTextOnlyTemplate(data, format, style), footerHtml);
  }
  const layoutId = data.layout ?? 'multi-grid';
  const renderer = LAYOUT_RENDERERS[layoutId] ?? renderMultiGrid;
  return injectFooter(renderer(data, format, style), footerHtml);
}
