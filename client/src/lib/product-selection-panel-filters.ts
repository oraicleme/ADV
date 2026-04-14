/**
 * Pure catalog filtering for ProductSelectionPanel (STORY-159).
 * STORY-181: optional MiniSearch (same as Add Products) when `catalogSearchIndex` is provided.
 * Keeps “unused” semantics testable without mounting React/DnD.
 */
import type { ProductItem } from './ad-constants';
import type { ProductSearchIndex } from './product-index';
import { applySearchRulesToIndices } from './apply-search-rules';
import { normalizeSearchQueryForPipeline } from './normalize-search-query';
import { buildSearchIndex, queryProductIndicesWithManualFallback } from './product-index';
import { getCatalogMinScoreForQuery, type SearchSource } from './product-search-min-score';
import { readSearchRules } from './search-rules-storage';

export type FilterProductsForSelectionOptions = {
  /** When set, use MiniSearch recall (aligned with ProductDataInput). */
  catalogSearchIndex?: ProductSearchIndex | null;
  /** Passed to min-score heuristic (default `manual`). */
  searchSource?: SearchSource;
};

/**
 * Matching catalog row indices — same rules as `filterCatalogBySearchQuery` (order preserved).
 * STORY-209: Canvas “swap product” lists pick targets by index into the full catalog.
 */
export function filterCatalogIndicesBySearchQuery(
  catalog: ProductItem[],
  searchQuery: string,
  options?: FilterProductsForSelectionOptions,
): number[] {
  const qTrim = normalizeSearchQueryForPipeline(searchQuery);
  if (!qTrim) {
    return catalog.map((_, i) => i);
  }

  const idx = options?.catalogSearchIndex ?? null;
  const rules = readSearchRules();
  if (idx) {
    const minScore = getCatalogMinScoreForQuery(qTrim, options?.searchSource ?? 'manual');
    let indices = queryProductIndicesWithManualFallback(idx, catalog, qTrim, minScore);
    indices = applySearchRulesToIndices(qTrim, indices, catalog, rules);
    const allowed = new Set(indices);
    return catalog.map((_, i) => i).filter((i) => allowed.has(i));
  }

  const q = qTrim.toLowerCase();
  const substringIndices = catalog
    .map((_, i) => i)
    .filter((i) => {
      const p = catalog[i]!;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    });
  return applySearchRulesToIndices(qTrim, substringIndices, catalog, rules);
}

/**
 * Search-only slice of the catalog — same rules as the Products panel and Add Products list.
 * STORY-193: Used when importing Excel/paste/sync so a non-empty workspace search does not load the full file/API response.
 */
export function filterCatalogBySearchQuery(
  catalog: ProductItem[],
  searchQuery: string,
  options?: FilterProductsForSelectionOptions,
): ProductItem[] {
  const qTrim = normalizeSearchQueryForPipeline(searchQuery);
  if (!qTrim) return catalog;
  const indices = filterCatalogIndicesBySearchQuery(catalog, searchQuery, options);
  return indices.map((i) => catalog[i]!);
}

/** STORY-206: After search, restrict which catalog rows appear (canvas = on-ad by name). */
export type ProductSelectionCanvasScope = 'all' | 'not_on_canvas' | 'only_on_canvas';

/**
 * @param canvasScope — When `namesOnCanvas` is set: filter after search. If `null`, canvas filtering is skipped (use only for legacy).
 * @param legacyShowOnlyUnused — When `namesOnCanvas` is omitted: hide rows checked in the panel (legacy “unused”).
 */
export function filterProductsForSelectionPanel(
  catalog: ProductItem[],
  searchQuery: string,
  namesOnCanvas: string[] | undefined,
  selectedNames: Set<string>,
  canvasScope: ProductSelectionCanvasScope | null,
  legacyShowOnlyUnused: boolean,
  options?: FilterProductsForSelectionOptions,
): ProductItem[] {
  let result = filterCatalogBySearchQuery(catalog, searchQuery, options);
  if (namesOnCanvas !== undefined) {
    const onCanvas = new Set(namesOnCanvas);
    const scope = canvasScope ?? 'not_on_canvas';
    if (scope === 'not_on_canvas') {
      result = result.filter((p) => !onCanvas.has(p.name));
    } else if (scope === 'only_on_canvas') {
      result = result.filter((p) => onCanvas.has(p.name));
    }
  } else if (legacyShowOnlyUnused) {
    result = result.filter((p) => !selectedNames.has(p.name));
  }
  return result;
}

/** Products available for a “next ad” / not on current canvas (legacy: not in panel selection). */
export function remainingCatalogForNewAd(
  catalog: ProductItem[],
  namesOnCanvas: string[] | undefined,
  selectedNames: Set<string>,
): ProductItem[] {
  if (namesOnCanvas !== undefined) {
    const onCanvas = new Set(namesOnCanvas);
    return catalog.filter((p) => !onCanvas.has(p.name));
  }
  return catalog.filter((p) => !selectedNames.has(p.name));
}

/**
 * STORY-193: After Excel/API/paste, narrow rows to the active workspace search (same scoring as Add Products).
 * Always builds a fresh index on `importedRows` (new dataset).
 */
export function filterImportedCatalogByActiveSearch(
  importedRows: ProductItem[],
  searchQuery: string,
): ProductItem[] {
  const q = searchQuery.trim();
  if (!q || importedRows.length === 0) return importedRows;
  const idx = buildSearchIndex(importedRows);
  return filterCatalogBySearchQuery(importedRows, q, {
    catalogSearchIndex: idx,
    searchSource: 'manual',
  });
}
