import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function ensureDatabaseSchema(configuredPath?: string): void {
  const candidates = [
    configuredPath,
    process.env.DB_PATH,
    './takeaway.sqlite',
    '../takeaway.sqlite',
    './backend/takeaway.sqlite',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      runMigration(resolved);
      return;
    }
  }
}

function runMigration(dbPath: string): void {
  let db: Database.Database;
  try {
    db = new Database(dbPath);
  } catch (err) {
    console.warn(`[Database Migration] Could not open database at ${dbPath}:`, err);
    return;
  }

  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
      .get();
    if (!tableExists) {
      return;
    }

    const catCols = (db.prepare('PRAGMA table_info(categories)').all() as { name: string }[]).map(
      (c) => c.name,
    );

    if (catCols.includes('userId')) {
      // Check if we should seed mock user if mock user has 0 categories
      seedMockUserIfEmpty(db);
      return;
    }

    console.log(`[Database Migration] Migrating schema to user-scoped structure for database at ${dbPath}...`);

    db.pragma('foreign_keys = OFF');

    db.transaction(() => {
      const users = db.prepare('SELECT id FROM users ORDER BY createdAt ASC').all() as { id: string }[];
      const targetUserId =
        users.find((u) => u.id === 'c9fe9945-d856-4d40-a867-ab9bf4c6bd5b')?.id ||
        users[0]?.id ||
        '00000000-0000-0000-0000-000000000001';

      // 1. Categories
      db.exec(`
        CREATE TABLE "categories_new" (
          "id" varchar PRIMARY KEY NOT NULL,
          "userId" varchar NOT NULL,
          "slug" varchar NOT NULL,
          "name" varchar NOT NULL,
          "parentGroup" varchar,
          "icon" varchar NOT NULL DEFAULT ('list'),
          "sortOrder" integer NOT NULL DEFAULT (0),
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "UQ_categories_userId_slug" UNIQUE ("userId", "slug"),
          CONSTRAINT "FK_categories_userId" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
        );

        INSERT INTO "categories_new" ("id", "userId", "slug", "name", "parentGroup", "icon", "sortOrder", "createdAt", "updatedAt")
        SELECT "id", '${targetUserId}', "slug", "name", "parentGroup", "icon", "sortOrder", "createdAt", "updatedAt"
        FROM "categories";

        DROP TABLE "categories";
        ALTER TABLE "categories_new" RENAME TO "categories";
        CREATE INDEX "IDX_categories_userId" ON "categories" ("userId");

        -- 2. Items
        CREATE TABLE "items_new" (
          "id" varchar PRIMARY KEY NOT NULL,
          "userId" varchar NOT NULL,
          "name" varchar NOT NULL,
          "description" text,
          "tags" text NOT NULL DEFAULT ('[]'),
          "defaultQuantity" integer NOT NULL DEFAULT (1),
          "isPreparation" boolean NOT NULL DEFAULT (0),
          "minDays" integer,
          "toBuy" boolean NOT NULL DEFAULT (0),
          "imageUrl" varchar,
          "sortOrder" integer NOT NULL DEFAULT (0),
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "FK_items_userId" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
        );

        INSERT INTO "items_new" ("id", "userId", "name", "description", "tags", "defaultQuantity", "isPreparation", "minDays", "toBuy", "imageUrl", "sortOrder", "createdAt", "updatedAt")
        SELECT "id", '${targetUserId}', "name", "description", "tags", "defaultQuantity", "isPreparation", "minDays", "toBuy", "imageUrl", "sortOrder", "createdAt", "updatedAt"
        FROM "items";

        DROP TABLE "items";
        ALTER TABLE "items_new" RENAME TO "items";
        CREATE INDEX "IDX_items_userId" ON "items" ("userId");

        -- 3. Category Items
        CREATE TABLE "category_items_new" (
          "id" varchar PRIMARY KEY NOT NULL,
          "userId" varchar NOT NULL,
          "categoryId" varchar NOT NULL,
          "itemId" varchar NOT NULL,
          "sortOrder" integer NOT NULL DEFAULT (0),
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "UQ_category_items_cat_item" UNIQUE ("categoryId", "itemId"),
          CONSTRAINT "FK_category_items_userId" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
          CONSTRAINT "FK_category_items_categoryId" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE,
          CONSTRAINT "FK_category_items_itemId" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE CASCADE
        );

        INSERT INTO "category_items_new" ("id", "userId", "categoryId", "itemId", "sortOrder", "createdAt", "updatedAt")
        SELECT "id", '${targetUserId}', "categoryId", "itemId", "sortOrder", "createdAt", "updatedAt"
        FROM "category_items";

        DROP TABLE "category_items";
        ALTER TABLE "category_items_new" RENAME TO "category_items";
        CREATE INDEX "IDX_category_items_userId" ON "category_items" ("userId");
        CREATE INDEX "IDX_category_items_categoryId" ON "category_items" ("categoryId");
        CREATE INDEX "IDX_category_items_itemId" ON "category_items" ("itemId");
      `);
    })();

    db.pragma('foreign_keys = ON');
    console.log('[Database Migration] Schema migration completed successfully.');

    seedMockUserIfEmpty(db);
  } catch (error) {
    console.error('[Database Migration] Error during migration:', error);
    throw error;
  } finally {
    db.close();
  }
}

function seedMockUserIfEmpty(db: Database.Database): void {
  try {
    const mockUser = db
      .prepare("SELECT id FROM users WHERE subject = 'mock-local-user'")
      .get() as { id: string } | undefined;
    if (!mockUser) {
      return;
    }

    const mockCatCount = db
      .prepare('SELECT count(*) as c FROM categories WHERE userId = ?')
      .get(mockUser.id) as { c: number };
    if (mockCatCount.c > 0) {
      return;
    }

    // Find a source user that has categories
    const sourceUser = db
      .prepare('SELECT userId FROM categories GROUP BY userId ORDER BY count(*) DESC LIMIT 1')
      .get() as { userId: string } | undefined;
    if (!sourceUser || sourceUser.userId === mockUser.id) {
      return;
    }

    console.log(`[Database Migration] Copying catalog from user ${sourceUser.userId} to mock user ${mockUser.id}...`);

    db.transaction(() => {
      const categories = db
        .prepare('SELECT * FROM categories WHERE userId = ?')
        .all(sourceUser.userId) as any[];
      const catIdMap = new Map<string, string>();

      const insertCat = db.prepare(`
        INSERT INTO categories (id, userId, slug, name, parentGroup, icon, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (const cat of categories) {
        const newCatId = randomUUID();
        catIdMap.set(cat.id, newCatId);
        insertCat.run(newCatId, mockUser.id, cat.slug, cat.name, cat.parentGroup, cat.icon, cat.sortOrder);
      }

      const items = db
        .prepare('SELECT * FROM items WHERE userId = ?')
        .all(sourceUser.userId) as any[];
      const itemIdMap = new Map<string, string>();

      const insertItem = db.prepare(`
        INSERT INTO items (id, userId, name, description, tags, defaultQuantity, isPreparation, minDays, toBuy, imageUrl, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (const item of items) {
        const newItemId = randomUUID();
        itemIdMap.set(item.id, newItemId);
        insertItem.run(
          newItemId,
          mockUser.id,
          item.name,
          item.description,
          item.tags,
          item.defaultQuantity,
          item.isPreparation,
          item.minDays,
          item.toBuy,
          item.imageUrl,
          item.sortOrder,
        );
      }

      const junctions = db
        .prepare('SELECT * FROM category_items WHERE userId = ?')
        .all(sourceUser.userId) as any[];

      const insertJunction = db.prepare(`
        INSERT INTO category_items (id, userId, categoryId, itemId, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (const j of junctions) {
        const newCatId = catIdMap.get(j.categoryId);
        const newItemId = itemIdMap.get(j.itemId);
        if (newCatId && newItemId) {
          insertJunction.run(randomUUID(), mockUser.id, newCatId, newItemId, j.sortOrder);
        }
      }
    })();

    console.log('[Database Migration] Mock user catalog seeded successfully.');
  } catch (err) {
    console.warn('[Database Migration] Could not seed mock user catalog:', err);
  }
}

