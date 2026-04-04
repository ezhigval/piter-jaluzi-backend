const fs = require('fs');
const path = require('path');
const config = require('../config');

const DB_PATH = config.dbPath;
const EMPTY_DB = { products: [], orders: [], reviews: [], works: [] };

function normalizeDb(data = {}) {
  return {
    products: Array.isArray(data.products) ? data.products : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    works: Array.isArray(data.works) ? data.works : []
  };
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = { ...EMPTY_DB };
      writeDb(initial);
      return initial;
    }

    return normalizeDb(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')));
  } catch (e) {
    console.error('DB read error:', e.message);
    return { ...EMPTY_DB };
  }
}

function writeDb(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, `${JSON.stringify(normalizeDb(data), null, 2)}\n`, 'utf8');
}

// === PRODUCTS ===
module.exports.getAllProducts = () => readDb().products;
module.exports.getProductById = (id) => readDb().products.find(p => p.id === id);
module.exports.createProduct = (data) => {
  const db = readDb();
  const maxId = db.products.reduce((m, p) => Math.max(m, p.id || 0), 0);
  const product = {
    id: maxId + 1,
    name: data.name,
    category: data.category,
    price: Number(data.price),
    description: data.description || '',
    image: data.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    in_stock: data.in_stock !== false,
    created_at: new Date().toISOString()
  };
  db.products.push(product);
  writeDb(db);
  return product;
};
module.exports.updateProduct = (id, data) => {
  const db = readDb();
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.products[idx] = { ...db.products[idx], ...data, updated_at: new Date().toISOString() };
  writeDb(db);
  return db.products[idx];
};
module.exports.deleteProduct = (id) => {
  const db = readDb();
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  writeDb(db);
  return db.products.length < before;
};

// === ORDERS ===
module.exports.createOrder = (data) => {
  const db = readDb();
  const blindsType = data.blindsType || data.blinds_type || '';
  const order = {
    id: Date.now(),
    name: data.name,
    phone: data.phone,
    blindsType,
    blinds_type: blindsType,
    message: data.message || '',
    created_at: new Date().toISOString()
  };
  db.orders.push(order);
  writeDb(db);
  return order;
};
module.exports.getAllOrders = () => readDb().orders;

// === REVIEWS & WORKS ===
module.exports.readDb = readDb;
module.exports.writeDb = writeDb;

console.log('✅ Database initialized');
