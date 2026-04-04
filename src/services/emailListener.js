const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const config = require('../config');
const { getTransporter, isEmailConfigured } = require('./email');
const { getBot } = require('../telegram');
const { getAuthorizedChats } = require('../telegram/middleware/auth');

const CHECK_INTERVAL_MS = 180000;

let checkInterval = null;
let isChecking = false;
let processedUids = new Set();

function isEmailListenerConfigured() {
  return Boolean(
    config.incomingEmail.user &&
    config.incomingEmail.pass &&
    config.incomingEmail.host
  );
}

function buildImapConfig() {
  return {
    host: config.incomingEmail.host,
    port: config.incomingEmail.port,
    secure: true,
    auth: {
      user: config.incomingEmail.user,
      pass: config.incomingEmail.pass
    }
  };
}

function rememberProcessedEmail(emailKey) {
  processedUids.add(emailKey);

  if (processedUids.size > 100) {
    processedUids = new Set(Array.from(processedUids).slice(-100));
  }
}

async function checkNewEmails() {
  if (!isEmailListenerConfigured() || isChecking) {
    return;
  }

  isChecking = true;
  const client = new ImapFlow(buildImapConfig());
  let lock = null;

  try {
    await client.connect();
    lock = await client.getMailboxLock('INBOX');

    const results = await client.search({ seen: false }, { uid: true });

    if (!results || !results.length) {
      console.log('📬 No new emails');
      return;
    }

    console.log(`📬 Found ${results.length} new email(s)`);

    for (const uid of results) {
      const message = await client.fetchOne(String(uid), {
        source: true,
        envelope: true,
        internalDate: true
      }, { uid: true });

      if (!message?.source) {
        continue;
      }

      const parsed = await simpleParser(message.source);
      const emailData = {
        from: parsed.from?.text || 'Unknown',
        to: parsed.to?.text || 'Unknown',
        subject: parsed.subject || 'No subject',
        text: parsed.text || '',
        html: parsed.html || '',
        date: parsed.date?.toISOString() || new Date().toISOString(),
        uid
      };

      console.log('📧 Email received:', emailData.subject);
      await forwardEmail(emailData);
      await client.messageFlagsAdd([uid], ['\\Seen'], { uid: true });
      console.log('✅ Email processed:', uid);
    }
  } catch (error) {
    console.error('❌ Email listener error:', error.message);
  } finally {
    try {
      lock?.release();
    } catch {}

    try {
      await client.logout();
    } catch {
      client.close();
    }

    isChecking = false;
  }
}

async function forwardEmail(emailData) {
  const emailKey = `${emailData.from}-${emailData.subject}-${emailData.date}`;
  if (processedUids.has(emailKey)) {
    console.log('⚠️  Email already processed, skipping');
    return;
  }
  rememberProcessedEmail(emailKey);

  const tgMessage = [
    '📬 Новое письмо на почту',
    '',
    `От: ${emailData.from}`,
    `Кому: ${emailData.to}`,
    `Тема: ${emailData.subject}`,
    `Дата: ${new Date(emailData.date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
    '',
    'Текст:',
    `${emailData.text.substring(0, 1000)}${emailData.text.length > 1000 ? '...' : ''}`
  ].join('\n').trim();

  try {
    await sendTelegramNotification(tgMessage);
    console.log('✅ Telegram notification sent');
  } catch (error) {
    console.error('❌ TG notify error:', error.message);
  }

  if (config.forwardEmail) {
    try {
      await forwardToPersonalEmail(emailData);
      console.log('✅ Forwarded to personal email:', config.forwardEmail);
    } catch (error) {
      console.error('❌ Forward error:', error.message);
    }
  }
}

async function sendTelegramNotification(message) {
  const bot = getBot();
  if (!bot) {
    return { success: false, error: 'Bot not initialized' };
  }

  const chats = getAuthorizedChats();
  if (!chats.length) {
    return { success: false, error: 'No authorized chats' };
  }

  let sent = 0;
  for (const chatId of chats) {
    try {
      await bot.sendMessage(chatId, message);
      sent++;
    } catch (error) {
      console.error('TG send error:', error.message);
    }
  }

  return { success: sent > 0, sent };
}

async function forwardToPersonalEmail(emailData) {
  if (!isEmailConfigured()) {
    throw new Error('Outgoing email transport is not configured');
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${config.email.user}" <${config.email.user}>`,
    to: config.forwardEmail,
    subject: `Fwd: ${emailData.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #667eea;">📬 Пересланное письмо</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; background: #f1f5f9; font-weight: bold;">От:</td>
            <td style="padding: 10px;">${emailData.from}</td>
          </tr>
          <tr>
            <td style="padding: 10px; background: #f1f5f9; font-weight: bold;">Кому:</td>
            <td style="padding: 10px;">${emailData.to}</td>
          </tr>
          <tr>
            <td style="padding: 10px; background: #f1f5f9; font-weight: bold;">Дата:</td>
            <td style="padding: 10px;">${new Date(emailData.date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</td>
          </tr>
          <tr>
            <td style="padding: 10px; background: #f1f5f9; font-weight: bold;">Тема:</td>
            <td style="padding: 10px;">${emailData.subject}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 20px 0;">
        <div style="line-height: 1.6;">
          ${emailData.html || emailData.text.replace(/\n/g, '<br>')}
        </div>
      </div>
    `
  });
}

function initEmailListener() {
  if (!isEmailListenerConfigured()) {
    console.log('⚠️  Email listener not configured (missing INCOMING_EMAIL_*)');
    return null;
  }

  console.log('📬 Starting email listener for:', config.incomingEmail.user);
  checkNewEmails();

  checkInterval = setInterval(() => {
    void checkNewEmails();
  }, CHECK_INTERVAL_MS);

  return { stop: stopEmailListener };
}

function stopEmailListener() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('🛑 Check interval stopped');
  }
}

module.exports = { initEmailListener, stopEmailListener };
