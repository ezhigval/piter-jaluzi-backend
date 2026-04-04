const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { resolveAssetUrl } = require('../utils/http');
const {
  normalizeBlindsType,
  parseRating,
  sanitizeLongText,
  sanitizeStringArray,
  sanitizeText
} = require('../utils/sanitize');

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const left = new Date(b.created_at || 0).getTime();
    const right = new Date(a.created_at || 0).getTime();
    return left - right;
  });
}

function serializeReview(req, review) {
  return {
    ...review,
    photos: (review.photos || []).map((photo) => resolveAssetUrl(req, photo))
  };
}

function serializeWork(req, work, fallbackPhoto = '') {
  return {
    ...work,
    photo: resolveAssetUrl(req, work.photo || fallbackPhoto)
  };
}

// === ОТЗЫВЫ ===

// GET /api/reviews - все отзывы
router.get('/', (req, res) => {
  try {
    const data = db.readDb();
    const reviews = sortByCreatedAtDesc(data.reviews || []).map((review) => serializeReview(req, review));
    res.json({ success: true, data: reviews });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reviews - создать отзыв
router.post('/', (req, res) => {
  try {
    const { name, blindsType, photos, comment, rating } = req.body;
    const sanitizedName = sanitizeText(name, 120);
    const sanitizedBlindsType = normalizeBlindsType(blindsType);
    const sanitizedComment = sanitizeLongText(comment, 2000);
    const sanitizedPhotos = sanitizeStringArray(photos, 6, 1000);
    const sanitizedRating = parseRating(rating) || 5;

    if (!sanitizedName || !sanitizedBlindsType || !sanitizedComment) {
      return res.status(400).json({ success: false, error: 'Required: name, blindsType, comment' });
    }
    
    const data = db.readDb();
    if (!data.reviews) data.reviews = [];
    
    const maxId = data.reviews.reduce((m, r) => Math.max(m, r.id || 0), 0);
    const review = {
      id: maxId + 1,
      name: sanitizedName,
      blindsType: sanitizedBlindsType,
      photos: sanitizedPhotos,
      comment: sanitizedComment,
      rating: sanitizedRating,
      created_at: new Date().toISOString()
    };
    
    data.reviews.push(review);
    db.writeDb(data);
    
    res.status(201).json({ success: true, data: serializeReview(req, review) });
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
    const fallbackPhoto = data.products?.[0]?.image || '';
    const works = sortByCreatedAtDesc(data.works || []).map((work) => serializeWork(req, work, fallbackPhoto));
    res.json({ success: true, data: works });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reviews/works - создать работу
router.post('/works', (req, res) => {
  try {
    const { photo, title } = req.body;
    const sanitizedPhoto = sanitizeText(photo, 1000);
    const sanitizedTitle = sanitizeText(title, 140);

    if (!sanitizedPhoto) {
      return res.status(400).json({ success: false, error: 'Required: photo' });
    }
    
    const data = db.readDb();
    if (!data.works) data.works = [];
    
    const maxId = data.works.reduce((m, w) => Math.max(m, w.id || 0), 0);
    const work = {
      id: maxId + 1,
      photo: sanitizedPhoto,
      title: sanitizedTitle,
      created_at: new Date().toISOString()
    };
    
    data.works.push(work);
    db.writeDb(data);
    
    res.status(201).json({ success: true, data: serializeWork(req, work) });
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
