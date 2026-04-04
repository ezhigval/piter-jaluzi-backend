const { getBot } = require('../telegram');
const { getAuthorizedChats } = require('../telegram/middleware/auth');

async function sendOrderNotification(order) {
  console.log('[TG Notify] Starting...');
  const blindsType = order.blindsType || order.blinds_type || '—';
  
  const bot = getBot();
  if (!bot) {
    console.error('[TG Notify] ❌ Bot not initialized');
    return { success: false, error: 'Bot not initialized' };
  }
  console.log('[TG Notify] ✅ Bot instance OK');
  
  const chats = getAuthorizedChats();
  console.log('[TG Notify] Authorized chats:', chats);
  
  if (!chats.length) {
    console.error('[TG Notify] ❌ No authorized chats');
    return { success: false, error: 'No authorized chats' };
  }
  
  const msg = [
    '🔔 Новая заявка',
    `👤 ${order.name}`,
    `📱 ${order.phone}`,
    `🪟 ${blindsType}`,
    `💬 ${order.message || '—'}`,
    `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
  ].join('\n');
  
  let sent = 0;
  for (const chatId of chats) {
    try {
      console.log(`[TG Notify] Sending to chat ${chatId}...`);
      await bot.sendMessage(chatId, msg, { timeout: 10000 });
      console.log(`[TG Notify] ✅ Sent to ${chatId}`);
      sent++;
    } catch (e) { 
      console.error(`[TG Notify] ❌ Failed to ${chatId}:`, e.message); 
    }
  }
  
  const result = { success: sent > 0, sent, failed: chats.length - sent };
  console.log('[TG Notify] Result:', result);
  return result;
}

module.exports = { sendOrderNotification };
