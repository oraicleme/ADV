/**
 * STORY-122: Shared search index hook (P-2).
 * STORY-124: Expose indexVersion (state) so children that depend on the index
 * re-render when it becomes ready (ref updates don't trigger re-renders).
 *
 * Usage:
 *   const { indexRef, versionRef, indexVersion } = useSearchIndex(products);
 *
 * Pass indexRef and indexVersion to ProductDataInput so visibleIndices
 * recomputes when the index is rebuilt (e.g. after catalog load).
 */

import { useRef, useEffect, useState } from 'react';
import { buildSearchIndex, type ProductSearchIndex } from './product-index';
import type { ProductItem } from './ad-templates';

export interface SearchIndexHandle {
  /** Ref to the current MiniSearch index. Null when catalog is empty. */
  indexRef: React.RefObject<ProductSearchIndex | null>;
  /**
   * Monotonically increasing counter, incremented on every catalog rebuild.
   * Snapshot at the start of an async operation and compare after to detect
   * whether the catalog changed while the operation was in flight.
   */
  versionRef: React.MutableRefObject<number>;
  /**
   * State version that changes when the index is rebuilt. Use in child
   * useMemo deps so visibleIndices (sidebar search) recomputes when the
   * index becomes ready (ref update alone does not trigger re-render).
   */
  indexVersion: number;
}

export interface UseSearchIndexOptions {
  /**
   * When true, skip building the MiniSearch index (e.g. when Meilisearch is active).
   * indexRef.current will be null; versionRef still increments so callers can track catalog changes.
   */
  skip?: boolean;
}

export function useSearchIndex(
  products: ProductItem[],
  options: UseSearchIndexOptions = {},
): SearchIndexHandle {
  const { skip = false } = options;
  const indexRef = useRef<ProductSearchIndex | null>(null);
  const versionRef = useRef(0);
  const [indexVersion, setIndexVersion] = useState(0);

  useEffect(() => {
    // Bump version and rebuild atomically so they are always in sync.
    versionRef.current += 1;
    indexRef.current = !skip && products.length > 0 ? buildSearchIndex(products) : null;
    setIndexVersion((v) => v + 1);
  }, [products, skip]);

  return { indexRef, versionRef, indexVersion };
}
