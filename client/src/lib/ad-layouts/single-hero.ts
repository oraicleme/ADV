import type { ProductBlockOptions } from '../ad-constants';
import type { LayoutRenderer } from './types';
import {
  renderDocument,
  renderCompanyLogo,
  renderOrderedElements,
  renderImage,
  renderCode,
  renderBrandLogo,
  getDisplayPrice,
  escapeHtml,
} from './shared';

type ShowFields = ProductBlockOptions['showFields'];

const DEFAULT_SHOW: ShowFields = {
  image: true, code: true, name: true, description: true,
  originalPrice: true, price: true, discountBadge: true, brandLogo: true,
};

export const renderSingleHero: LayoutRenderer = (data, format, style) => {
  const opts = data.productBlockOptions;
  const product = data.products[0];
  const imageHeight = opts?.imageHeight || Math.floor(format.height * 0.55);
  const showFields: ShowFields = opts?.showFields ?? DEFAULT_SHOW;

  let cardHtml =
    '<div style="background:#fff;border-radius:18px;padding:24px;text-align:center;color:#6b7280;">No products yet</div>';

  if (product) {
    const price = showFields.price ? getDisplayPrice(product) : '';
    const priceHtml = price
      ? `<div style="font-size:44px;font-weight:900;color:${style.accentColor};margin-top:14px;">${price}</div>`
      : '';
    const originalPriceHtml =
      showFields.originalPrice && product.originalPrice?.trim()
        ? `<div style="font-size:16px;color:#9ca3af;text-decoration:line-through;margin-top:6px;">${escapeHtml(product.originalPrice!)}${product.currency ? ` ${escapeHtml(product.currency)}` : ''}</div>`
        : '';
    const discountBadgeHtml =
      showFields.discountBadge && typeof product.discountPercent === 'number'
        ? `<div style="display:inline-flex;margin-top:8px;padding:4px 12px;border-radius:999px;background:${style.accentColor};color:#fff;font-size:14px;font-weight:800;">-${Math.abs(product.discountPercent)}%</div>`
        : '';

    cardHtml = [
      '<div style="background:#fff;border-radius:18px;padding:20px;box-shadow:0 4px 14px rgba(0,0,0,0.08);">',
      showFields.image ? `<div style="margin-bottom:16px;">${renderImage(product, imageHeight)}</div>` : '',
      showFields.brandLogo
        ? `<div style="display:flex;align-items:center;gap:10px;min-height:24px;">${renderBrandLogo(product)}</div>`
        : '',
      showFields.code ? renderCode(product) : '',
      showFields.name
        ? `<div style="font-size:40px;font-weight:900;line-height:1.08;margin-top:8px;">${escapeHtml(product.name)}</div>`
        : '',
      showFields.description && product.description
        ? `<div style="font-size:18px;color:#6b7280;line-height:1.3;margin-top:8px;">${escapeHtml(product.description)}</div>`
        : '',
      originalPriceHtml,
      priceHtml,
      discountBadgeHtml,
      '</div>',
    ].join('');
  }

  const productsHtml = `<div style="padding:0 28px 32px;">${cardHtml}</div>`;
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, productsHtml),
  ].join('');

  return renderDocument(format, style, content);
};
