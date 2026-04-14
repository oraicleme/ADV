import type { ProductItem, ProductBlockOptions } from '../ad-constants';
import { renderMultiGrid } from './multi-grid';
import {
  renderDocument,
  renderCompanyLogo,
  renderOrderedElements,
  renderImage,
  renderCode,
  renderBrandLogo,
  getDisplayPrice,
  escapeHtml,
  computeEffectiveImageHeight,
} from './shared';
import type { LayoutRenderer } from './types';

type ShowFields = ProductBlockOptions['showFields'];

const DEFAULT_SHOW: ShowFields = {
  image: true, code: true, name: true, description: true,
  originalPrice: true, price: true, discountBadge: true, brandLogo: true,
};

function renderCategoryCard(product: ProductItem, imageHeight: number, showFields: ShowFields, accentColor: string): string {
  const price = showFields.price ? getDisplayPrice(product) : '';
  const priceHtml = price
    ? `<div style="font-size:20px;font-weight:800;color:${accentColor};margin-top:8px;">${price}</div>`
    : '';
  const originalPriceHtml =
    showFields.originalPrice && product.originalPrice?.trim()
      ? `<div style="font-size:13px;color:#9ca3af;text-decoration:line-through;margin-top:4px;">${escapeHtml(product.originalPrice!)}${product.currency ? ` ${escapeHtml(product.currency)}` : ''}</div>`
      : '';
  const discountBadgeHtml =
    showFields.discountBadge && typeof product.discountPercent === 'number'
      ? `<div style="display:inline-flex;margin-top:4px;padding:2px 7px;border-radius:999px;background:${accentColor};color:#fff;font-size:11px;font-weight:800;">-${Math.abs(product.discountPercent)}%</div>`
      : '';

  return [
    '<div style="min-width:230px;background:#fff;color:#111827;border-radius:12px;padding:12px;border:1px solid #e5e7eb;">',
    showFields.image ? renderImage(product, imageHeight, accentColor) : '',
    showFields.brandLogo
      ? `<div style="display:flex;align-items:center;gap:8px;min-height:20px;margin-top:8px;">${renderBrandLogo(product)}</div>`
      : '',
    showFields.code ? renderCode(product) : '',
    showFields.name
      ? `<div style="font-size:16px;font-weight:700;line-height:1.3;margin-top:6px;">${escapeHtml(product.name)}</div>`
      : '',
    showFields.description && product.description
      ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${escapeHtml(product.description)}</div>`
      : '',
    originalPriceHtml,
    priceHtml,
    discountBadgeHtml,
    '</div>',
  ].join('');
}

export const renderCategoryGroup: LayoutRenderer = (data, format, style) => {
  const opts = data.productBlockOptions;
  const maxProducts = opts?.maxProducts;
  const allProducts =
    typeof maxProducts === 'number' && maxProducts > 0
      ? data.products.slice(0, maxProducts)
      : data.products;
  const columns = opts?.columns && opts.columns > 0 ? opts.columns : 3;
  const rowCount = Math.max(1, Math.ceil(allProducts.length / Math.max(1, columns)));
  const imageHeight = computeEffectiveImageHeight(format, rowCount, opts?.imageHeight);
  const showFields: ShowFields = opts?.showFields ?? DEFAULT_SHOW;

  const grouped = new Map<string, ProductItem[]>();

  for (const product of allProducts) {
    const key = product.category?.trim() || 'Other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(product);
  }

  const hasAnyCategory = allProducts.some((product) => product.category?.trim());
  if (!hasAnyCategory) {
    return renderMultiGrid(data, format, style);
  }

  const sections = [...grouped.entries()]
    .map(([category, products]) => {
      const cards = products
        .map((product: ProductItem) => renderCategoryCard(product, imageHeight, showFields, style.accentColor))
        .join('');

      return [
        '<section style="margin-bottom:16px;">',
        `<div style="background:${style.accentColor};color:#fff;padding:10px 12px;border-radius:10px 10px 0 0;font-weight:800;letter-spacing:0.2px;">${escapeHtml(category)}</div>`,
        '<div style="display:flex;gap:10px;overflow-x:auto;padding:10px;background:#eef2ff1a;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">',
        cards,
        '</div>',
        '</section>',
      ].join('');
    })
    .join('');

  const productsHtml = `<div style="padding:0 24px 28px;">${sections}</div>`;
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, productsHtml),
  ].join('');

  return renderDocument(format, style, content);
};
