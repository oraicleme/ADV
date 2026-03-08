/**
 * Catalog and external API integration schema
 */

import { mysqlTable, varchar, text, int, timestamp, boolean, decimal, json, index } from 'drizzle-orm/mysql-core';

/**
 * External API configurations stored per user
 */
export const externalAPIConfigs = mysqlTable(
  'external_api_configs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'rest', 'graphql', 'soap', 'custom'
    endpoint: text('endpoint').notNull(),
    method: varchar('method', { length: 10 }).default('GET'),
    headers: json('headers'),
    auth: json('auth'), // Encrypted in production
    responsePath: varchar('response_path', { length: 255 }),
    graphqlQuery: text('graphql_query'),
    fieldMappings: json('field_mappings').notNull(),
    pagination: json('pagination'),
    rateLimit: json('rate_limit'),
    isActive: boolean('is_active').default(true),
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncStatus: varchar('last_sync_status', { length: 50 }), // 'success', 'failed', 'pending'
    lastSyncError: text('last_sync_error'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    activeIdx: index('active_idx').on(table.isActive),
  }),
);

/**
 * Cached product catalog from external APIs
 */
export const catalogProducts = mysqlTable(
  'catalog_products',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    configId: varchar('config_id', { length: 36 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(), // ID from external system
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 100 }),
    price: decimal('price', { precision: 10, scale: 2 }),
    retailPrice: decimal('retail_price', { precision: 10, scale: 2 }),
    originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
    discountPercent: int('discount_percent'),
    category: varchar('category', { length: 255 }),
    brand: varchar('brand', { length: 255 }),
    currency: varchar('currency', { length: 10 }),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 500 }),
    rawData: json('raw_data'), // Store original API response for debugging
    isActive: boolean('is_active').default(true),
    syncedAt: timestamp('synced_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    configIdIdx: index('config_id_idx').on(table.configId),
    externalIdIdx: index('external_id_idx').on(table.externalId),
    codeIdx: index('code_idx').on(table.code),
    nameIdx: index('name_idx').on(table.name),
  }),
);

/**
 * Catalog sync history and logs
 */
export const catalogSyncLogs = mysqlTable(
  'catalog_sync_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    configId: varchar('config_id', { length: 36 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // 'success', 'failed', 'partial'
    startedAt: timestamp('started_at').notNull(),
    completedAt: timestamp('completed_at'),
    productsFetched: int('products_fetched').default(0),
    productsInserted: int('products_inserted').default(0),
    productsUpdated: int('products_updated').default(0),
    productsSkipped: int('products_skipped').default(0),
    error: text('error'),
    details: json('details'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    configIdIdx: index('config_id_idx').on(table.configId),
    statusIdx: index('status_idx').on(table.status),
  }),
);

/**
 * Catalog sync schedules
 */
export const catalogSyncSchedules = mysqlTable(
  'catalog_sync_schedules',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    configId: varchar('config_id', { length: 36 }).notNull(),
    frequency: varchar('frequency', { length: 50 }).notNull(), // 'manual', 'hourly', 'daily', 'weekly'
    dayOfWeek: int('day_of_week'), // 0-6 for weekly
    hourOfDay: int('hour_of_day'), // 0-23
    isActive: boolean('is_active').default(true),
    nextSyncAt: timestamp('next_sync_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    configIdIdx: index('config_id_idx').on(table.configId),
    activeIdx: index('active_idx').on(table.isActive),
  }),
);

/**
 * API credentials vault (encrypted)
 */
export const apiCredentialsVault = mysqlTable(
  'api_credentials_vault',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    configId: varchar('config_id', { length: 36 }).notNull(),
    credentialType: varchar('credential_type', { length: 50 }).notNull(), // 'bearer', 'api-key', 'basic', 'oauth2'
    encryptedValue: text('encrypted_value').notNull(), // AES-256 encrypted
    expiresAt: timestamp('expires_at'), // For OAuth tokens
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    configIdIdx: index('config_id_idx').on(table.configId),
  }),
);
