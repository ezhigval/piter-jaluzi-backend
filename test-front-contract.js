const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:4321';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getPathname(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return '';
  }
}

async function fetchJson(path, { origin } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: origin ? { Origin: origin } : {}
  });
  const payload = await response.json();

  return { response, payload };
}

function assertAllowedCors(response, path) {
  assert(response.headers.get('access-control-allow-origin') === FRONT_ORIGIN, `CORS mismatch for ${path}`);
}

function assertProduct(product, index) {
  assert(typeof product.id === 'number', `products[${index}].id must be number`);
  assert(typeof product.name === 'string' && product.name, `products[${index}].name must be string`);
  assert(typeof product.category === 'string' && product.category, `products[${index}].category must be string`);
  assert(typeof product.price === 'number' && Number.isFinite(product.price), `products[${index}].price must be number`);
  assert(typeof product.description === 'string', `products[${index}].description must be string`);
  assert(isHttpUrl(product.image), `products[${index}].image must be absolute URL`);
}

function assertReview(review, index) {
  assert(typeof review.id === 'number', `reviews[${index}].id must be number`);
  assert(typeof review.name === 'string' && review.name, `reviews[${index}].name must be string`);
  assert(typeof review.blindsType === 'string' && review.blindsType, `reviews[${index}].blindsType must be string`);
  assert(typeof review.comment === 'string' && review.comment, `reviews[${index}].comment must be string`);
  assert(typeof review.rating === 'number', `reviews[${index}].rating must be number`);
  assert(Array.isArray(review.photos), `reviews[${index}].photos must be array`);
  review.photos.forEach((photo, photoIndex) => {
    assert(isHttpUrl(photo), `reviews[${index}].photos[${photoIndex}] must be absolute URL`);
  });
}

function assertWork(work, index) {
  assert(typeof work.id === 'number', `works[${index}].id must be number`);
  assert(typeof work.title === 'string', `works[${index}].title must be string`);
  assert(typeof work.created_at === 'string' && work.created_at, `works[${index}].created_at must be string`);
  assert(isHttpUrl(work.photo), `works[${index}].photo must be absolute URL`);
  assert(getPathname(work.photo).startsWith('/uploads/'), `works[${index}].photo must point to /uploads`);
}

async function run() {
  console.log('🔎 Проверка front/backend API контракта\n');

  const products = await fetchJson('/api/products', { origin: FRONT_ORIGIN });
  assert(products.response.ok && products.payload.success, 'GET /api/products failed');
  assertAllowedCors(products.response, '/api/products');
  assert(Array.isArray(products.payload.data), '/api/products data must be array');
  products.payload.data.forEach(assertProduct);
  console.log(`✅ /api/products: ${products.payload.data.length} items`);

  const reviews = await fetchJson('/api/reviews', { origin: FRONT_ORIGIN });
  assert(reviews.response.ok && reviews.payload.success, 'GET /api/reviews failed');
  assertAllowedCors(reviews.response, '/api/reviews');
  assert(Array.isArray(reviews.payload.data), '/api/reviews data must be array');
  reviews.payload.data.forEach(assertReview);
  console.log(`✅ /api/reviews: ${reviews.payload.data.length} items`);

  const works = await fetchJson('/api/reviews/works', { origin: FRONT_ORIGIN });
  assert(works.response.ok && works.payload.success, 'GET /api/reviews/works failed');
  assertAllowedCors(works.response, '/api/reviews/works');
  assert(Array.isArray(works.payload.data), '/api/reviews/works data must be array');
  works.payload.data.forEach(assertWork);
  console.log(`✅ /api/reviews/works: ${works.payload.data.length} items`);

  const blocked = await fetchJson('/api/products', { origin: 'http://evil.example' });
  assert(blocked.response.ok, 'Blocked-origin request should still return HTTP 200 without CORS headers');
  assert(blocked.response.headers.get('access-control-allow-origin') === null, 'Blocked origin must not receive CORS header');
  console.log('✅ blocked origin is denied without server error');

  console.log('\n🏁 Контракт фронта и API подтверждён\n');
}

run().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
