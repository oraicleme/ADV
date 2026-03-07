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
} from './shared';

const NATIVE_IMAGE_HEIGHT = 170;
const NATIVE_COLUMNS = 2;

type ShowFields = ProductBlockOptions['showFields'];

const DEFAULT_SHOW: ShowFields = {
  image: true, code: true, name: true, description: true,
  originalPrice: true, price: true, discountBadge: true, brandLogo: true,
};

function renderSaleCard(product: ProductItem, imageHeight: number, showFields: ShowFields, accentColor: string): string {
  const hasDiscount =
    Boolean(product.originalPrice?.trim()) &&
    Boolean((product.discountPrice ?? product.price)?.trim());

  const currentPrice = showFields.price ? getDisplayPrice(product) : '';
  const originalPriceText =
    showFields.originalPrice && product.originalPrice
      ? `${escapeHtml(product.originalPrice)}${product.currency ? ` ${escapeHtml(product.currency)}` : ''}`
      : '';
  const discountBadge =
    showFields.discountBadge && typeof product.discountPercent === 'number'
      ? `<div style="display:inline-flex;padding:3px 8px;border-radius:999px;background:${accentColor};color:#fff;font-size:12px;font-weight:800;">-${Math.abs(product.discountPercent)}%</div>`
      : '';

  const pricingHtml = hasDiscount && showFields.price
    ? [
        originalPriceText && showFields.originalPrice
          ? `<div style="font-size:14px;color:#9ca3af;text-decoration:line-through;margin-top:8px;">${originalPriceText}</div>`
          : '',
        `<div style="font-size:30px;font-weight:900;color:${accentColor};line-height:1.1;">${currentPrice}</div>`,
        discountBadge,
      ].join('')
    : currentPrice
      ? `<div style="font-size:28px;font-weight:900;color:${accentColor};margin-top:8px;">${currentPrice}</div>`
      : '';

  return [
    '<div style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">',
    showFields.image ? renderImage(product, imageHeight) : '',
    showFields.brandLogo
      ? `<div style="display:flex;align-items:center;gap:8px;min-height:20px;margin-top:10px;">${renderBrandLogo(product)}</div>`
      : '',
    showFields.code ? renderCode(product) : '',
    showFields.name
      ? `<div style="font-size:18px;font-weight:700;line-height:1.25;margin-top:6px;">${escapeHtml(product.name)}</div>`
      : '',
    showFields.description && product.description
      ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${escapeHtml(product.description)}</div>`
      : '',
    pricingHtml,
    '</div>',
  ].join('');
}

export const renderSaleDiscount: LayoutRenderer = (data, format, style) => {
  const opts = data.productBlockOptions;
  const maxProducts = opts?.maxProducts;
  const allProducts =
    typeof maxProducts === 'number' && maxProducts > 0
      ? data.products.slice(0, maxProducts)
      : data.products;
  const columns = opts?.columns && opts.columns > 0 ? opts.columns : NATIVE_COLUMNS;
  const imageHeight = opts?.imageHeight || NATIVE_IMAGE_HEIGHT;
  const showFields: ShowFields = opts?.showFields ?? DEFAULT_SHOW;

  const cards = allProducts
    .map((product) => renderSaleCard(product, imageHeight, showFields, style.accentColor))
    .join('');
  const headerPercent = allProducts.find((product) => product.discountPercent != null)?.discountPercent;
  const headline = headerPercent != null ? `SALE -${Math.abs(headerPercent)}%` : 'SALE';

  const productsHtml = [
    `<div style="padding:0 24px 10px;"><div style="background:${style.accentColor};color:#fff;border-radius:14px;padding:12px 16px;font-size:30px;font-weight:900;text-align:center;letter-spacing:0.4px;">${headline}</div></div>`,
    `<div style="padding:0 24px 28px;display:grid;grid-template-columns:repeat(${columns}, minmax(0, 1fr));gap:14px;">${cards}</div>`,
  ].join('');
  const content = [
    renderCompanyLogo(data),
    renderOrderedElements(data, style.accentColor, productsHtml),
  ].join('');

  return renderDocument(format, style, content);
};
