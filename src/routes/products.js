const express = require('express');
const router = express.Router();
const products = require('../services/products');

// GET /api/products - все товары
router.get('/', (req, res) => {
  try { 
    res.json({ success: true, data: products.getAll() }); 
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// GET /api/products/:id - один товар
router.get('/:id', (req, res) => {
  try {
    const p = products.getById(parseInt(req.params.id));
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// POST /api/products - создать
router.post('/', (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, error: 'Required: name, category, price' });
    }
    const p = products.create(req.body);
    res.status(201).json({ success: true, data: p });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// PUT /api/products/:id - обновить
router.put('/:id', (req, res) => {
  try {
    const p = products.update(parseInt(req.params.id), req.body);
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: p });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// DELETE /api/products/:id - удалить
router.delete('/:id', (req, res) => {
  try {
    const ok = products.remove(parseInt(req.params.id));
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

module.exports = router;
