const API_URL = process.env.API_URL || 'http://localhost:3001';
const allowWriteTests = process.env.ALLOW_WRITE_TESTS === '1';

console.log('\n🧪 Тест заявки с фронтенда\n');
console.log('=' .repeat(50));

// Имитация данных из формы заказа
const orderData = {
  name: 'Иван Петров',
  phone: '+7 (999) 123-45-67',
  blindsType: 'vertical',
  message: 'Интересуют вертикальные жалюзи на кухню. Нужен замер на этой неделе.'
};

console.log('\n📋 Данные заявки:');
console.log(JSON.stringify(orderData, null, 2));

async function testOrder() {
  if (!allowWriteTests) {
    console.log('\n⏭️  POST /api/orders пропущен. Для записи тестовой заявки запустите с ALLOW_WRITE_TESTS=1.\n');
    return;
  }

  try {
    console.log('\n📤 Отправка заявки...');
    
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4321',
      },
      body: JSON.stringify(orderData)
    });
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(responseData));
    }

    console.log('\n✅ Успех! Ответ сервера:\n');
    console.log('Статус:', response.status);
    console.log('Order ID:', responseData.orderId);
    console.log('Сообщение:', responseData.message);
    
    console.log('\n📬 Уведомления:');
    console.log('  Telegram:', responseData.notifications.telegram?.success ? '✅ Отправлено' : '❌ Ошибка');
    console.log('  Email:', responseData.notifications.email?.success ? '✅ Отправлено' : '❌ Ошибка');

    if (responseData.notifications.telegram?.sent) {
      console.log('  └─ Получателей:', responseData.notifications.telegram.sent);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Тест завершён успешно!\n');

  } catch (error) {
    console.log('\n❌ Ошибка:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('  Сервер не запущен!');
      console.log('  Запустите: npm run dev');
    } else {
      console.log('  ', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

// Также проверим получение товаров
async function testProducts() {
  try {
    console.log('\n📦 Проверка каталога товаров...');
    
    const response = await fetch(`${API_URL}/api/products`);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(responseData));
    }

    console.log('✅ Товаров получено:', responseData.data.length);
    console.log('Категории:', [...new Set(responseData.data.map(p => p.category))].join(', '));

  } catch (error) {
    console.log('❌ Ошибка получения товаров:', error.message);
  }
}

// Запуск тестов
(async () => {
  await testProducts();
  await testOrder();
})();
