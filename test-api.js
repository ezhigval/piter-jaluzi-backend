const API_URL = process.env.API_URL || 'http://localhost:3001';
const allowWriteTests = process.env.ALLOW_WRITE_TESTS === '1';

async function testAPI() {
  console.log('🧪 Testing API...\n');

  // Health check
  try {
    const health = await fetch(`${API_URL}/health`);
    console.log('✅ Health:', await health.json());
  } catch (e) {
    console.log('❌ Health:', e.message);
  }

  // Get products
  try {
    const products = await fetch(`${API_URL}/api/products`);
    const productsData = await products.json();
    console.log('✅ Products:', productsData.data.length, 'items');
  } catch (e) {
    console.log('❌ Products:', e.message);
  }

  // Create test order
  if (!allowWriteTests) {
    console.log('⏭️  Order write test skipped. Set ALLOW_WRITE_TESTS=1 to enable.');
  } else {
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Тест',
          phone: '+79990000000',
          blindsType: 'roller',
          message: 'Тестовая заявка'
        })
      });
      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || `HTTP ${response.status}`);
      }

      console.log('✅ Order:', order);
    } catch (e) {
      console.log('❌ Order:', e.message);
    }
  }

  console.log('\n🏁 Testing complete!\n');
}

testAPI();
