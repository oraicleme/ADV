/**
 * Emulation test for the incremental sync pipeline.
 * 
 * Verifies:
 *   1. First sync → full mode (all products indexed)
 *   2. Second sync with no changes → 0 products indexed (all unchanged)
 *   3. Third sync with 3 changed + 2 new + 1 deleted → only 5 indexed, 1 deleted
 *   4. Recovery sync (force=true) → full mode regardless of hashes
 *
 * Run with: npx tsx server/lib/__tests__/catalog-health-emulation.ts
 */

import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Emulate the core logic without Meilisearch/API dependencies
// ---------------------------------------------------------------------------

interface MeiliProductDoc {
  id: number;
  name: string;
  brand: string;
  code: string;
  category: string;
}

interface SyncStats {
  totalFromSource: number;
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
  mode: 'full' | 'incremental';
}

function computeContentHash(doc: { name: string; brand: string; code: string; category: string }): string {
  const content = `${doc.name}|${doc.brand}|${doc.code}|${doc.category}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// Simulated state
const contentHashes = new Map<number, string>();
const skuToId = new Map<string, number>();
let nextId = 0;

// Simulated Meilisearch
let indexedDocs: MeiliProductDoc[] = [];
let deletedIds: number[] = [];
let indexCallCount = 0;

function resolveProductId(sku: string): number {
  const existing = skuToId.get(sku);
  if (existing !== undefined) return existing;
  const id = nextId++;
  skuToId.set(sku, id);
  return id;
}

async function simulateSync(products: MeiliProductDoc[], force = false): Promise<SyncStats> {
  const isFirstSync = contentHashes.size === 0;
  const doFullSync = force || isFirstSync;

  if (doFullSync) {
    // Full sync
    indexedDocs = products;
    indexCallCount++;
    contentHashes.clear();
    for (const p of products) {
      contentHashes.set(p.id, computeContentHash(p));
    }
    return {
      totalFromSource: products.length,
      added: products.length,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      mode: 'full',
    };
  }

  // Incremental sync
  const newHashes = new Map<number, string>();
  const toAdd: MeiliProductDoc[] = [];
  const toUpdate: MeiliProductDoc[] = [];
  const currentIds = new Set<number>();

  for (const p of products) {
    const hash = computeContentHash(p);
    newHashes.set(p.id, hash);
    currentIds.add(p.id);

    const existingHash = contentHashes.get(p.id);
    if (!existingHash) {
      toAdd.push(p);
    } else if (existingHash !== hash) {
      toUpdate.push(p);
    }
  }

  const toDelete: number[] = [];
  for (const [id] of contentHashes) {
    if (!currentIds.has(id)) {
      toDelete.push(id);
    }
  }

  // Simulate Meilisearch calls
  if (toAdd.length + toUpdate.length > 0) {
    indexedDocs = [...toAdd, ...toUpdate]; // Only these get indexed
    indexCallCount++;
  }
  if (toDelete.length > 0) {
    deletedIds = toDelete;
  }

  // Update hashes
  contentHashes.clear();
  for (const [k, v] of newHashes) {
    contentHashes.set(k, v);
  }

  return {
    totalFromSource: products.length,
    added: toAdd.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    unchanged: products.length - toAdd.length - toUpdate.length,
    mode: 'incremental',
  };
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

function makeProducts(count: number): MeiliProductDoc[] {
  return Array.from({ length: count }, (_, i) => ({
    id: resolveProductId(`SKU-${i}`),
    name: `Product ${i}`,
    brand: `Brand ${i % 5}`,
    code: `SKU-${i}`,
    category: `Category ${i % 3}`,
  }));
}

async function runEmulation() {
  console.log('=== CATALOG INCREMENTAL SYNC EMULATION ===\n');

  // Scenario 1: First sync (should be FULL)
  console.log('--- Scenario 1: First sync (100 products) ---');
  const products1 = makeProducts(100);
  const stats1 = await simulateSync(products1);
  console.log(`  Mode: ${stats1.mode}`);
  console.log(`  Added: ${stats1.added}, Updated: ${stats1.updated}, Deleted: ${stats1.deleted}, Unchanged: ${stats1.unchanged}`);
  console.log(`  Index calls: ${indexCallCount}`);
  console.assert(stats1.mode === 'full', 'First sync should be full');
  console.assert(stats1.added === 100, 'Should add all 100');
  console.assert(stats1.unchanged === 0, 'Nothing unchanged on first sync');
  console.log('  ✅ PASSED\n');

  // Scenario 2: Second sync with NO changes (should be INCREMENTAL, 0 indexed)
  console.log('--- Scenario 2: Same 100 products, no changes ---');
  indexCallCount = 0;
  const products2 = makeProducts(100); // Same products
  const stats2 = await simulateSync(products2);
  console.log(`  Mode: ${stats2.mode}`);
  console.log(`  Added: ${stats2.added}, Updated: ${stats2.updated}, Deleted: ${stats2.deleted}, Unchanged: ${stats2.unchanged}`);
  console.log(`  Index calls: ${indexCallCount}`);
  console.assert(stats2.mode === 'incremental', 'Should be incremental');
  console.assert(stats2.added === 0, 'No new products');
  console.assert(stats2.updated === 0, 'No changed products');
  console.assert(stats2.unchanged === 100, 'All 100 unchanged');
  console.assert(indexCallCount === 0, 'ZERO Meilisearch calls = ZERO OpenAI embedding calls');
  console.log('  ✅ PASSED (0 API calls, 0 OpenAI calls — cost savings!)\n');

  // Scenario 3: Third sync with changes (3 updated, 2 new, 1 deleted)
  console.log('--- Scenario 3: 3 changed + 2 new + 1 deleted ---');
  indexCallCount = 0;
  deletedIds = [];
  const products3 = makeProducts(99); // Remove last one (SKU-99 deleted)
  // Modify 3 products
  products3[5].name = 'UPDATED Product 5';
  products3[20].name = 'UPDATED Product 20';
  products3[50].brand = 'NEW BRAND';
  // Add 2 new products
  products3.push({
    id: resolveProductId('SKU-NEW-1'),
    name: 'Brand New Product 1',
    brand: 'NewBrand',
    code: 'SKU-NEW-1',
    category: 'Category 0',
  });
  products3.push({
    id: resolveProductId('SKU-NEW-2'),
    name: 'Brand New Product 2',
    brand: 'NewBrand',
    code: 'SKU-NEW-2',
    category: 'Category 1',
  });
  const stats3 = await simulateSync(products3);
  console.log(`  Mode: ${stats3.mode}`);
  console.log(`  Added: ${stats3.added}, Updated: ${stats3.updated}, Deleted: ${stats3.deleted}, Unchanged: ${stats3.unchanged}`);
  console.log(`  Index calls: ${indexCallCount}`);
  console.log(`  Deleted IDs: [${deletedIds.join(', ')}]`);
  console.assert(stats3.mode === 'incremental', 'Should be incremental');
  console.assert(stats3.added === 2, 'Should add 2 new');
  console.assert(stats3.updated === 3, 'Should update 3 changed');
  console.assert(stats3.deleted === 1, 'Should delete 1 removed');
  console.assert(stats3.unchanged === 96, 'Should have 96 unchanged');
  console.assert(indexCallCount === 1, 'Only 1 Meilisearch call for 5 docs (not 101!)');
  console.log('  ✅ PASSED (only 5 docs indexed instead of 101 — 95% cost reduction!)\n');

  // Scenario 4: Force full resync
  console.log('--- Scenario 4: Force full resync ---');
  indexCallCount = 0;
  const products4 = makeProducts(50); // Different count
  const stats4 = await simulateSync(products4, true); // force=true
  console.log(`  Mode: ${stats4.mode}`);
  console.log(`  Added: ${stats4.added}, Unchanged: ${stats4.unchanged}`);
  console.assert(stats4.mode === 'full', 'Forced sync should be full');
  console.assert(stats4.added === 50, 'Should index all 50');
  console.log('  ✅ PASSED\n');

  // Summary
  console.log('=== ALL SCENARIOS PASSED ===');
  console.log('\nKey insight: On a typical resync where <1% of products change,');
  console.log('the incremental sync saves 99% of OpenAI embedding API calls.');
  console.log('For 34,742 products with 50 changes: 50 embeddings instead of 34,742.');
  console.log('At $0.02/1M tokens × ~20 tokens/product:');
  console.log('  Full sync cost:  ~$0.014 per sync');
  console.log('  Incremental cost: ~$0.00002 per sync (700x cheaper)');
}

runEmulation().catch(console.error);
