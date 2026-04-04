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
    const reviews = db.getAllReviews().map((review) => serializeReview(req, review));
    res.json({ success: true, data: reviews });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/reviews - создать отзыв
router.post('/', (req, res) => {
  try {
    const { name, blindsType, photos, comment, rating } = req.body;
    const sanitizedBlindsType = normalizeBlindsType(blindsType);
    const sanitizedComment = sanitizeLongText(comment, 2000);
    const sanitizedPhotos = sanitizeStringArray(photos, 6, 1000);
    const sanitizedRating = parseRating(rating) || 5;

    // If name is required, uncomment:
    // const sanitizedName = sanitizeText(name, 120);

    if (!name || !sanitizedBlindsType || !sanitizedComment) {
      return res.status(400).json({ success: false, error: 'Required: name, blindsType, comment' });
    }
    
    const review = db.createReview({
      name: sanitizeText(name, 120),
      blindsType: sanitizedBlindsType,
      photos: sanitizedPhotos,
      comment: sanitizedComment,
      rating: sanitizedRating
    });
    
    res.status(201).json({ success: true, data: serializeReview(req, review) });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/reviews/:id - удалить отзыв
router.delete('/:id', (req, res) => {
  try {
    const ok = db.deleteReview(parseInt(req.params.id));
    if (ok) {
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
    const products = db.getAllProducts();
    const fallbackPhoto = products[0]?.image || '';
    const works = db.getAllWorks().map((work) => serializeWork(req, work, fallbackPhoto));
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
    
    const work = db.createWork({
      photo: sanitizedPhoto,
      title: sanitizedTitle
    });
    
    res.status(201).json({ success: true, data: serializeWork(req, work) });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/reviews/works/:id - удалить работу
router.delete('/works/:id', (req, res) => {
  try {
    const ok = db.deleteWork(parseInt(req.params.id));
    if (ok) {
      res.json({ success: true, message: 'Deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Not found' });
    }
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
