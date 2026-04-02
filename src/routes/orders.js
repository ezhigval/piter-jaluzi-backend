const express = require('express');
const router = express.Router();  // ← создаём роутер
const db = require('../database/db');
const { sendOrderNotification } = require('../services/telegram');
const { sendOrderEmail } = require('../services/email');

// ← ВОТ ОН, POST!
router.post('/', async (req, res) => {
  console.log('\n📥 ===== POST /api/orders =====');
  console.log('   Body:', JSON.stringify(req.body, null, 2));

  try {
    const { name, phone, blindsType, message } = req.body;

    if (!name || !phone || !blindsType) {
      return res.status(400).json({
        success: false,
        error: 'Required: name, phone, blindsType'
      });
    }

    const order = db.createOrder({ name, phone, blindsType, message });
    console.log('   ✅ Order saved to DB:', order.id);

    // Уведомления
    console.log('   📬 Sending Telegram...');
    try {
      const tg = await sendOrderNotification(order);
      console.log('   📬 Telegram:', tg);
    } catch(e) { console.error('   ❌ TG error:', e.message); }

    console.log('   ✉️ Sending Email...');
    try {
      const email = await sendOrderEmail(order);
      console.log('   ✉️ Email:', email);
    } catch(e) { console.error('   ❌ Email error:', e.message); }

    console.log('📥 ===== End =====\n');

    res.status(201).json({
      success: true,
      orderId: order.id,
      message: 'Заявка принята'
    });

  } catch (error) {
    console.error('❌ Order error:', error.message);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;  // ← экспортируем