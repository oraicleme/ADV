/**
 * Integration test for catalog.selectProducts using the real LLM.
 * Run manually with:
 *   pnpm test -- server/routers/catalog.selectProducts.integration.test.ts
 *
 * Requires a valid IO_NET_API_TOKEN / ORAICLE_API_KEY / VITE_IONET_API_KEY in .env.local.
 * The test is skipped automatically when no API key is present.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env in the same way as the dev server
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { describe, it, beforeAll } from 'vitest';
import { catalogRouter } from './catalog';
import type { TrpcContext } from '../_core/context';

const hasApiKey = Boolean(
  process.env.IO_NET_API_TOKEN ||
    process.env.ORAICLE_API_KEY ||
    process.env.BUILT_IN_FORGE_API_KEY ||
    process.env.IONET_API_KEY ||
    process.env.VITE_IONET_API_KEY,
);

describe.skipIf(!hasApiKey)('catalog.selectProducts (LLM integration)', () => {
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.warn(
      '[catalog.selectProducts.integration] Running against live LLM with model:',
      process.env.ORAICLE_LLM_MODEL || process.env.IONET_LLM_MODEL || '(default)',
    );
  });

  it(
    'logs full LLM-assisted selection flow for a Teracell-style query',
    async () => {
      const ctx: TrpcContext = {
        // We only call a publicProcedure, so req/res/user are unused; minimal stubs are enough.
        req: {} as any,
        res: {} as any,
        user: null,
      };

      const caller = catalogRouter.createCaller(ctx as any);

      const candidates = [
        {
          index: 0,
          name: 'Kućni punjač Teracell iPhone USB 1A bijeli',
          code: 'TC-IPH-1A-W',
          category: 'Punjači za mob. tel.',
          brand: 'Teracell',
        },
        {
          index: 1,
          name: 'Kućni punjač Teracell Ultra 2.4A USB + Type-C',
          code: 'TC-ULTRA-24A',
          category: 'Punjači za mob. tel.',
          brand: 'Teracell',
        },
        {
          index: 2,
          name: 'Auto punjač Teracell USB-C 30W',
          code: 'TC-AUTO-30W',
          category: 'Punjači za auto',
          brand: 'Teracell',
        },
        {
          index: 3,
          name: 'Data kabl USB-C Teracell 1m',
          code: 'TC-CABLE-USBC',
          category: 'Kablovi',
          brand: 'Teracell',
        },
        {
          index: 4,
          name: 'Bežični punjač 15W Teracell',
          code: 'TC-WIRELESS-15W',
          category: 'Punjači za mob. tel.',
          brand: 'Teracell',
        },
      ];

      const query = 'teracell kućne punjače';

      // eslint-disable-next-line no-console
      console.log(
        '[catalog.selectProducts.integration] Calling selectProducts with query and candidates:',
        { query, candidates },
      );

      const result = await caller.selectProducts({
        query,
        candidates,
        maxSelect: 0,
      });

      // eslint-disable-next-line no-console
      console.log(
        '[catalog.selectProducts.integration] Result from selectProducts:',
        JSON.stringify(result, null, 2),
      );
    },
    60_000,
  );
});

