const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const { getBot } = require('../telegram');
const { getAuthorizedChats } = require('../telegram/middleware/auth');

let imap = null;
let checkInterval = null;
let processedUids = new Set();

function initEmailListener() {
  const config = {
    user: process.env.INCOMING_EMAIL_USER,
    password: process.env.INCOMING_EMAIL_PASS,
    host: process.env.INCOMING_EMAIL_HOST,
    port: parseInt(process.env.INCOMING_EMAIL_PORT) || 993,
    tls: true,
    tlsOptions: { servername: process.env.INCOMING_EMAIL_HOST }
  };

  if (!config.user || !config.password) {
    console.log('⚠️  Email listener not configured (missing INCOMING_EMAIL_*)');
    return null;
  }

  console.log('📬 Starting email listener for:', config.user);

  imap = new Imap(config);

  imap.on('error', (err) => {
    console.error('❌ IMAP error:', err.message);
  });

  imap.on('ready', () => {
    console.log('✅ IMAP connected successfully');
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Error opening inbox:', err);
        return;
      }
      console.log('📬 Inbox opened, checking for new emails...');
      checkNewEmails();
    });
  });

  imap.on('end', () => {
    console.log('⚠️  IMAP connection ended, reconnecting in 30s...');
    setTimeout(() => {
      if (imap) imap.connect();
    }, 30000);
  });

  imap.connect();

  // Проверка каждые 3 минуты
  checkInterval = setInterval(() => {
    if (imap && imap.state === 'authenticated') {
      checkNewEmails();
    }
  }, 180000);

  return imap;
}

function checkNewEmails() {
  if (!imap) return;

  imap.search(['UNSEEN'], (err, results) => {
    if (err) {
      console.error('❌ Search error:', err);
      return;
    }
    
    if (!results || results.length === 0) {
      console.log('📬 No new emails');
      return;
    }

    console.log(`📬 Found ${results.length} new email(s)`);

    const fetch = imap.fetch(results, { bodies: '', markSeen: true });

    fetch.on('message', (msg) => {
      let emailData = {};
      const seqno = msg.seqno;

      msg.on('body', (stream) => {
        simpleParser(stream, (err, parsed) => {
          if (err) {
            console.error('❌ Parse error:', err);
            return;
          }

          emailData = {
            from: parsed.from?.text || 'Unknown',
            to: parsed.to?.text || 'Unknown',
            subject: parsed.subject || 'No subject',
            text: parsed.text || '',
            html: parsed.html || '',
            date: parsed.date?.toISOString() || new Date().toISOString(),
            seqno: seqno
          };

          console.log('📧 Email received:', emailData.subject);
          forwardEmail(emailData);
        });
      });

      msg.on('end', () => {
        console.log('✅ Email processed:', seqno);
      });
    });

    fetch.on('error', (err) => {
      console.error('❌ Fetch error:', err);
    });

    fetch.on('end', () => {
      console.log('✅ All emails fetched');
    });
  });
}

async function forwardEmail(emailData) {
  // Защита от дублей
  const emailKey = `${emailData.from}-${emailData.subject}-${emailData.date}`;
  if (processedUids.has(emailKey)) {
    console.log('⚠️  Email already processed, skipping');
    return;
  }
  processedUids.add(emailKey);
  
  // Очищаем старые записи (храним последние 100)
  if (processedUids.size > 100) {
    processedUids = new Set(Array.from(processedUids).slice(-100));
  }

  const tgMessage = `
📬 *Новое письмо на почту*

*От:* ${emailData.from}
*Кому:* ${emailData.to}
*Тема:* ${emailData.subject}
*Дата:* ${new Date(emailData.date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

*Текст:*
${emailData.text.substring(0, 1000)}${emailData.text.length > 1000 ? '...' : ''}
  `.trim();

  // 1. Отправка в Telegram
  try {
    await sendTelegramNotification(tgMessage);
    console.log('✅ Telegram notification sent');
  } catch (e) {
    console.error('❌ TG notify error:', e.message);
  }

  // 2. Пересылка на личную почту
  if (process.env.FORWARD_EMAIL) {
    try {
      await forwardToPersonalEmail(emailData);
      console.log('✅ Forwarded to personal email:', process.env.FORWARD_EMAIL);
    } catch (e) {
      console.error('❌ Forward error:', e.message);
    }
  }
}

async function sendTelegramNotification(message) {
  const bot = getBot();
  if (!bot) return { success: false, error: 'Bot not initialized' };

  const chats = getAuthorizedChats();
  if (!chats.length) return { success: false, error: 'No authorized chats' };

  let sent = 0;
  for (const chatId of chats) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', timeout: 10000 });
      sent++;
    } catch (e) {
      console.error('TG send error:', e.message);
    }
  }
  return { success: sent > 0, sent };
}

async function forwardToPersonalEmail(emailData) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.EMAIL_USER}" <${process.env.EMAIL_USER}>`,
    to: process.env.FORWARD_EMAIL,
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
    `,
  });
}

function stopEmailListener() {
  if (checkInterval) {
    clearInterval(checkInterval);
    console.log('🛑 Check interval stopped');
  }
  if (imap) {
    imap.end();
    console.log('🛑 IMAP connection closed');
  }
}

module.exports = { initEmailListener, stopEmailListener };
