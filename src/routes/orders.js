const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { sendOrderNotification } = require('../services/telegram');

// Простая санитизация
function sanitize(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Удаляем теги
    .trim()
    .substring(0, 1000); // Ограничиваем длину
}

router.post('/', async (req, res) => {
  console.log('📥 Order request from:', req.ip);
  
  try {
    // Санитизация входных данных
    const { name, phone, blindsType, message } = req.body || {};
    
    const sanitizedName = sanitize(name);
    const sanitizedPhone = sanitize(phone);
    const sanitizedBlindsType = sanitize(blindsType);
    const sanitizedMessage = sanitize(message);
    
    // Валидация
    if (!sanitizedName || !sanitizedPhone || !sanitizedBlindsType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Required: name, phone, blindsType' 
      });
    }

    // Валидация телефона (простая)
    const phoneRegex = /^[\d\+\-\(\)\s]{10,20}$/;
    if (!phoneRegex.test(sanitizedPhone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone format' });
    }

    const order = db.createOrder({ 
      name: sanitizedName, 
      phone: sanitizedPhone, 
      blindsType: sanitizedBlindsType, 
      message: sanitizedMessage 
    });
    console.log('✅ Saved order #', order.id);

    // Уведомления в фоне
    sendOrderNotification(order).catch(e => console.error('TG error:', e.message));

    res.status(201).json({ success: true, orderId: order.id });
    
  } catch (err) {
    console.error('❌ Order route error:', err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

module.exports = router;
