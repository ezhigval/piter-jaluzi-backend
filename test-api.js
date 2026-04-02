const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing API...\n');

  // Health check
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health:', health.data);
  } catch (e) {
    console.log('❌ Health:', e.message);
  }

  // Get products
  try {
    const products = await axios.get(`${API_URL}/api/products`);
    console.log('✅ Products:', products.data.data.length, 'items');
  } catch (e) {
    console.log('❌ Products:', e.message);
  }

  // Create test order
  try {
    const order = await axios.post(`${API_URL}/api/orders`, {
      name: 'Тест',
      phone: '+79990000000',
      blindsType: 'roller',
      message: 'Тестовая заявка'
    });
    console.log('✅ Order:', order.data);
  } catch (e) {
    console.log('❌ Order:', e.response?.data || e.message);
  }

  console.log('\n🏁 Testing complete!\n');
}

testAPI();
