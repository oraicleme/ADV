/**
 * Product Optimizer
 * Reduces token usage by intelligently sampling and summarizing large product catalogs
 */

export interface ProductItem {
  id: string;
  name: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  category?: string;
  description?: string;
  image?: string;
}

export interface OptimizedCatalog {
  totalProducts: number;
  topProducts: ProductItem[];
  categorySummary: Record<string, { count: number; avgPrice: number; topNames: string[] }>;
  priceStats: {
    min: number;
    max: number;
    avg: number;
  };
  discountStats: {
    hasDiscounts: boolean;
    avgDiscount: number;
    maxDiscount: number;
  };
}

/**
 * Optimize large product catalog for LLM consumption
 * Reduces 6213 products to ~500 tokens instead of 50k+ tokens
 */
export function optimizeProductCatalog(
  products: ProductItem[],
  maxTopProducts: number = 20
): OptimizedCatalog {
  if (!products || products.length === 0) {
    return {
      totalProducts: 0,
      topProducts: [],
      categorySummary: {},
      priceStats: { min: 0, max: 0, avg: 0 },
      discountStats: { hasDiscounts: false, avgDiscount: 0, maxDiscount: 0 },
    };
  }

  // Sort by discount (highest first) or price (highest first)
  const sortedProducts = [...products].sort((a, b) => {
    const discountA = a.discount || 0;
    const discountB = b.discount || 0;
    if (discountA !== discountB) return discountB - discountA;
    return (b.price || 0) - (a.price || 0);
  });

  // Get top products (most discounted/expensive)
  const topProducts = sortedProducts.slice(0, maxTopProducts);

  // Build category summary
  const categoryMap = new Map<string, ProductItem[]>();
  for (const product of products) {
    const category = product.category || "Uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(product);
  }

  const categorySummary: Record<string, { count: number; avgPrice: number; topNames: string[] }> = {};
  for (const [category, items] of categoryMap.entries()) {
    const prices = items.map((p) => p.price || 0).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const topNames = items
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 3)
      .map((p) => p.name);

    categorySummary[category] = {
      count: items.length,
      avgPrice: Math.round(avgPrice * 100) / 100,
      topNames,
    };
  }

  // Calculate price statistics
  const prices = products.map((p) => p.price || 0).filter((p) => p > 0);
  const priceStats = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    avg: prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0,
  };

  // Calculate discount statistics
  const discounts = products
    .map((p) => p.discount || 0)
    .filter((d) => d > 0);
  const discountStats = {
    hasDiscounts: discounts.length > 0,
    avgDiscount: discounts.length > 0 ? Math.round((discounts.reduce((a, b) => a + b, 0) / discounts.length) * 100) / 100 : 0,
    maxDiscount: discounts.length > 0 ? Math.max(...discounts) : 0,
  };

  return {
    totalProducts: products.length,
    topProducts,
    categorySummary,
    priceStats,
    discountStats,
  };
}

/**
 * Format optimized catalog for LLM prompt
 * Creates a concise summary that fits in token budget
 */
export function formatOptimizedCatalogForPrompt(optimized: OptimizedCatalog): string {
  const lines: string[] = [];

  lines.push(`📊 Catalog Summary: ${optimized.totalProducts} total products`);
  lines.push("");

  // Price range
  lines.push(`💰 Price Range: $${optimized.priceStats.min} - $${optimized.priceStats.max} (avg: $${optimized.priceStats.avg})`);

  // Discounts
  if (optimized.discountStats.hasDiscounts) {
    lines.push(`🏷️ Discounts: Up to ${optimized.discountStats.maxDiscount}% off (avg: ${optimized.discountStats.avgDiscount}%)`);
  }

  lines.push("");
  lines.push("📂 Categories:");
  for (const [category, stats] of Object.entries(optimized.categorySummary)) {
    lines.push(`  • ${category}: ${stats.count} products (avg $${stats.avgPrice})`);
    lines.push(`    Top: ${stats.topNames.join(", ")}`);
  }

  lines.push("");
  lines.push("⭐ Top Products (by discount/price):");
  for (const product of optimized.topProducts) {
    let line = `  • ${product.name}`;
    if (product.price) line += ` - $${product.price}`;
    if (product.discount) line += ` (${product.discount}% off)`;
    lines.push(line);
  }

  return lines.join("\n");
}

/**
 * Generate fallback suggestion when LLM fails
 */
export function generateFallbackSuggestion(
  agent: string,
  error: string,
  canvasState: any
): { title: string; description: string; reasoning: string; confidence: number } {
  const fallbacks: Record<string, { title: string; description: string; reasoning: string }> = {
    "design-agent": {
      title: "Improve Visual Hierarchy",
      description: "Add more contrast between headline and background for better readability",
      reasoning: "High contrast improves ad legibility and conversion rates",
    },
    "copy-agent": {
      title: "Strengthen CTA Message",
      description: "Make call-to-action button text more action-oriented (e.g., 'Shop Now' instead of 'Click')",
      reasoning: "Action-oriented CTAs increase click-through rates",
    },
    "product-agent": {
      title: "Highlight Best Sellers",
      description: "Feature your top-selling products more prominently in the ad layout",
      reasoning: "Showcasing popular items builds trust and drives sales",
    },
    "brand-agent": {
      title: "Strengthen Brand Consistency",
      description: "Ensure logo and brand colors are consistent throughout the ad",
      reasoning: "Brand consistency improves recognition and trust",
    },
    "optimization-agent": {
      title: "Optimize Ad Performance",
      description: "Consider A/B testing different headline variations to improve conversion",
      reasoning: "Data-driven testing reveals what resonates with your audience",
    },
  };

  const fallback = fallbacks[agent] || fallbacks["copy-agent"];

  return {
    ...fallback,
    confidence: 0.5, // Lower confidence for fallback
  };
}
