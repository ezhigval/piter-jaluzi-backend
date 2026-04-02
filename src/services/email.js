const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOrderEmail(order) {
  try {
    await transporter.sendMail({
      from: `"ProZhalyuzi" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🔔 Заявка: ${order.name}`,
      html: `<b>Новая заявка</b><br>👤 ${order.name}<br>📱 ${order.phone}<br>🪟 ${order.blindsType}<br>💬 ${order.message||'—'}`,
    });
    return { success: true };
  } catch (e) {
    console.error('Email error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { sendOrderEmail };
