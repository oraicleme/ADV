/**
 * Context Isolation: Slice canvas state per agent to reduce token cost and hallucination.
 *
 * Each agent receives ONLY the data it needs:
 * - ProductAgent: catalogSummary, selectedProducts, productBlockOptions
 * - DesignAgent: layout, style, format, elementOrder, logoHeight/alignment
 * - CopyAgent: headline, badgeText, ctaButtons, disclaimerText, emojiOrIcon
 * - BrandAgent: style, logoHeight, logoAlignment, logoCompanion, format
 * - OptimizationAgent: full state (needs holistic view for conversion analysis)
 */

export interface FullCanvasState {
  headline: string;
  titleFontSize: number;
  emojiOrIcon: string;
  badgeText: string;
  ctaButtons: string[];
  disclaimerText: string;
  elementOrder: string[];
  layout: string;
  style: { backgroundColor: string; accentColor: string; fontFamily: string };
  logoHeight: number;
  logoAlignment: string;
  logoCompanion: string;
  productBlockOptions: {
    columns: number;
    imageHeight: number;
    showFields: { name: boolean; price: boolean; description: boolean };
  };
  productCount: number;
  format: { id: string; width: number; height: number };
  dataQuality: {
    hasAllCapsNames: boolean;
    hasMissingPrices: boolean;
    hasOriginalPrices: boolean;
    hasDiscounts: boolean;
    avgDescriptionLength: number;
    imageAnalysis?: unknown;
  };
  catalogSummary?: unknown;
  selectedProductIds?: string[];
  selectedProductNames?: string[];
}

export type AgentName = 'design-agent' | 'copy-agent' | 'product-agent' | 'brand-agent' | 'optimization-agent';

/** ProductAgent context — only catalog and product display settings */
export function sliceForProductAgent(state: FullCanvasState) {
  return {
    productBlockOptions: state.productBlockOptions,
    productCount: state.productCount,
    dataQuality: state.dataQuality,
    catalogSummary: state.catalogSummary,
    selectedProductIds: state.selectedProductIds,
    selectedProductNames: state.selectedProductNames,
    format: { id: state.format.id, width: state.format.width, height: state.format.height },
  };
}

/** DesignAgent context — layout, colors, spacing, format */
export function sliceForDesignAgent(state: FullCanvasState) {
  return {
    layout: state.layout,
    style: state.style,
    format: state.format,
    elementOrder: state.elementOrder,
    logoHeight: state.logoHeight,
    logoAlignment: state.logoAlignment,
    logoCompanion: state.logoCompanion,
    productBlockOptions: {
      columns: state.productBlockOptions.columns,
      imageHeight: state.productBlockOptions.imageHeight,
    },
    productCount: state.productCount,
    titleFontSize: state.titleFontSize,
  };
}

/** CopyAgent context — text content only */
export function sliceForCopyAgent(state: FullCanvasState) {
  return {
    headline: state.headline,
    titleFontSize: state.titleFontSize,
    emojiOrIcon: state.emojiOrIcon,
    badgeText: state.badgeText,
    ctaButtons: state.ctaButtons,
    disclaimerText: state.disclaimerText,
    dataQuality: {
      hasDiscounts: state.dataQuality.hasDiscounts,
      hasOriginalPrices: state.dataQuality.hasOriginalPrices,
    },
    productCount: state.productCount,
    format: { id: state.format.id },
  };
}

/** BrandAgent context — brand identity elements */
export function sliceForBrandAgent(state: FullCanvasState) {
  return {
    style: state.style,
    logoHeight: state.logoHeight,
    logoAlignment: state.logoAlignment,
    logoCompanion: state.logoCompanion,
    format: state.format,
    headline: state.headline,
    badgeText: state.badgeText,
  };
}

/** OptimizationAgent gets full state — needs holistic view for CRO analysis */
export function sliceForOptimizationAgent(state: FullCanvasState) {
  // Exclude catalogSummary (too large, not needed for CRO)
  const { catalogSummary, selectedProductIds, selectedProductNames, ...rest } = state;
  return rest;
}

/**
 * Get the appropriate context slice for a given agent.
 */
export function getContextSlice(agentName: AgentName, state: FullCanvasState): unknown {
  switch (agentName) {
    case 'product-agent':
      return sliceForProductAgent(state);
    case 'design-agent':
      return sliceForDesignAgent(state);
    case 'copy-agent':
      return sliceForCopyAgent(state);
    case 'brand-agent':
      return sliceForBrandAgent(state);
    case 'optimization-agent':
      return sliceForOptimizationAgent(state);
    default:
      return state;
  }
}
