const express = require('express');
const router = express.Router();
const db = require('../database/db');

// === ОТЗЫВЫ ===

// GET /api/reviews - все отзывы
router.get('/', (req, res) => {
  try {
    const data = db.readDb();
    res.json({ success: true, data: data.reviews || [] });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reviews - создать отзыв
router.post('/', (req, res) => {
  try {
    const { name, blindsType, photos, comment, rating } = req.body;
    if (!name || !blindsType || !comment) {
      return res.status(400).json({ success: false, error: 'Required: name, blindsType, comment' });
    }
    
    const data = db.readDb();
    if (!data.reviews) data.reviews = [];
    
    const maxId = data.reviews.reduce((m, r) => Math.max(m, r.id || 0), 0);
    const review = {
      id: maxId + 1,
      name: name.trim(),
      blindsType,
      photos: photos || [],
      comment: comment.trim(),
      rating: rating || 5,
      created_at: new Date().toISOString()
    };
    
    data.reviews.push(review);
    db.writeDb(data);
    
    res.status(201).json({ success: true, data: review });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/reviews/:id - удалить отзыв
router.delete('/:id', (req, res) => {
  try {
    const data = db.readDb();
    const before = data.reviews.length;
    data.reviews = data.reviews.filter(r => r.id !== parseInt(req.params.id));
    db.writeDb(data);
    
    if (data.reviews.length < before) {
      res.json({ success: true, message: 'Deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Not found' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// === РАБОТЫ ===

// GET /api/reviews/works - все работы
router.get('/works', (req, res) => {
  try {
    const data = db.readDb();
    res.json({ success: true, data: data.works || [] });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reviews/works - создать работу
router.post('/works', (req, res) => {
  try {
    const { photo, title } = req.body;
    if (!photo) {
      return res.status(400).json({ success: false, error: 'Required: photo' });
    }
    
    const data = db.readDb();
    if (!data.works) data.works = [];
    
    const maxId = data.works.reduce((m, w) => Math.max(m, w.id || 0), 0);
    const work = {
      id: maxId + 1,
      photo,
      title: title || '',
      created_at: new Date().toISOString()
    };
    
    data.works.push(work);
    db.writeDb(data);
    
    res.status(201).json({ success: true, data: work });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/reviews/works/:id - удалить работу
router.delete('/works/:id', (req, res) => {
  try {
    const data = db.readDb();
    const before = data.works.length;
    data.works = data.works.filter(w => w.id !== parseInt(req.params.id));
    db.writeDb(data);
    
    if (data.works.length < before) {
      res.json({ success: true, message: 'Deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Not found' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
