const TelegramBot = require('node-telegram-bot-api');
const { isAuthorized, saveChat } = require('./middleware/auth');
const { getUserState, setUserState, clearUserState } = require('./middleware/state');
const { mainKeyboard } = require('./keyboards/main');
const { showProducts, showStats, startAdd, startEdit, startDelete, handleState } = require('./handlers/products');
const { handlePhotoUpload } = require('./handlers/photos');
const { showHelp } = require('./handlers/menu');

let bot = null;

function initBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set');
    return null;
  }
  
  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: { interval: 300, autoStart: true },
      request: { timeout: 15000 }
    });
    
    bot.on('polling_error', (error) => {
      console.log('⚠️  TG polling:', error.code, error.message);
    });
    
    setupHandlers(bot);
    console.log('🤖 Telegram bot initialized');
    return bot;
    
  } catch (e) {
    console.error('❌ Telegram bot init failed:', e.message);
    return null;
  }
}

function setupHandlers(bot) {
  // Старт
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '👋 Добро пожаловать в ПроЖалюзи!', mainKeyboard);
  });

  // Обработка фото
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    
    const state = getUserState(chatId);
    if (state && (state.action === 'add' || state.action === 'edit')) {
      await handlePhotoUpload(bot, msg, state);
    }
  });

  // Обработка сообщений
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Игнорируем фото (уже обработано)
    if (msg.photo) return;
    
    // Авторизация
    if (!isAuthorized(chatId)) {
      if (text && !text.startsWith('/') && text === process.env.TELEGRAM_BOT_PASSWORD) {
        saveChat(chatId);
        bot.sendMessage(chatId, '✅ Авторизация успешна!', mainKeyboard);
        return;
      }
      if (text && !text.startsWith('/')) {
        bot.sendMessage(chatId, '🔐 Введите пароль или /start');
      }
      return;
    }
    
    // Обработка состояний
    const state = getUserState(chatId);
    if (state) {
      await handleState(bot, msg, state);
      return;
    }
    
    // Главное меню
    if (text === '📦 Товары') await showProducts(bot, chatId);
    else if (text === '📊 Статистика') await showStats(bot, chatId);
    else if (text === '➕ Добавить') await startAdd(bot, chatId);
    else if (text === '✏️ Редактировать') await startEdit(bot, chatId);
    else if (text === '❌ Удалить') await startDelete(bot, chatId);
    else if (text === '📚 Помощь') await showHelp(bot, chatId);
    else if (text === '❌ Отмена' || text === '⬅️ Назад') {
      clearUserState(chatId);
      bot.sendMessage(chatId, 'Главное меню:', mainKeyboard);
    }
  });

  // Команды
  bot.onText(/\/products/, (msg) => showProducts(bot, msg.chat.id));
  bot.onText(/\/stats/, (msg) => showStats(bot, msg.chat.id));
  bot.onText(/\/add/, (msg) => startAdd(bot, msg.chat.id));
  bot.onText(/\/edit/, (msg) => startEdit(bot, msg.chat.id));
  bot.onText(/\/delete/, (msg) => startDelete(bot, msg.chat.id));
  bot.onText(/\/help/, (msg) => showHelp(bot, msg.chat.id));
}

// Экспорт для использования в других модулях
function getBot() {
  return bot;
}

module.exports = { initBot, getBot };
