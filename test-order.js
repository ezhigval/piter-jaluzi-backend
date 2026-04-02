const axios = require('axios');

const API_URL = 'http://localhost:3001';

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
  try {
    console.log('\n📤 Отправка заявки...');
    
    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:4321',
      },
      timeout: 10000,
    });

    console.log('\n✅ Успех! Ответ сервера:\n');
    console.log('Статус:', response.status);
    console.log('Order ID:', response.data.orderId);
    console.log('Сообщение:', response.data.message);
    
    console.log('\n📬 Уведомления:');
    console.log('  Telegram:', response.data.notifications.telegram?.success ? '✅ Отправлено' : '❌ Ошибка');
    console.log('  Email:', response.data.notifications.email?.success ? '✅ Отправлено' : '❌ Ошибка');

    if (response.data.notifications.telegram?.sent) {
      console.log('  └─ Получателей:', response.data.notifications.telegram.sent);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Тест завершён успешно!\n');

  } catch (error) {
    console.log('\n❌ Ошибка:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('  Сервер не запущен!');
      console.log('  Запустите: npm run dev');
    } else if (error.code === 'ECONNABORTED') {
      console.log('  Таймаут соединения (10 сек)');
    } else if (error.response) {
      console.log('  Статус:', error.response.status);
      console.log('  Ответ:', JSON.stringify(error.response.data, null, 2));
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
    
    const response = await axios.get(`${API_URL}/api/products`, {
      timeout: 5000,
    });

    console.log('✅ Товаров получено:', response.data.data.length);
    console.log('Категории:', [...new Set(response.data.data.map(p => p.category))].join(', '));

  } catch (error) {
    console.log('❌ Ошибка получения товаров:', error.message);
  }
}

// Запуск тестов
(async () => {
  await testProducts();
  await testOrder();
})();
