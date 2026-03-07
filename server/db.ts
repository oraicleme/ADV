import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, InsertProduct, assets, InsertAsset, ads, InsertAd } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Product queries
 */
export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(products).values(product);
}

export async function getUserProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.userId, userId));
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(products).where(and(eq(products.id, id), eq(products.userId, userId)));
}

/**
 * Asset queries
 */
export async function createAsset(asset: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assets).values(asset);
}

export async function getUserAssets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assets).where(eq(assets.userId, userId));
}

export async function deleteAsset(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
}

/**
 * Ad queries
 */
export async function createAd(ad: InsertAd) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(ads).values(ad);
}

export async function getUserAds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ads).where(eq(ads.userId, userId));
}

export async function getAdById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ads).where(and(eq(ads.id, id), eq(ads.userId, userId))).limit(1);
  return result[0];
}

export async function updateAd(id: number, userId: number, updates: Partial<InsertAd>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(ads).set(updates).where(and(eq(ads.id, id), eq(ads.userId, userId)));
}

export async function deleteAd(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(ads).where(and(eq(ads.id, id), eq(ads.userId, userId)));
}
