const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/db.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDb({ products: [], orders: [] });
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('DB read error:', e.message);
    return { products: [], orders: [] };
  }
}

function writeDb(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

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
    image: data.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
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

module.exports.createOrder = (data) => {
  const db = readDb();
  const order = {
    id: Date.now(),
    name: data.name,
    phone: data.phone,
    blinds_type: data.blindsType,
    message: data.message || '',
    created_at: new Date().toISOString()
  };
  db.orders.push(order);
  writeDb(db);
  return order;
};

module.exports.getAllOrders = () => readDb().orders;

console.log('✅ Database initialized');
