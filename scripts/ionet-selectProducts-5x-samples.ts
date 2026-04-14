/**
 * Run selectProducts 5 times with the same query to collect io.net response samples.
 * Saves each raw response to .tmp/ionet-selectProducts/ (via catalog's saveRawResponseForDebug).
 *
 * Usage: pnpm tsx scripts/ionet-selectProducts-5x-samples.ts
 * Requires: IO_NET_API_TOKEN or VITE_IONET_API_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { catalogRouter } from '../server/routers/catalog';
import type { TrpcContext } from '../server/_core/context';

const candidates = [
  { index: 0, name: 'Kućni punjač Teracell iPhone USB 1A bijeli', code: 'TC-IPH-1A-W', category: 'Punjači za mob. tel.', brand: 'Teracell' },
  { index: 1, name: 'Kućni punjač Teracell Ultra 2.4A USB + Type-C', code: 'TC-ULTRA-24A', category: 'Punjači za mob. tel.', brand: 'Teracell' },
  { index: 2, name: 'Auto punjač Teracell USB-C 30W', code: 'TC-AUTO-30W', category: 'Punjači za auto', brand: 'Teracell' },
  { index: 3, name: 'Data kabl USB-C Teracell 1m', code: 'TC-CABLE-USBC', category: 'Kablovi', brand: 'Teracell' },
  { index: 4, name: 'Bežični punjač 15W Teracell', code: 'TC-WIRELESS-15W', category: 'Punjači za mob. tel.', brand: 'Teracell' },
];

const query = 'teracell punjace';
const DELAY_MS = 2500;

async function main() {
  const ctx: TrpcContext = { req: {} as any, res: {} as any, user: null };
  const caller = catalogRouter.createCaller(ctx as any);

  console.log('Running selectProducts 5 times (same query, same candidates). Delay', DELAY_MS, 'ms between calls.\n');

  for (let i = 1; i <= 5; i++) {
    console.log(`--- Call ${i}/5 ---`);
    try {
      const result = await caller.selectProducts({ query, candidates, maxSelect: 8 });
      console.log('Result:', result.indices.length, 'indices, reasoning:', (result.reasoning || '').slice(0, 60) + '...');
    } catch (e) {
      console.log('Error:', (e as Error).message);
    }
    if (i < 5) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\nDone. Raw responses saved to .tmp/ionet-selectProducts/ (response-*.json, content-*.txt).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
