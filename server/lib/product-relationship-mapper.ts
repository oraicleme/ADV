/**
 * ProductRelationshipMapper
 * Maps relationships between products (e.g., cases to phones)
 * Groups products intelligently by model and type
 */

import type { ExtractedProductStructure } from './product-structure-extractor';

export interface ProductGroup {
  modelKey: string; // e.g., "Apple iPhone 15 Pro"
  brand?: string;
  model?: string;
  mainProducts: ExtractedProductStructure[]; // Phones/devices
  accessories: ExtractedProductStructure[]; // Cases, chargers, etc.
  allProducts: ExtractedProductStructure[];
}

export interface ProductRelationship {
  mainProduct: ExtractedProductStructure;
  relatedProducts: ExtractedProductStructure[];
  relationshipType: 'accessory' | 'variant' | 'related';
}

export class ProductRelationshipMapper {
  /**
   * Map all products and create intelligent groups
   */
  static mapProductRelationships(products: ExtractedProductStructure[]): ProductGroup[] {
    const groups = new Map<string, ProductGroup>();

    // First pass: Create groups by model
    for (const product of products) {
      const modelKey = this.generateModelKey(product);

      if (!groups.has(modelKey)) {
        groups.set(modelKey, {
          modelKey,
          brand: product.brand,
          model: product.model,
          mainProducts: [],
          accessories: [],
          allProducts: [],
        });
      }

      const group = groups.get(modelKey)!;
      group.allProducts.push(product);

      // Categorize by product type
      if (product.productType === 'phone') {
        group.mainProducts.push(product);
      } else if (['case', 'accessory', 'charger', 'screen_protector'].includes(product.productType)) {
        group.accessories.push(product);
      } else {
        group.mainProducts.push(product);
      }
    }

    // Second pass: Link accessories to main products
    const groupArray = Array.from(groups.values());
    for (const group of groupArray) {
      // If group has no main products but has accessories, try to find parent model
      if (group.mainProducts.length === 0 && group.accessories.length > 0) {
        const parentKey = this.findParentModel(group, groupArray);
        if (parentKey) {
          const parentGroup = groups.get(parentKey);
          if (parentGroup) {
            // Move accessories to parent group
            parentGroup.accessories.push(...group.accessories);
            parentGroup.allProducts.push(...group.accessories);
            groups.delete(group.modelKey);
          }
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by: main products first, then by model name
      if (a.mainProducts.length !== b.mainProducts.length) {
        return b.mainProducts.length - a.mainProducts.length;
      }
      return (a.modelKey || '').localeCompare(b.modelKey || '');
    });
  }

  /**
   * Generate a unique key for a product model
   */
  private static generateModelKey(product: ExtractedProductStructure): string {
    if (product.model && product.brand) {
      return `${product.brand} ${product.model}`;
    }

    if (product.model) {
      return product.model;
    }

    if (product.brand) {
      return product.brand;
    }

    // For accessories without clear model, use category + keywords
    const tags = product.tags.slice(0, 2).join(' ');
    return tags || product.category;
  }

  /**
   * Find parent model for accessories
   */
  private static findParentModel(
    group: ProductGroup,
    allGroups: ProductGroup[]
  ): string | null {
    if (!group.accessories.length) return null;

    const firstAccessory = group.accessories[0];
    const accessoryNameLower = firstAccessory.originalName.toLowerCase();

    // Look for a group whose model is mentioned in the accessory name
    for (const otherGroup of allGroups) {
      if (otherGroup.modelKey === group.modelKey) continue;

      const modelKeyLower = otherGroup.modelKey.toLowerCase();
      const keywords = modelKeyLower.split(' ');

      if (keywords.some((keyword) => accessoryNameLower.includes(keyword))) {
        return otherGroup.modelKey;
      }
    }

    return null;
  }

  /**
   * Get all products related to a specific model
   */
  static getRelatedProducts(
    modelKey: string,
    groups: ProductGroup[]
  ): ProductRelationship[] {
    const group = groups.find((g) => g.modelKey === modelKey);
    if (!group || group.mainProducts.length === 0) return [];

    return group.mainProducts.map((mainProduct) => ({
      mainProduct,
      relatedProducts: group.accessories,
      relationshipType: 'accessory',
    }));
  }

  /**
   * Find best products for agent suggestions
   * Returns main products grouped by model
   */
  static findBestProductsForAgent(
    groups: ProductGroup[],
    limit: number = 20
  ): ExtractedProductStructure[] {
    const result: ExtractedProductStructure[] = [];

    for (const group of groups) {
      // Add main products first
      result.push(...group.mainProducts.slice(0, 2));

      if (result.length >= limit) break;

      // Add some accessories if space available
      const accessorySpace = Math.min(3, limit - result.length);
      result.push(...group.accessories.slice(0, accessorySpace));

      if (result.length >= limit) break;
    }

    return result.slice(0, limit);
  }

  /**
   * Get products filtered by type
   */
  static filterByType(
    products: ExtractedProductStructure[],
    types: string[]
  ): ExtractedProductStructure[] {
    return products.filter((p) => types.includes(p.productType));
  }

  /**
   * Get products filtered by brand
   */
  static filterByBrand(
    products: ExtractedProductStructure[],
    brands: string[]
  ): ExtractedProductStructure[] {
    return products.filter((p) => p.brand && brands.includes(p.brand));
  }

  /**
   * Search products by tag
   */
  static searchByTag(
    products: ExtractedProductStructure[],
    searchTerm: string
  ): ExtractedProductStructure[] {
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.tags.some((tag) => tag.toLowerCase().includes(term)) ||
        p.originalName.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term)
    );
  }
}

export default ProductRelationshipMapper;
