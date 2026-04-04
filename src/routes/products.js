const express = require('express');
const router = express.Router();
const products = require('../services/products');
const {
  normalizeBlindsType,
  parseOptionalBoolean,
  parsePositiveNumber,
  sanitizeLongText,
  sanitizeText
} = require('../utils/sanitize');
const { resolveAssetUrl } = require('../utils/http');

function serializeProduct(req, product) {
  return {
    ...product,
    image: resolveAssetUrl(req, product.image)
  };
}

function parseProductPayload(body, { partial = false } = {}) {
  const payload = {};
  const name = sanitizeText(body.name, 120);
  const category = normalizeBlindsType(body.category);
  const description = sanitizeLongText(body.description, 2000);
  const image = sanitizeText(body.image, 1000);
  const price = parsePositiveNumber(body.price);
  const inStock = parseOptionalBoolean(body.in_stock ?? body.inStock);

  if (!partial || body.name !== undefined) payload.name = name;
  if (!partial || body.category !== undefined) payload.category = category;
  if (!partial || body.description !== undefined) payload.description = description;
  if (!partial || body.image !== undefined) payload.image = image;
  if (!partial || body.price !== undefined) payload.price = price;
  if (!partial || body.in_stock !== undefined || body.inStock !== undefined) payload.in_stock = inStock;

  return payload;
}

// GET /api/products - все товары
router.get('/', (req, res) => {
  try { 
    const data = products.getAll().map((product) => serializeProduct(req, product));
    res.json({ success: true, data }); 
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// GET /api/products/:id - один товар
router.get('/:id', (req, res) => {
  try {
    const p = products.getById(parseInt(req.params.id));
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: serializeProduct(req, p) });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// POST /api/products - создать
router.post('/', (req, res) => {
  try {
    const payload = parseProductPayload(req.body);

    if (!payload.name || !payload.category || !payload.price) {
      return res.status(400).json({ success: false, error: 'Required: name, category, price' });
    }

    const p = products.create(payload);
    res.status(201).json({ success: true, data: serializeProduct(req, p) });
  } catch(e) { 
    res.status(500).json({ success: false, error: e.message }); 
  }
});

// PUT /api/products/:id - обновить
router.put('/:id', (req, res) => {
  try {
    const payload = parseProductPayload(req.body, { partial: true });

    if (req.body.price !== undefined && payload.price === null) {
      return res.status(400).json({ success: false, error: 'Invalid price' });
    }

    const p = products.update(parseInt(req.params.id), payload);
    if (!p) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: serializeProduct(req, p) });
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
