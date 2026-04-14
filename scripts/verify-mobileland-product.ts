#!/usr/bin/env npx tsx
/**
 * STORY-157: Print Magento entity_id, sku, url_key for a product — confirms Excel/code mapping.
 *
 * Usage: pnpm exec tsx scripts/verify-mobileland-product.ts <sku>
 * Requires: .env.local with MOBILELAND_* OAuth credentials.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const skuArg = process.argv[2]?.trim();
  if (!skuArg) {
    console.error('Usage: pnpm exec tsx scripts/verify-mobileland-product.ts <sku>');
    process.exit(1);
  }

  const { buildOAuthHeader } = await import('../server/lib/mobileland-api.ts');
  const baseUrl = (process.env.MOBILELAND_BASE_URL || '').replace(/\/$/, '');
  const oauth = {
    consumerKey: process.env.MOBILELAND_CONSUMER_KEY || '',
    consumerSecret: process.env.MOBILELAND_CONSUMER_SECRET || '',
    token: process.env.MOBILELAND_ACCESS_TOKEN || '',
    tokenSecret: process.env.MOBILELAND_ACCESS_TOKEN_SECRET || '',
  };

  if (!oauth.consumerKey || !baseUrl) {
    console.error('Missing MOBILELAND_BASE_URL or MOBILELAND_CONSUMER_KEY in .env.local');
    process.exit(1);
  }

  const url = `${baseUrl}/rest/V1/products/${encodeURIComponent(skuArg)}`;
  const auth = buildOAuthHeader('GET', url, {}, oauth);
  const res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, text.slice(0, 400));
    process.exit(1);
  }
  const p = JSON.parse(text) as {
    id?: number;
    sku?: string;
    name?: string;
    custom_attributes?: { attribute_code?: string; value?: unknown }[];
  };
  const urlKey = p.custom_attributes?.find((a) => a.attribute_code === 'url_key')?.value;

  console.log('--- Mobileland product (REST) ---');
  console.log('entity_id:', p.id);
  console.log('sku:      ', p.sku);
  console.log('url_key:  ', urlKey ?? '(none)');
  console.log('name:     ', p.name);
  console.log('');
  console.log('Use in Excel "šifra" column for Oraicle image map: same as sku, or entity_id as string.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
