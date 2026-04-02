const db = require('../database/db');

module.exports = {
  getAll: db.getAllProducts,
  getById: db.getProductById,
  create: db.createProduct,
  update: db.updateProduct,
  remove: db.deleteProduct,
  getCategories: () => {
    const products = db.getAllProducts();
    return [...new Set(products.map(p => p.category))];
  }
};
