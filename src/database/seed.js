const { getDb, initDb } = require('./initDb');

function isSeeded() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
  return count.c > 0;
}

function seed() {
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

  // ====== PRODUCTS ======
  const products = [
    {
      id: 1,
      name: 'Рулонные жалюзи Mini',
      category: 'Рулонные',
      price: 890,
      description: 'Компактные рулонные жалюзи для небольших окон. Не требуют сверления, крепятся на раму. Идеальны для пластиковых окон.',
      image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString()
    },
    {
      id: 2,
      name: 'Вертикальные жалюзи Classic',
      category: 'Вертикальные',
      price: 1200,
      description: 'Классические вертикальные жалюзи для офисов и дома. Ширина ламели 89мм или 127мм. Большой выбор тканей.',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 11, 5).toISOString()
    },
    {
      id: 3,
      name: 'Горизонтальные алюминиевые',
      category: 'Горизонтальные',
      price: 1500,
      description: 'Прочные алюминиевые жалюзи с широким выбором цветов. Ширина ламели 25мм. Влагостойкие, легко моются.',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 10, 10).toISOString()
    },
    {
      id: 4,
      name: 'Плиссированные шторы',
      category: 'Плиссе',
      price: 2200,
      description: 'Элегантные плиссированные шторы для нестандартных окон. Подходит для мансардных и наклонных окон.',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 9, 15).toISOString()
    },
    {
      id: 5,
      name: 'Рулонные шторы День-Ночь',
      category: 'Рулонные',
      price: 1800,
      description: 'Уникальная система с чередующимися полосами ткани. Позволяет регулировать уровень освещённости от полной прозрачности до затемнения.',
      image: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 8, 20).toISOString()
    },
    {
      id: 6,
      name: 'Деревянные жалюзи Premium',
      category: 'Горизонтальные',
      price: 3500,
      description: 'Натуральный бамбук или липа. Экологичные, создают уютную атмосферу. Ширина ламели 50мм.',
      image: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80',
      in_stock: 0,
      created_at: new Date(now.getFullYear(), now.getMonth() - 7, 1).toISOString()
    },
    {
      id: 7,
      name: 'Римские шторы Standart',
      category: 'Римские',
      price: 2800,
      description: 'Собираются в ровные складки при подъёме. Мягкая ткань, стильный вид. Подходят для спальни и гостиной.',
      image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 6, 10).toISOString()
    },
    {
      id: 8,
      name: 'Вертикальные жалюзи Мультифлекс',
      category: 'Вертикальные',
      price: 1900,
      description: 'Современная волнообразная форма ламелей. Эффектно выглядят в интерьере, мягко рассеивают свет.',
      image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 5, 5).toISOString()
    },
    {
      id: 9,
      name: 'Рулонные шторы Blackout',
      category: 'Рулонные',
      price: 2100,
      description: 'Полное затемнение — 100% защита от света. Идеальны для спальни, детской, домашних кинотеатров.',
      image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80',
      in_stock: 1,
      created_at: new Date(now.getFullYear(), now.getMonth() - 4, 15).toISOString()
    },
    {
      id: 10,
      name: 'Шторы Плиссе на балкон',
      category: 'Плиссе',
      price: 1600,
      description: 'Специальная система для балконных и лоджийных окон. Крепление на верхнюю и нижнюю створку.',
      image: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80',
      in_stock: 0,
      created_at: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
    }
  ];

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
