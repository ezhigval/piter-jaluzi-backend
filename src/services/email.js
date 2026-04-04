const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function isEmailConfigured() {
  return Boolean(config.email.host && config.email.user && config.email.pass);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      disableFileAccess: true,
      disableUrlAccess: true,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  return transporter;
}

async function sendOrderEmail(order) {
  const blindsType = order.blindsType || order.blinds_type || '—';

  if (!isEmailConfigured()) {
    return { success: false, skipped: true, error: 'Email transport is not configured' };
  }

  try {
    const activeTransporter = getTransporter();
    await activeTransporter.sendMail({
      from: `"Питер-Жалюзи" <${config.email.user}>`,
      to: config.email.user,
      subject: `🔔 Заявка: ${order.name}`,
      html: `<b>Новая заявка</b><br>👤 ${order.name}<br>📱 ${order.phone}<br>🪟 ${blindsType}<br>💬 ${order.message||'—'}`,
    });
    return { success: true };
  } catch (e) {
    console.error('Email error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { sendOrderEmail, isEmailConfigured, getTransporter };
