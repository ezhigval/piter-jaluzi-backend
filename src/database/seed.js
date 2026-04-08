const { getDb, initDb } = require('./initDb');
const fs = require('fs');
const path = require('path');

function isSeeded() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
  return count.c > 0;
}

function seed() {
  // === ХЕЛПЕРЫ ДЛЯ КОНВЕРТАЦИИ ===
  const { randomUUID } = require('crypto');
  const generateId = () => randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

  const mapJsonToProduct = (json) => ({
    id: generateId(),
    name: json.name,
    category: json.category,
    price: 1500,
    description: null,
    image: json.imageFull || json.localPath || null,
    in_stock: 1,
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  });
  // === КОНЕЦ ХЕЛПЕРОВ ===

  if (isSeeded()) {
    console.log('⏭️  DB already seeded, skipping');
    return;
  }

  const db = getDb();

  const insertProduct = db.prepare(
      'INSERT INTO products (id, name, category, price, description, image, in_stock, created_at) ' +
      'VALUES (@id, @name, @category, @price, @description, @image, @in_stock, @created_at)'
  );

  const insertReview = db.prepare(
      'INSERT INTO reviews (id, name, blindsType, photos, comment, rating, created_at) ' +
      'VALUES (@id, @name, @blindsType, @photos, @comment, @rating, @created_at)'
  );

  const insertWork = db.prepare(
      'INSERT INTO works (id, photo, title, created_at) ' +
      'VALUES (@id, @photo, @title, @created_at)'
  );

  const now = new Date();

  // ====== PRODUCTS из database.json ======
  const jsonPath = path.join(__dirname, 'database.json');
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const jsonProducts = Array.isArray(rawData) ? rawData : [rawData];
  const products = jsonProducts.map(mapJsonToProduct);
  // ====== КОНЕЦ PRODUCTS ======

  // ====== REVIEWS ======
  const reviewNames = [
    'Анна К.', 'Дмитрий П.', 'Елена С.', 'Олег М.',
    'Мария В.', 'Сергей Л.', 'Татьяна Р.', 'Игорь Н.',
    'Наталья Б.', 'Алексей Г.'
  ];

  const reviewComments = [
    'Заказывали рулонные жалюзи на кухню. Качество отличное, установили быстро. Солнце больше не слепит по утрам!',
    'Брали вертикальные жалюзи для офиса. Смотрятся стильно, легко управляются. Менеджер помог с выбором ткани.',
    'Плиссированные шторы на мансардные окна — это находка! Идеально подошли по размеру, крепёж надёжный.',
    'День-Ночь — очень удобная система. Можно плавно регулировать свет. Рекомендую всем!',
    'Деревянные жалюзи выглядят роскошно. Натуральное дерево приятно на ощупь, комната преобразилась.',
    'Рулонные шторы Blackout — в спальне теперь полная темнота даже днём. Наконец-то высыпаюсь!',
    'Римские шторы для гостиной — элегантно и практично. Ткань приятная, складки ровные.',
    'Заказали жалюзи на балкон. Быстро, аккуратно, по доступной цене. Спасибо!',
    'Горизонтальные алюминиевые жалюзи — классика. Простые, надёжные, легко моются. Брал уже второй раз.',
    'Отличное соотношение цены и качества. Замерщик приехал вовремя, монтаж аккуратный. Всё работает идеально.'
  ];

  const reviewCategories = [
    'Рулонные', 'Вертикальные', 'Плиссе', 'Рулонные',
    'Горизонтальные', 'Рулонные', 'Римские', 'Плиссе',
    'Горизонтальные', 'Вертикальные'
  ];

  const reviews = reviewComments.map((comment, i) => ({
    id: i + 1,
    name: reviewNames[i],
    blindsType: reviewCategories[i],
    photos: i % 3 === 0
        ? JSON.stringify([`https://images.unsplash.com/photo-160058515${20 + i}0-27b2c045efd${i + 1}?auto=format&fit=crop&w=600&q=80`])
        : '[]',
    comment,
    rating: [5, 4, 5, 5, 4, 5, 5, 4, 5, 5][i],
    created_at: new Date(now.getFullYear(), now.getMonth() - 2, (i + 1) * 3).toISOString()
  }));

  // ====== WORKS ======
  const workPhotos = [
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80'
  ];

  const workTitles = [
    'Рулонные жалюзи в студии на Невском',
    'Вертикальные жалюзи для бизнес-центра',
    'Плиссе на мансардные окна в загородном доме',
    'День-Ночь в спальне квартиры-студии',
    'Алюминиевые жалюзи для кухни',
    'Римские шторы в гостиную частного дома'
  ];

  const works = workPhotos.map((photo, i) => ({
    id: i + 1,
    photo,
    title: workTitles[i],
    created_at: new Date(now.getFullYear(), now.getMonth() - 1, (i + 1) * 4).toISOString()
  }));

  // === INSERT ALL IN TRANSACTION ===
  const seedAll = db.transaction(() => {
    for (const p of products) insertProduct.run(p);
    for (const r of reviews) insertReview.run(r);
    for (const w of works) insertWork.run(w);
  });

  seedAll();

  console.log(`🌱 Seeded: ${products.length} products, ${reviews.length} reviews, ${works.length} works`);
}

module.exports = { seed, isSeeded };