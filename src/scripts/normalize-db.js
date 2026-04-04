const fs = require('fs');
const path = require('path');
const config = require('../config');
const { readDb, writeDb } = require('../database/db');
const { normalizeBlindsType } = require('../utils/sanitize');

const PRODUCTS_UPLOAD_DIR = path.join(config.uploadsDir, 'products');
const FALLBACK_WORK_IMAGE = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';

function normalizeAssetPath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  if (value.startsWith('/uploads/')) {
    return value;
  }

  if (/^https?:\/\/[^/]+\/uploads\//i.test(value)) {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  }

  return value.trim();
}

function getLocalProductUploads() {
  if (!fs.existsSync(PRODUCTS_UPLOAD_DIR)) {
    return [];
  }

  return fs.readdirSync(PRODUCTS_UPLOAD_DIR)
    .filter((filename) => /\.(jpe?g|png|webp)$/i.test(filename))
    .sort()
    .map((filename) => `/uploads/products/${filename}`);
}

function normalizeDbData(data) {
  const localUploads = getLocalProductUploads();
  const normalizedProducts = (data.products || []).map((product) => ({
    ...product,
    category: normalizeBlindsType(product.category),
    image: normalizeAssetPath(product.image) || FALLBACK_WORK_IMAGE
  }));
  const normalizedOrders = (data.orders || []).map((order) => {
    const normalizedBlindsType = normalizeBlindsType(order.blindsType || order.blinds_type);

    return {
      ...order,
      blindsType: normalizedBlindsType,
      blinds_type: normalizedBlindsType
    };
  });
  const usedProductUploads = new Set(
    normalizedProducts
      .map((product) => product.image)
      .filter((image) => image.startsWith('/uploads/'))
  );
  const availableWorkUploads = localUploads.filter((uploadPath) => !usedProductUploads.has(uploadPath));

  const normalizedReviews = (data.reviews || []).map((review) => ({
    ...review,
    blindsType: normalizeBlindsType(review.blindsType),
    photos: Array.isArray(review.photos)
      ? review.photos.map((photo) => normalizeAssetPath(photo)).filter(Boolean)
      : [],
    rating: Number(review.rating) || 5
  }));

  const normalizedWorks = (data.works || []).map((work, index) => ({
    ...work,
    photo:
      normalizeAssetPath(work.photo) ||
      availableWorkUploads[index % availableWorkUploads.length] ||
      normalizedProducts[index % normalizedProducts.length]?.image ||
      FALLBACK_WORK_IMAGE
  }));

  return {
    ...data,
    products: normalizedProducts,
    orders: normalizedOrders,
    reviews: normalizedReviews,
    works: normalizedWorks
  };
}

const normalizedDb = normalizeDbData(readDb());
writeDb(normalizedDb);

console.log(
  JSON.stringify({
    products: normalizedDb.products.length,
    orders: normalizedDb.orders.length,
    reviews: normalizedDb.reviews.length,
    works: normalizedDb.works.length,
    worksMissingPhoto: normalizedDb.works.filter((work) => !work.photo).length
  }, null, 2)
);
