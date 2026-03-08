/**
 * Universal External API Connector
 * Works with ANY ERP/catalog system without specific connector code
 * Supports: REST APIs, GraphQL, SOAP, custom formats
 */

import type { ProductItem } from '../../client/src/lib/ad-constants';

/**
 * Configuration for connecting to an external API
 */
export interface ExternalAPIConfig {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'soap' | 'custom';
  endpoint: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'api-key' | 'basic' | 'oauth2' | 'custom';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
    customHeader?: string;
  };
  // Path to products array in response (e.g., "data.products" or "result.items")
  responsePath?: string;
  // GraphQL query for graphql type
  graphqlQuery?: string;
  // Field mappings from API response to ProductItem
  fieldMappings: Record<string, string | undefined>;
  // Pagination config
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    pageSize?: number;
    pageParam?: string;
    offsetParam?: string;
    cursorParam?: string;
    hasMorePath?: string; // Path to check if more data exists
  };
  // Rate limiting
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
  };
}

/**
 * Response from external API
 */
export interface ExternalAPIResponse {
  success: boolean;
  products: ProductItem[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
  error?: string;
  rawData?: unknown;
}

/**
 * Universal connector that adapts to any API format
 */
export class UniversalExternalAPIConnector {
  private config: ExternalAPIConfig;
  private lastRequestTime: number = 0;

  constructor(config: ExternalAPIConfig) {
    this.config = config;
  }

  /**
   * Fetch products from external API with automatic format detection and adaptation
   */
  async fetchProducts(
    pageParam?: string | number,
    pageSize: number = 100,
  ): Promise<ExternalAPIResponse> {
    try {
      // Apply rate limiting
      await this.applyRateLimit();

      // Build request
      const { url, options } = this.buildRequest(pageParam, pageSize);

      // Make request
      const response = await fetch(url, options);

      if (!response.ok) {
        return {
          success: false,
          products: [],
          error: `API returned ${response.status}: ${response.statusText}`,
        };
      }

      // Parse response based on type
      let data: unknown;
      if (this.config.type === 'graphql') {
        data = await response.json();
        if ((data as any).errors) {
          return {
            success: false,
            products: [],
            error: `GraphQL error: ${JSON.stringify((data as any).errors)}`,
          };
        }
      } else {
        data = await response.json();
      }

      // Extract products array from response
      const productsArray = this.extractProductsArray(data);
      if (!Array.isArray(productsArray)) {
        return {
          success: false,
          products: [],
          error: 'Response does not contain products array',
          rawData: data,
        };
      }

      // Map fields and normalize products
      const products = productsArray
        .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
        .map((item) => this.mapProductFields(item as Record<string, unknown>));

      // Check for pagination info
      const { hasMore, nextCursor } = this.extractPaginationInfo(data);

      return {
        success: true,
        products,
        total: productsArray.length,
        hasMore,
        nextCursor,
        rawData: data,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        products: [],
        error: `Failed to fetch from API: ${errorMsg}`,
      };
    }
  }

  /**
   * Build HTTP request with proper headers and authentication
   */
  private buildRequest(pageParam?: string | number, pageSize: number = 100) {
    let url = this.config.endpoint;

    // Add pagination parameters
    if (this.config.pagination) {
      const params = new URLSearchParams();
      if (this.config.pagination.type === 'offset' && pageParam) {
        params.append(this.config.pagination.offsetParam || 'offset', String(pageParam));
      } else if (this.config.pagination.type === 'page' && pageParam) {
        params.append(this.config.pagination.pageParam || 'page', String(pageParam));
      } else if (this.config.pagination.type === 'cursor' && pageParam) {
        params.append(this.config.pagination.cursorParam || 'cursor', String(pageParam));
      }
      params.append(this.config.pagination.pageParam || 'limit', String(pageSize));

      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    // Add authentication
    if (this.config.auth) {
      switch (this.config.auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.config.auth.token}`;
          break;
        case 'api-key':
          headers[this.config.auth.apiKeyHeader || 'X-API-Key'] = this.config.auth.apiKey || '';
          break;
        case 'basic':
          const credentials = btoa(
            `${this.config.auth.username}:${this.config.auth.password}`,
          );
          headers['Authorization'] = `Basic ${credentials}`;
          break;
        case 'custom':
          if (this.config.auth.customHeader && this.config.auth.token) {
            headers[this.config.auth.customHeader] = this.config.auth.token;
          }
          break;
      }
    }

    // Build request body for GraphQL
    let body: string | undefined;
    if (this.config.type === 'graphql' && this.config.graphqlQuery) {
      body = JSON.stringify({
        query: this.config.graphqlQuery,
        variables: { limit: pageSize, offset: pageParam || 0 },
      });
    }

    return {
      url,
      options: {
        method: this.config.method || 'GET',
        headers,
        body,
      },
    };
  }

  /**
   * Extract products array from nested response structure
   */
  private extractProductsArray(data: unknown): unknown[] {
    if (!data || typeof data !== 'object') return [];

    // Try response path first
    if (this.config.responsePath) {
      const value = this.getNestedValue(data, this.config.responsePath);
      if (Array.isArray(value)) return value;
    }

    // Try common paths
    const commonPaths = [
      'products',
      'items',
      'data',
      'data.products',
      'data.items',
      'result',
      'result.products',
      'result.items',
      'rows',
      'records',
    ];

    for (const path of commonPaths) {
      const value = this.getNestedValue(data, path);
      if (Array.isArray(value)) return value;
    }

    // If root is array, return it
    if (Array.isArray(data)) return data;

    return [];
  }

  /**
   * Get value from nested object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Map API response fields to ProductItem
   */
  private mapProductFields(item: Record<string, unknown>): ProductItem {
    const getValue = (fieldPath?: string): string | undefined => {
      if (!fieldPath) return undefined;
      const value = this.getNestedValue(item, fieldPath);
      return value != null ? String(value).trim() || undefined : undefined;
    };

    const fieldMappings = this.config.fieldMappings;
    const name = getValue(fieldMappings['name']) || '';
    const code = getValue(fieldMappings['code']);
    const price = getValue(fieldMappings['price']);
    const retailPrice = getValue(fieldMappings['retailPrice']) || price;
    const originalPrice = getValue(fieldMappings['originalPrice']);
    const discountPercentStr = getValue(fieldMappings['discountPercent']);
    const discountPercent = discountPercentStr ? parseInt(discountPercentStr, 10) : undefined;
    const category = getValue(fieldMappings['category']);
    const brand = getValue(fieldMappings['brand']);
    const currency = getValue(fieldMappings['currency']);
    const description = getValue(fieldMappings['description']);

    return {
      name: name || code || 'Unnamed Product',
      code,
      price,
      retailPrice,
      originalPrice,
      discountPercent,
      category,
      brand,
      currency,
      description,
    };
  }

  /**
   * Extract pagination info from response
   */
  private extractPaginationInfo(data: unknown): { hasMore?: boolean; nextCursor?: string } {
    if (!this.config.pagination) return {};

    if (this.config.pagination.hasMorePath) {
      const hasMore = this.getNestedValue(data, this.config.pagination.hasMorePath);
      return { hasMore: Boolean(hasMore) };
    }

    // Try common pagination paths
    const commonPaths = ['hasMore', 'has_more', 'nextCursor', 'next_cursor', 'nextPage'];
    for (const path of commonPaths) {
      const value = this.getNestedValue(data, path);
      if (value) {
        if (path.includes('Cursor') || path.includes('cursor')) {
          return { nextCursor: String(value) };
        }
        return { hasMore: Boolean(value) };
      }
    }

    return {};
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const minInterval =
      this.config.rateLimit.requestsPerSecond
        ? 1000 / this.config.rateLimit.requestsPerSecond
        : this.config.rateLimit.requestsPerMinute
          ? 60000 / this.config.rateLimit.requestsPerMinute
          : 0;

    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Test connection to API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.fetchProducts(undefined, 1);
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Preset configurations for common ERP systems
 */
export const COMMON_ERP_PRESETS: Record<string, Partial<ExternalAPIConfig>> = {
  shopify: {
    type: 'rest',
    method: 'GET',
    endpoint: 'https://{shop}.myshopify.com/admin/api/2024-01/products.json',
    headers: {
      'X-Shopify-Access-Token': '{accessToken}',
    },
    responsePath: 'products',
    fieldMappings: {
      name: 'title',
      code: 'id',
      price: 'variants.0.price',
      category: 'product_type',
      brand: 'vendor',
      image: 'image.src',
      description: 'body_html',
    },
    pagination: {
      type: 'offset',
      pageSize: 250,
      offsetParam: 'limit',
    },
  },
  woocommerce: {
    type: 'rest',
    method: 'GET',
    endpoint: 'https://{domain}/wp-json/wc/v3/products',
    auth: {
      type: 'basic',
    },
    fieldMappings: {
      name: 'name',
      code: 'sku',
      price: 'price',
      retailPrice: 'regular_price',
      category: 'categories.0.name',
      brand: 'attributes.0.options.0',
      image: 'images.0.src',
      description: 'description',
    },
    pagination: {
      type: 'page',
      pageSize: 100,
      pageParam: 'page',
    },
  },
  magento: {
    type: 'rest',
    method: 'GET',
    endpoint: 'https://{domain}/rest/V1/products',
    auth: {
      type: 'bearer',
    },
    responsePath: 'items',
    fieldMappings: {
      name: 'name',
      code: 'sku',
      price: 'price',
      category: 'category_ids.0',
      image: 'media_gallery_entries.0.file',
      description: 'description',
    },
    pagination: {
      type: 'offset',
      pageSize: 100,
      offsetParam: 'searchCriteria[pageSize]',
      pageParam: 'searchCriteria[currentPage]',
    },
  },
  sap: {
    type: 'rest',
    method: 'GET',
    endpoint: 'https://{domain}/sap/opu/odata/sap/API_PRODUCT_SRV/Products',
    auth: {
      type: 'basic',
    },
    responsePath: 'd.results',
    fieldMappings: {
      name: 'ProductName',
      code: 'Product',
      price: 'Price',
      category: 'ProductCategory',
      brand: 'Brand',
      description: 'Description',
    },
    pagination: {
      type: 'offset',
      pageSize: 100,
      offsetParam: '$skip',
      pageParam: '$top',
    },
  },
};
