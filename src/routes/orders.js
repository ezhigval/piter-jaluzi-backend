const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { sendOrderNotification } = require('../services/telegram');
const { sendOrderEmail } = require('../services/email');
const { normalizeBlindsType, sanitizeLongText, sanitizePhone, sanitizeText } = require('../utils/sanitize');

router.post('/', async (req, res) => {
  console.log('📥 Order request from:', req.ip);
  
  try {
    const { name, phone, blindsType, message } = req.body || {};
    
    const sanitizedName = sanitizeText(name, 120);
    const sanitizedPhone = sanitizePhone(phone);
    const sanitizedBlindsType = normalizeBlindsType(blindsType);
    const sanitizedMessage = sanitizeLongText(message, 1000);
    
    if (!sanitizedName || !sanitizedPhone || !sanitizedBlindsType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Required: name, phone, blindsType' 
      });
    }

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

    const [telegramResult, emailResult] = await Promise.allSettled([
      sendOrderNotification(order),
      sendOrderEmail(order)
    ]);

    const notifications = {
      telegram: telegramResult.status === 'fulfilled'
        ? telegramResult.value
        : { success: false, error: telegramResult.reason?.message || 'Telegram notification failed' },
      email: emailResult.status === 'fulfilled'
        ? emailResult.value
        : { success: false, error: emailResult.reason?.message || 'Email notification failed' }
    };

    res.status(201).json({
      success: true,
      orderId: order.id,
      message: 'Order created',
      notifications
    });
    
  } catch (err) {
    console.error('❌ Order route error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
