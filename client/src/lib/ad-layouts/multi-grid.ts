import type { ProductItem, ProductBlockOptions } from '../ad-constants';
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
  computeEffectiveImageHeight,
} from './shared';

function getGridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  return 3;
}

type ShowFields = ProductBlockOptions['showFields'];

function renderCard(product: ProductItem, imageHeight: number, showFields: ShowFields, accentColor: string): string {
  const price = showFields.price ? getDisplayPrice(product) : '';
  const priceHtml = price
    ? `<div style="font-size:26px;font-weight:800;color:${accentColor};margin-top:8px;">${price}</div>`
    : '';
  const originalPriceHtml =
    showFields.originalPrice && product.originalPrice?.trim()
      ? `<div style="font-size:14px;color:#9ca3af;text-decoration:line-through;margin-top:4px;">${escapeHtml(product.originalPrice!)}${product.currency ? ` ${escapeHtml(product.currency)}` : ''}</div>`
      : '';
  const discountBadgeHtml =
    showFields.discountBadge && typeof product.discountPercent === 'number'
      ? `<div style="display:inline-flex;margin-top:4px;padding:3px 8px;border-radius:999px;background:${accentColor};color:#fff;font-size:12px;font-weight:800;">-${Math.abs(product.discountPercent)}%</div>`
      : '';

  return [
    '<div style="background:#fff;color:#111827;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">',
    showFields.image ? renderImage(product, imageHeight, accentColor) : '',
    showFields.brandLogo
      ? `<div style="display:flex;align-items:center;gap:8px;min-height:20px;margin-top:10px;">${renderBrandLogo(product)}</div>`
      : '',
    showFields.code ? renderCode(product) : '',
    showFields.name
      ? `<div style="font-size:18px;font-weight:700;line-height:1.25;margin-top:6px;">${escapeHtml(product.name)}</div>`
      : '',
    showFields.description && product.description
      ? `<div style="font-size:13px;color:#6b7280;line-height:1.3;margin-top:4px;">${escapeHtml(product.description)}</div>`
      : '',
    originalPriceHtml,
    priceHtml,
    discountBadgeHtml,
    '</div>',
  ].join('');
}

export const renderMultiGrid: LayoutRenderer = (data, format, style) => {
  const opts = data.productBlockOptions;
  const maxProducts = opts?.maxProducts;
  const allProducts =
    typeof maxProducts === 'number' && maxProducts > 0
      ? data.products.slice(0, maxProducts)
      : data.products;
  const columns = opts?.columns && opts.columns > 0 ? opts.columns : getGridColumns(allProducts.length);
  const rowCount = Math.ceil(allProducts.length / Math.max(1, columns));
  const imageHeight = computeEffectiveImageHeight(
    format,
    rowCount,
    opts?.imageHeight
  );
  const showFields: ShowFields = opts?.showFields ?? {
    image: true, code: true, name: true, description: true,
    originalPrice: true, price: true, discountBadge: true, brandLogo: true,
  };
  const cards = allProducts.map((p) => renderCard(p, imageHeight, showFields, style.accentColor)).join('');
  const gap = format.width >= 1200 ? 18 : 14;

  const productsHtml = `<div style="padding:0 24px 28px;display:grid;grid-template-columns:repeat(${columns}, minmax(0, 1fr));gap:${gap}px;">${cards}</div>`;
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, productsHtml),
  ].join('');

  return renderDocument(format, style, content);
};
