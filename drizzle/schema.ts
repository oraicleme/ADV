import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table for storing product information
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: varchar("price", { length: 50 }),
  photoUrl: text("photoUrl"),
  category: varchar("category", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Assets table for storing uploaded logos, product photos, and generated ads
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["logo", "product-photo", "generated-ad"]).notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 50 }),
  fileName: varchar("fileName", { length: 255 }),
  fileSize: int("fileSize"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Ads (creatives) table for storing generated advertisements
 */
export const ads = mysqlTable("ads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  headline: varchar("headline", { length: 200 }),
  badge: varchar("badge", { length: 100 }),
  ctaButtons: text("ctaButtons"),
  disclaimer: text("disclaimer"),
  layout: mysqlEnum("layout", ["single-hero", "grid-2-6", "category-groups", "sale-discount"]).default("single-hero"),
  format: mysqlEnum("format", ["viber-ig-story", "instagram-post", "facebook-ad", "custom"]).default("viber-ig-story"),
  customWidth: int("customWidth"),
  customHeight: int("customHeight"),
  backgroundColor: varchar("backgroundColor", { length: 7 }).default("#f8fafc"),
  accentColor: varchar("accentColor", { length: 7 }).default("#f97316"),
  fontFamily: varchar("fontFamily", { length: 50 }).default("System Sans"),
  logoUrl: text("logoUrl"),
  productIds: text("productIds"),
  generatedUrl: text("generatedUrl"),
  htmlContent: text("htmlContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ad = typeof ads.$inferSelect;
export type InsertAd = typeof ads.$inferInsert;