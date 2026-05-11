const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const config = require('../config');
const { getBot } = require('../telegram');
const { getAuthorizedChats } = require('../telegram/middleware/auth');

const CHECK_INTERVAL_MS = 180000;
const PROCESSED_KEYWORD = '$JaluziProcessed';
const TELEGRAM_MESSAGE_LIMIT = 3800;
const EMAIL_STATE_FILE = path.join(config.dataDir, 'email-listener-state.json');
const OWN_ADDRESSES = new Set(
  [config.incomingEmail.user, config.email.user]
    .map(normalizeEmail)
    .filter(Boolean)
);

const IGNORE_REASON_LABELS = {
  internal: 'Внутренние письма',
  automated: 'Автоматические письма',
  delivery: 'Ошибки доставки',
  bulk: 'Рассылки и сервисные письма',
  spam: 'Письма, помеченные как спам'
};

let checkInterval = null;
let isChecking = false;
let listenerState = loadListenerState();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getMoscowDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(date);
}

function formatDigestDate(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-');
  if (!year || !month || !day) {
    return 'неизвестная дата';
  }

  return `${day}.${month}.${year}`;
}

function createDigest(dateKey = getMoscowDateKey()) {
  return {
    date: dateKey,
    ignoredCount: 0,
    reasons: {}
  };
}

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallbackValue;
  }
}

function loadListenerState() {
  const today = getMoscowDateKey();
  const raw = readJsonFile(EMAIL_STATE_FILE, {});
  const currentDigest = raw.currentDigest && typeof raw.currentDigest === 'object'
    ? {
        date: raw.currentDigest.date || today,
        ignoredCount: Number(raw.currentDigest.ignoredCount) || 0,
        reasons: raw.currentDigest.reasons && typeof raw.currentDigest.reasons === 'object'
          ? raw.currentDigest.reasons
          : {}
      }
    : createDigest(today);

  const pendingDigest = raw.pendingDigest && typeof raw.pendingDigest === 'object'
    ? {
        date: raw.pendingDigest.date || currentDigest.date,
        ignoredCount: Number(raw.pendingDigest.ignoredCount) || 0,
        reasons: raw.pendingDigest.reasons && typeof raw.pendingDigest.reasons === 'object'
          ? raw.pendingDigest.reasons
          : {}
      }
    : null;

  return { currentDigest, pendingDigest };
}

function saveListenerState() {
  const dataDir = path.dirname(EMAIL_STATE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(EMAIL_STATE_FILE, JSON.stringify(listenerState, null, 2));
}

function mergeDigest(existingDigest, nextDigest) {
  if (!nextDigest || !nextDigest.ignoredCount) {
    return existingDigest;
  }

  if (!existingDigest) {
    return {
      date: nextDigest.date,
      ignoredCount: nextDigest.ignoredCount,
      reasons: { ...nextDigest.reasons }
    };
  }

  const merged = {
    date: existingDigest.date,
    ignoredCount: existingDigest.ignoredCount + nextDigest.ignoredCount,
    reasons: { ...existingDigest.reasons }
  };

  for (const [reason, count] of Object.entries(nextDigest.reasons || {})) {
    merged.reasons[reason] = (merged.reasons[reason] || 0) + Number(count || 0);
  }

  return merged;
}

function rotateDigestIfNeeded() {
  const today = getMoscowDateKey();
  if (listenerState.currentDigest.date === today) {
    return;
  }

  if (listenerState.currentDigest.ignoredCount > 0) {
    listenerState.pendingDigest = mergeDigest(listenerState.pendingDigest, listenerState.currentDigest);
  }

  listenerState.currentDigest = createDigest(today);
  saveListenerState();
}

function rememberIgnoredEmail(reason) {
  rotateDigestIfNeeded();

  const normalizedReason = reason || 'automated';
  listenerState.currentDigest.ignoredCount += 1;
  listenerState.currentDigest.reasons[normalizedReason] =
    (listenerState.currentDigest.reasons[normalizedReason] || 0) + 1;

  saveListenerState();
}

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

function parseAddressHeader(header) {
  const first = Array.isArray(header?.value) ? header.value[0] : null;
  return {
    text: header?.text || '',
    name: first?.name || '',
    address: normalizeEmail(first?.address || '')
  };
}

function parseAddressList(header) {
  if (!Array.isArray(header?.value)) {
    return [];
  }

  return header.value
    .map((entry) => normalizeEmail(entry?.address || ''))
    .filter(Boolean);
}

function getHeaderValue(headers, name) {
  if (!headers || typeof headers.get !== 'function') {
    return '';
  }

  const value = headers.get(name) ?? headers.get(name.toLowerCase()) ?? headers.get(name.toUpperCase());
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    if (typeof value.value === 'string') {
      return value.value;
    }

    if (typeof value.text === 'string') {
      return value.text;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function isOwnAddress(address) {
  return OWN_ADDRESSES.has(normalizeEmail(address));
}

function classifyEmail(emailData) {
  const subject = normalizeText(emailData.subject);
  const fromAddress = normalizeEmail(emailData.fromAddress);
  const fromName = normalizeText(emailData.fromName);
  const senderIdentity = `${fromName} ${fromAddress}`.trim();
  const autoSubmitted = normalizeText(getHeaderValue(emailData.headers, 'auto-submitted'));
  const precedence = normalizeText(getHeaderValue(emailData.headers, 'precedence'));
  const listId = getHeaderValue(emailData.headers, 'list-id');
  const listUnsubscribe = getHeaderValue(emailData.headers, 'list-unsubscribe');
  const xSpamFlag = normalizeText(getHeaderValue(emailData.headers, 'x-spam-flag'));
  const xSpamStatus = normalizeText(getHeaderValue(emailData.headers, 'x-spam-status'));
  const xAutoResponseSuppress = normalizeText(getHeaderValue(emailData.headers, 'x-auto-response-suppress'));
  const raw = normalizeText(emailData.sourceText);

  const isInternalMail =
    isOwnAddress(fromAddress) ||
    emailData.toAddresses.some((address) => isOwnAddress(address) && address === fromAddress);

  if (isInternalMail) {
    return { actionable: false, reason: 'internal' };
  }

  if (xSpamFlag === 'yes' || xSpamStatus.startsWith('yes')) {
    return { actionable: false, reason: 'spam' };
  }

  const isDeliveryFailure =
    /mail delivery failed|delivery status notification|returned mail|undelivered|failure notice|message rejected/i.test(subject) ||
    /mailer-daemon|postmaster/.test(senderIdentity) ||
    /this message was created automatically by mail delivery software/.test(raw) ||
    /reporting-mta:|final-recipient:|diagnostic-code:|message\/delivery-status/.test(raw);

  if (isDeliveryFailure) {
    return { actionable: false, reason: 'delivery' };
  }

  const isAutomated =
    (autoSubmitted && autoSubmitted !== 'no') ||
    /bulk|list|junk|auto_reply/.test(precedence) ||
    /all/.test(xAutoResponseSuppress) ||
    /no-?reply|do-?not-?reply|daemon|robot|automated|notification/.test(senderIdentity) ||
    /auto.?reply|out of office|vacation reply|automatic reply/.test(subject);

  if (isAutomated) {
    return { actionable: false, reason: 'automated' };
  }

  if (listId || listUnsubscribe) {
    return { actionable: false, reason: 'bulk' };
  }

  return { actionable: true, reason: 'human' };
}

function formatEmailBody(emailData) {
  const text = String(emailData.text || '').trim();
  if (text) {
    return text;
  }

  if (emailData.attachmentsCount > 0) {
    return 'В письме нет текстового тела, только вложения.';
  }

  return 'Пустое письмо.';
}

function buildActionableTelegramMessage(emailData) {
  const attachmentLine = emailData.attachmentsCount > 0
    ? `Вложения: ${emailData.attachmentsCount}`
    : 'Вложения: нет';

  return [
    '📬 Новое письмо на почту',
    '',
    `От: ${emailData.from}`,
    `Кому: ${emailData.to}`,
    `Тема: ${emailData.subject}`,
    `Дата: ${new Date(emailData.date).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
    attachmentLine,
    '',
    'Текст:',
    formatEmailBody(emailData)
  ].join('\n').trim();
}

function buildDigestMessage(digest) {
  const reasonLines = Object.entries(digest.reasons || {})
    .sort(([, leftCount], [, rightCount]) => Number(rightCount) - Number(leftCount))
    .map(([reason, count]) => `- ${IGNORE_REASON_LABELS[reason] || reason}: ${count}`);

  return [
    '📭 Сводка по неважным письмам',
    '',
    `Дата: ${formatDigestDate(digest.date)}`,
    `Новых писем: ${digest.ignoredCount}`,
    '',
    'Это автоматические, сервисные, внутренние или помеченные как спам письма.',
    'Они не пересылались в Telegram целиком.',
    ...(reasonLines.length ? ['', ...reasonLines] : [])
  ].join('\n').trim();
}

function splitTelegramMessage(message, limit = TELEGRAM_MESSAGE_LIMIT) {
  const chunks = [];
  const lines = String(message || '').split('\n');
  let current = '';

  for (const line of lines) {
    if (!current.length) {
      current = line;
      continue;
    }

    if ((current.length + 1 + line.length) <= limit) {
      current += `\n${line}`;
      continue;
    }

    chunks.push(current);
    current = line;
  }

  if (current) {
    chunks.push(current);
  }

  const normalizedChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= limit) {
      normalizedChunks.push(chunk);
      continue;
    }

    for (let index = 0; index < chunk.length; index += limit) {
      normalizedChunks.push(chunk.slice(index, index + limit));
    }
  }

  return normalizedChunks.length ? normalizedChunks : [''];
}

async function broadcastTelegramMessage(message) {
  const bot = getBot();
  if (!bot) {
    return { success: false, error: 'Bot not initialized' };
  }

  const chats = getAuthorizedChats();
  if (!chats.length) {
    return { success: false, error: 'No authorized chats' };
  }

  const chunks = splitTelegramMessage(message);
  let sent = 0;

  for (const chatId of chats) {
    let chatDelivered = true;

    for (const chunk of chunks) {
      try {
        await bot.sendMessage(chatId, chunk);
      } catch (error) {
        chatDelivered = false;
        console.error(`TG send error to ${chatId}:`, error.message);
        break;
      }
    }

    if (chatDelivered) {
      sent++;
    }
  }

  return { success: sent > 0, sent, chunks: chunks.length };
}

async function flushPendingDigest() {
  if (!listenerState.pendingDigest || listenerState.pendingDigest.ignoredCount <= 0) {
    return;
  }

  const digestMessage = buildDigestMessage(listenerState.pendingDigest);
  const result = await broadcastTelegramMessage(digestMessage);

  if (!result.success) {
    console.warn('⚠️  Daily ignored-email digest not sent:', result.error || 'Telegram send failed');
    return;
  }

  console.log(`✅ Daily ignored-email digest sent for ${listenerState.pendingDigest.date}`);
  listenerState.pendingDigest = null;
  saveListenerState();
}

async function markMessageProcessed(client, uid) {
  try {
    await client.messageFlagsAdd([uid], ['\\Seen', PROCESSED_KEYWORD], { uid: true });
  } catch (error) {
    console.warn(`⚠️  Could not add IMAP keyword for ${uid}:`, error.message);
    await client.messageFlagsAdd([uid], ['\\Seen'], { uid: true });
  }
}

function buildEmailData(parsed, uid, sourceText) {
  const from = parseAddressHeader(parsed.from);
  const replyTo = parseAddressHeader(parsed.replyTo);
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];

  return {
    uid,
    from: parsed.from?.text || 'Unknown',
    fromName: from.name,
    fromAddress: from.address,
    replyToAddress: replyTo.address,
    to: parsed.to?.text || 'Unknown',
    toAddresses: parseAddressList(parsed.to),
    subject: parsed.subject || 'No subject',
    text: parsed.text || '',
    date: parsed.date?.toISOString() || new Date().toISOString(),
    messageId: parsed.messageId || getHeaderValue(parsed.headers, 'message-id'),
    headers: parsed.headers,
    attachmentsCount: attachments.length,
    sourceText
  };
}

async function checkNewEmails() {
  if (!isEmailListenerConfigured() || isChecking) {
    return;
  }

  isChecking = true;
  const client = new ImapFlow(buildImapConfig());
  let lock = null;

  try {
    rotateDigestIfNeeded();
    await flushPendingDigest();

    await client.connect();
    lock = await client.getMailboxLock('INBOX');

    const results = await client.search({ seen: false, unKeyword: PROCESSED_KEYWORD }, { uid: true });

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

      const sourceText = message.source.toString('utf8');
      const parsed = await simpleParser(message.source);
      const emailData = buildEmailData(parsed, uid, sourceText);
      const classification = classifyEmail(emailData);

      if (classification.actionable) {
        console.log('📧 Actionable email received:', emailData.subject);
        const result = await broadcastTelegramMessage(buildActionableTelegramMessage(emailData));
        if (result.success) {
          console.log('✅ Actionable email sent to Telegram');
        } else {
          console.warn('⚠️  Actionable email was not delivered to Telegram:', result.error || 'send failed');
        }
      } else {
        rememberIgnoredEmail(classification.reason);
        console.log(`ℹ️  Ignored email counted for digest (${classification.reason}):`, emailData.subject);
      }

      await markMessageProcessed(client, uid);
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

function initEmailListener() {
  if (!isEmailListenerConfigured()) {
    console.log('⚠️  Email listener not configured (missing INCOMING_EMAIL_*)');
    return null;
  }

  console.log('📬 Starting email listener for:', config.incomingEmail.user);
  void checkNewEmails();

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
