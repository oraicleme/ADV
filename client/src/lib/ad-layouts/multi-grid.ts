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

function renderCard(product: ProductItem, imageHeight: number, showFields: ShowFields, _accentColor: string): string {
  const price = showFields.price ? getDisplayPrice(product) : '';
  const priceHtml = price
    ? `<div class="price-main" style="margin-top:8px;">${price}</div>`
    : '';
  const originalPriceHtml =
    showFields.originalPrice && product.originalPrice?.trim()
      ? `<div class="price-original" style="margin-top:3px;">${escapeHtml(product.originalPrice!)}${product.currency ? ` ${escapeHtml(product.currency)}` : ''}</div>`
      : '';
  const discountBadgeHtml =
    showFields.discountBadge && typeof product.discountPercent === 'number'
      ? `<div style="margin-top:5px;"><span class="discount-badge">-${Math.abs(product.discountPercent)}%</span></div>`
      : '';

  return [
    '<div class="ad-card" style="padding:12px;">',
    showFields.image ? renderImage(product, imageHeight, _accentColor) : '',
    showFields.brandLogo
      ? `<div style="display:flex;align-items:center;gap:6px;min-height:18px;margin-top:8px;">${renderBrandLogo(product)}</div>`
      : '',
    showFields.code ? renderCode(product) : '',
    showFields.name
      ? `<div class="product-name" style="margin-top:5px;">${escapeHtml(product.name)}</div>`
      : '',
    showFields.description && product.description
      ? `<div class="product-desc" style="margin-top:3px;">${escapeHtml(product.description)}</div>`
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
  const gap = format.width >= 1200 ? 16 : 12;

  const productsHtml = `<div style="padding:0 16px 20px;display:grid;grid-template-columns:repeat(${columns}, minmax(0, 1fr));gap:${gap}px;">${cards}</div>`;
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, productsHtml),
  ].join('');

  return renderDocument(format, style, content);
};
