/**
 * Product Selection for Agents
 * Intelligently selects ALL relevant products for agent suggestions using fuzzy search
 * IMPORTANT: Agents MUST receive ALL relevant products, not just top 5
 */

export interface ProductItem {
  id: string;
  name: string;
  code?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  category?: string;
  description?: string;
  image?: string;
}

export interface ProductSelectionResult {
  selectedProducts: ProductItem[];
  totalMatches: number;
  searchQuery: string;
  matchType: "exact" | "category" | "fuzzy" | "all";
  confidence: number;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Used for fuzzy matching product names
 */
function calculateSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (q === t) return 1; // Exact match
  if (t.includes(q)) return 0.95; // Substring match
  if (q.includes(t)) return 0.85; // Reverse substring match

  // Levenshtein-inspired: count matching characters in order
  let matches = 0;
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      matches++;
      qIdx++;
    }
  }

  // Bonus for consecutive matches
  const consecutiveBonus = t.match(new RegExp(q.split("").join(".*?"), "i")) ? 0.1 : 0;
  return Math.min(1, matches / Math.max(q.length, t.length) + consecutiveBonus);
}

/**
 * Extract category from product name
 * e.g., "Futrola Abstract za iPhone 15 Pro" -> "iPhone 15 Pro"
 */
function extractCategory(productName: string): string {
  const q = productName.toLowerCase();

  // Common product categories
  const categories = [
    "iphone",
    "ipad",
    "airpods",
    "apple watch",
    "samsung",
    "xiaomi",
    "oneplus",
    "google pixel",
    "motorola",
    "nokia",
  ];

  for (const cat of categories) {
    if (q.includes(cat)) {
      return cat;
    }
  }

  return "";
}

/**
 * Select ALL relevant products for agent using fuzzy search
 * CRITICAL: Must return ALL matching products, not just top 5
 *
 * @param products - All available products
 * @param userRequest - User's request (e.g., "Show me iPhone 15 Pro cases")
 * @param options - Selection options
 * @returns All relevant products with metadata
 */
export function selectProductsForAgent(
  products: ProductItem[],
  userRequest: string,
  options: {
    minSimilarity?: number;
    categoryBoost?: number;
  } = {}
): ProductSelectionResult {
  const { minSimilarity = 0.3, categoryBoost = 0.15 } = options;
  const q = userRequest.toLowerCase().trim();

  if (!products || products.length === 0) {
    return {
      selectedProducts: [],
      totalMatches: 0,
      searchQuery: q,
      matchType: "all",
      confidence: 0,
    };
  }

  // Extract likely product category from request
  const requestCategory = extractCategory(q);

  // Score all products
  const scored = products.map((product) => {
    let score = 0;

    // Name similarity
    const nameScore = calculateSimilarity(q, product.name);
    score += nameScore * 0.7;

    // Code similarity (if available)
    if (product.code) {
      const codeScore = calculateSimilarity(q, product.code);
      score += codeScore * 0.2;
    }

    // Category boost (if product matches request category)
    if (requestCategory && product.name.toLowerCase().includes(requestCategory)) {
      score += categoryBoost;
    }

    return { product, score };
  });

  // Filter and sort by score
  const selected = scored
    .filter((s) => s.score >= minSimilarity)
    .sort((a, b) => b.score - a.score);

  // Determine match type and confidence
  let matchType: "exact" | "category" | "fuzzy" | "all" = "fuzzy";
  let confidence = 0;

  if (selected.length === 0) {
    // No matches - return all products
    matchType = "all";
    confidence = 0;
    return {
      selectedProducts: products,
      totalMatches: products.length,
      searchQuery: q,
      matchType,
      confidence,
    };
  }

  // Check if any product is an exact match (substring or exact)
  const exactMatch = selected.find((s) => s.score >= 0.95);
  if (exactMatch) {
    matchType = "exact";
    confidence = exactMatch.score;
  } else if (selected[0].score >= 0.8) {
    matchType = "category";
    confidence = selected[0].score;
  } else {
    matchType = "fuzzy";
    confidence = selected[0].score;
  }

  return {
    selectedProducts: selected.map((s) => s.product),
    totalMatches: selected.length,
    searchQuery: q,
    matchType,
    confidence,
  };
}

/**
 * Get products used in current ad and return remaining products
 * Used for "Create new ad with remaining products" feature
 */
export function getRemainingProducts(
  allProducts: ProductItem[],
  usedProductIds: string[]
): ProductItem[] {
  const usedSet = new Set(usedProductIds);
  return allProducts.filter((p) => !usedSet.has(p.id));
}

/**
 * Format selected products for agent prompt
 * Shows all relevant products with key details
 */
export function formatSelectedProductsForPrompt(
  selectedProducts: ProductItem[],
  maxProducts: number = 50
): string {
  if (selectedProducts.length === 0) {
    return "No products selected.";
  }

  const lines: string[] = [];
  lines.push(`📦 Selected Products (${selectedProducts.length} total):`);
  lines.push("");

  // Show all products (or first maxProducts if very large)
  const productsToShow = selectedProducts.slice(0, maxProducts);

  for (let i = 0; i < productsToShow.length; i++) {
    const p = productsToShow[i];
    let line = `${i + 1}. ${p.name}`;

    if (p.code) line += ` [${p.code}]`;
    if (p.price) line += ` - $${p.price}`;
    if (p.discount) line += ` (${p.discount}% off)`;

    lines.push(line);
  }

  if (selectedProducts.length > maxProducts) {
    lines.push(`... and ${selectedProducts.length - maxProducts} more products`);
  }

  return lines.join("\n");
}

/**
 * Group products by similarity for better agent understanding
 * e.g., all iPhone 15 Pro cases together
 */
export function groupProductsByName(
  products: ProductItem[]
): Map<string, ProductItem[]> {
  const groups = new Map<string, ProductItem[]>();

  for (const product of products) {
    // Extract first 2-3 words as group key
    const words = product.name.toLowerCase().split(/\s+/);
    const groupKey = words.slice(0, 3).join(" ");

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(product);
  }

  return groups;
}
