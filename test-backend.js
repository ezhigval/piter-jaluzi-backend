const http = require('http');

const API_URL = 'http://localhost:3001';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testBackend() {
  console.log('\n🔍 Тестирование бэкенда...\n');
  console.log('=' .repeat(50));

  // 1. Проверка что сервер запущен
  console.log('\n1️⃣  Проверка сервера...');
  try {
    const health = await request('GET', '/health');
    console.log('   ✅ Сервер отвечает:', health.status);
    console.log('   📦 Ответ:', JSON.stringify(health.data));
  } catch (e) {
    console.log('   ❌ Сервер не отвечает:', e.message);
    console.log('\n   💡 Решение:');
    console.log('   - Проверьте что бэкенд запущен: npm run dev');
    console.log('   - Проверьте порт: lsof -i :3001');
    console.log('   - Проверьте .env: PORT=3001');
    return;
  }

  // 2. Проверка API товаров
  console.log('\n2️⃣  Проверка товаров...');
  try {
    const products = await request('GET', '/api/products');
    if (products.data?.success) {
      console.log('   ✅ Товары получены:', products.data?.data?.length || 0, 'шт.');
      products.data?.data?.slice(0, 2).forEach(p => {
        console.log(`   - #${p.id} ${p.name} (${p.price} ₽)`);
      });
    } else {
      console.log('   ❌ Ошибка:', products.data?.error || products.data);
    }
  } catch (e) {
    console.log('   ❌ Ошибка:', e.message);
  }

  // 3. Тестовая заявка
  console.log('\n3️⃣  Тест заявки...');
  try {
    const order = await request('POST', '/api/orders', {
      name: 'Тест',
      phone: '+79990000000',
      blindsType: 'roller',
      message: 'Тест из скрипта'
    });
    
    if (order.data?.success) {
      console.log('   ✅ Заявка создана:', order.data.orderId);
      console.log('   📬 Telegram:', order.data.notifications?.telegram?.success ? '✅' : '❌');
      console.log('   ✉️  Email:', order.data.notifications?.email?.success ? '✅' : '❌');
    } else {
      console.log('   ❌ Ошибка:', order.data?.error || order.status);
    }
  } catch (e) {
    console.log('   ❌ Ошибка:', e.message);
    console.log('\n   💡 Проверьте:');
    console.log('   - TELEGRAM_BOT_TOKEN в .env');
    console.log('   - EMAIL_* настройки в .env');
    console.log('   - Вы авторизованы в боте? Напишите /status');
  }

  // 4. Проверка базы
  console.log('\n4️⃣  Проверка базы...');
  try {
    const fs = require('fs');
    const dbPath = './data/db.json';
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log('   ✅ База найдена:', dbPath);
      console.log('   📦 Товаров:', db.products?.length || 0);
      console.log('   📋 Заказов:', db.orders?.length || 0);
    } else {
      console.log('   ❌ База не найдена:', dbPath);
    }
  } catch (e) {
    console.log('   ❌ Ошибка:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Тест завершён!\n');
}

testBackend();
