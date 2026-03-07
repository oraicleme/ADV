import * as XLSX from 'xlsx';
import type { ProductItem } from './ad-templates';
import {
  normalisePrice,
  extractCurrency,
  deduplicateProducts,
  validateProduct,
  emptyStats,
  type ParseResult,
  type ParseStats,
} from './parse-utils';

export type { ParseResult, ParseStats };

type Row = Record<string, unknown>;

const NAME_VARIANTS = [
  'name', 'naziv', 'ime', 'opis', 'description', 'desc',
  'product', 'proizvod', 'artikal', 'article', 'item',
  'product name', 'product_name', 'productname',
];

const CODE_VARIANTS = [
  'code', 'šifra', 'sifra', 'kod', 'sku', 'ean', 'barcode',
  'product code', 'product_code', 'productcode',
  'article code', 'article_code', 'articlecode',
  'item code', 'item_code', 'itemcode', 'id',
];

const PRICE_VARIANTS = [
  'price', 'cijena', 'cena', 'cjena', 'iznos', 'amount',
  'eur', 'usd', 'bam', 'km', 'hrk', 'rsd',
  'retail', 'mp', 'maloprodaja', 'retail price', 'retail_price',
];

const WHOLESALE_VARIANTS = [
  'vp', 'veleprodaja', 'wholesale', 'wholesale price', 'wholesale_price',
  'vp cijena', 'vp cena', 'vp price',
];

const CATEGORY_VARIANTS = [
  'category', 'kategorija', 'cat', 'grupa', 'group', 'type', 'vrsta',
];

/**
 * Discount/rebate column: "popust" (Bosnian/Croatian/Serbian), "rabat", "snizenje",
 * plus English equivalents. Values can be "20%", "0.20", or "20".
 */
const DISCOUNT_VARIANTS = [
  'popust', 'popust %', '% popust', 'rabat', 'snizenje', 'sniženje',
  'discount', 'discount %', '% discount', 'rebate', 'sale %', '% sale',
  'popust posto', 'posto popusta',
];

/**
 * Normalise a raw discount cell value to an integer percentage (0–100).
 * Handles: "20%", "20", "0.20", "0,20", 0.2, 20
 * Returns undefined if the value can't be parsed.
 */
function normaliseDiscount(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  let num: number;
  if (typeof raw === 'number') {
    num = raw;
  } else {
    const str = String(raw)
      .trim()
      .replace(/%/g, '')
      .replace(',', '.')
      .trim();
    num = parseFloat(str);
  }
  if (!isFinite(num) || num < 0) return undefined;
  // Treat values < 1.01 as fractional (e.g. 0.20 → 20%)
  if (num > 0 && num < 1.01) num = Math.round(num * 100);
  return Math.round(num);
}

function matchColumn(
  headers: string[],
  variants: string[],
): string | undefined {
  const lowerHeaders = headers.map((h) => String(h).toLowerCase().trim());
  for (const variant of variants) {
    const idx = lowerHeaders.indexOf(variant);
    if (idx !== -1) return headers[idx];
  }
  for (const variant of variants) {
    const idx = lowerHeaders.findIndex((h) => h.includes(variant));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/**
 * Scan headers and cell values to detect the dominant currency in the sheet.
 * Priority: header-level hint > most frequent cell-level match.
 */
function detectSheetCurrency(headers: string[], rows: Row[]): string | undefined {
  // Check if any header is itself a currency keyword
  for (const h of headers) {
    const cur = extractCurrency(h);
    if (cur) return cur;
  }
  // Scan price-like cell values for embedded currency strings
  const freq = new Map<string, number>();
  const sampleSize = Math.min(rows.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    for (const val of Object.values(rows[i])) {
      if (val == null) continue;
      const cur = extractCurrency(String(val));
      if (cur) freq.set(cur, (freq.get(cur) ?? 0) + 1);
    }
  }
  if (freq.size === 0) return undefined;
  const entries: Array<[string, number]> = Array.from(freq.entries());
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];
  const stats = emptyStats();

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch {
    return { products: [], errors: ['Could not read file. Make sure it is a valid Excel or CSV file.'], stats };
  }

  if (wb.SheetNames.length === 0) {
    return { products: [], errors: ['The file contains no sheets.'], stats };
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet);

  stats.totalRows = rows.length;

  if (rows.length === 0) {
    return { products: [], errors: ['The file appears to be empty — no data rows found.'], stats };
  }

  const headers = Object.keys(rows[0]);
  const nameCol = matchColumn(headers, NAME_VARIANTS);
  const codeCol = matchColumn(headers, CODE_VARIANTS);
  const priceCol = matchColumn(headers, PRICE_VARIANTS);
  const wholesaleCol = matchColumn(headers, WHOLESALE_VARIANTS);
  const categoryCol = matchColumn(headers, CATEGORY_VARIANTS);
  const discountCol = matchColumn(headers, DISCOUNT_VARIANTS);

  if (!nameCol && !codeCol) {
    errors.push(
      'Could not detect a product name or code column. Expected headers like: Name, Naziv, Product, Code, Šifra, SKU…',
    );
    return { products: [], errors, stats };
  }

  const currency = detectSheetCurrency(headers, rows);
  stats.currencyDetected = currency;

  const rawProducts: ProductItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = nameCol ? String(row[nameCol] ?? '').trim() : '';
    const code = codeCol ? String(row[codeCol] ?? '').trim() : undefined;

    if (!name && !code) {
      stats.skippedCount++;
      continue;
    }

    const price = priceCol ? normalisePrice(row[priceCol]) : undefined;
    const wholesalePrice = wholesaleCol
      ? normalisePrice(row[wholesaleCol])
      : undefined;
    const category = categoryCol
      ? String(row[categoryCol] ?? '').trim() || undefined
      : undefined;
    const discountPercent = discountCol
      ? normaliseDiscount(row[discountCol])
      : undefined;

    const product: ProductItem = {
      name: name || code || '',
      code: code || undefined,
      price,
      retailPrice: price,
      wholesalePrice,
      currency,
      category,
      ...(discountPercent !== undefined && { discountPercent }),
    };

    const warnings = validateProduct(product, i + 1);
    stats.warnings.push(...warnings);

    rawProducts.push(product);
  }

  const { unique, duplicateCount } = deduplicateProducts(rawProducts);
  stats.duplicateCount = duplicateCount;
  stats.parsedCount = unique.length;
  stats.hasProductCodes = unique.some((p) => !!p.code?.trim());
  stats.hasDiscounts = unique.some((p) => p.discountPercent != null);

  return { products: unique, errors, stats };
}

/**
 * Parse an Excel/CSV file using a Web Worker when available, falling back
 * to main-thread parsing in SSR or when Worker creation fails.
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();

  if (typeof Worker !== 'undefined') {
    try {
      return await parseInWorker(buffer);
    } catch {
      // Worker failed (e.g. CSP restriction) — fall through to main thread
    }
  }

  return parseExcelBuffer(buffer);
}

function parseInWorker(buffer: ArrayBuffer): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./excel-parser.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (e: MessageEvent) => {
      worker.terminate();
      if (e.data.ok) {
        resolve(e.data.result as ParseResult);
      } else {
        reject(new Error(e.data.error));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage(buffer, [buffer]);
  });
}
