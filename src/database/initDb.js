const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DB_PATH = config.dbPath.replace(/\.json$/, '.db');
const JSON_PATH = config.dbPath;

let db = null;

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      in_stock INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      blindsType TEXT DEFAULT '',
      blinds_type TEXT DEFAULT '',
      message TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      blindsType TEXT NOT NULL,
      photos TEXT DEFAULT '[]',
      comment TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY,
      photo TEXT NOT NULL,
      title TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at);
    CREATE INDEX IF NOT EXISTS idx_works_created ON works(created_at);
  `);
}

function migrateFromJson() {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (count.c > 0) return;

  if (!fs.existsSync(JSON_PATH)) return;

  console.log('🔄 Migrating data from JSON to SQLite...');

  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const data = JSON.parse(raw);

    const insertProduct = db.prepare(
      'INSERT OR IGNORE INTO products (id, name, category, price, description, image, in_stock, created_at, updated_at) VALUES (@id, @name, @category, @price, @description, @image, @in_stock, @created_at, @updated_at)'
    );

    const insertOrder = db.prepare(
      'INSERT OR IGNORE INTO orders (id, name, phone, blindsType, blinds_type, message, created_at) VALUES (@id, @name, @phone, @blindsType, @blinds_type, @message, @created_at)'
    );

    const insertReview = db.prepare(
      'INSERT OR IGNORE INTO reviews (id, name, blindsType, photos, comment, rating, created_at) VALUES (@id, @name, @blindsType, @photos, @comment, @rating, @created_at)'
    );

    const insertWork = db.prepare(
      'INSERT OR IGNORE INTO works (id, photo, title, created_at) VALUES (@id, @photo, @title, @created_at)'
    );

    const insertAll = db.transaction((rows, insertFn) => {
      for (const row of rows) insertFn.run(row);
    });

    if (data.products?.length) {
      const rows = data.products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description || '',
        image: p.image || '',
        in_stock: p.in_stock ? 1 : 0,
        created_at: p.created_at,
        updated_at: p.updated_at || null
      }));
      insertAll(rows, insertProduct);
    }

    if (data.orders?.length) {
      const rows = data.orders.map(o => ({
        id: o.id,
        name: o.name,
        phone: o.phone,
        blindsType: o.blindsType || '',
        blinds_type: o.blinds_type || '',
        message: o.message || '',
        created_at: o.created_at
      }));
      insertAll(rows, insertOrder);
    }

    if (data.reviews?.length) {
      const rows = data.reviews.map(r => ({
        id: r.id,
        name: r.name,
        blindsType: r.blindsType,
        photos: Array.isArray(r.photos) ? JSON.stringify(r.photos) : '[]',
        comment: r.comment,
        rating: r.rating || 5,
        created_at: r.created_at
      }));
      insertAll(rows, insertReview);
    }

    if (data.works?.length) {
      const rows = data.works.map(w => ({
        id: w.id,
        photo: w.photo,
        title: w.title || '',
        created_at: w.created_at
      }));
      insertAll(rows, insertWork);
    }

    console.log('✅ Migration complete');

    // rename the json file to keep as backup
    fs.renameSync(JSON_PATH, JSON_PATH + '.migrated');
    console.log('📦 Original JSON saved as db.json.migrated');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  }
}

function initDb() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  migrateFromJson();

  console.log('💾 Database: SQLite (' + DB_PATH + ')');

  return db;
}

// auto-init on require
db = initDb();

module.exports = { initDb, getDb: () => db };
