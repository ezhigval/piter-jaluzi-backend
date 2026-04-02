const TelegramBot = require('node-telegram-bot-api');
const { isAuthorized, saveChat } = require('./middleware/auth');
const { getUserState, clearUserState } = require('./middleware/state');
const { mainKeyboard } = require('./keyboards/main');

const { showProducts, showStats, productsMenu, startAdd, startEdit, startDelete, handleState: handleProductState } = require('./handlers/products');
const { showAllReviews, reviewsMenu, startAddReview, startDeleteReview, handleState: handleReviewState } = require('./handlers/reviews');
const { showAllWorks, worksMenu, startAddWork, startDeleteWork, handleState: handleWorkState, handlePhotoUpload } = require('./handlers/works');
const { showHelp } = require('./handlers/menu');
const { handlePhotoUpload: handleProductPhoto } = require('./handlers/photos');

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
    
    // Фото для товара
    if (state && state.action === 'edit' && state.editField === 'photo_upload') {
      await handleProductPhoto(bot, msg, state);
      return;
    }
    
    // Фото для работы
    if (state && state.action === 'add_work' && state.step === 1) {
      await handlePhotoUpload(bot, msg, state);
      return;
    }
  });

  // Обработка сообщений
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (msg.photo) return; // Фото обрабатывается отдельно
    
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
      if (state.action === 'add' || state.action === 'edit_select' || state.action === 'edit' || state.action === 'delete') {
        await handleProductState(bot, msg, state);
      } else if (state.action === 'add_review' || state.action === 'delete_review') {
        await handleReviewState(bot, msg, state);
      } else if (state.action === 'add_work' || state.action === 'delete_work') {
        await handleWorkState(bot, msg, state);
      }
      return;
    }
    
    // Главное меню
    if (text === '📊 Статистика') await showStats(bot, chatId);
    else if (text === '📦 Товары') await productsMenu(bot, chatId);
    else if (text === '📝 Отзывы') await reviewsMenu(bot, chatId);
    else if (text === '🖼️ Наши работы') await worksMenu(bot, chatId);
    else if (text === '📚 Помощь') await showHelp(bot, chatId);
    else if (text === '⬅️ В меню' || text === '❌ Отмена') {
      clearUserState(chatId);
      bot.sendMessage(chatId, 'Главное меню:', mainKeyboard);
    }
    
    // Подменю товаров
    else if (text === '📦 Все товары') await showProducts(bot, chatId);
    else if (text === '➕ Добавить товар') await startAdd(bot, chatId);
    else if (text === '✏️ Редактировать') await startEdit(bot, chatId);
    else if (text === '❌ Удалить') await startDelete(bot, chatId);
    
    // Подменю отзывов
    else if (text === '📝 Все отзывы') await showAllReviews(bot, chatId);
    else if (text === '➕ Добавить отзыв') await startAddReview(bot, chatId);
    else if (text === '❌ Удалить отзыв') await startDeleteReview(bot, chatId);
    
    // Подменю работ
    else if (text === '🖼️ Все работы') await showAllWorks(bot, chatId);
    else if (text === '➕ Добавить работу') await startAddWork(bot, chatId);
    else if (text === '❌ Удалить работу') await startDeleteWork(bot, chatId);
  });

  // Команды
  bot.onText(/\/stats/, (msg) => showStats(bot, msg.chat.id));
  bot.onText(/\/products/, (msg) => productsMenu(bot, msg.chat.id));
  bot.onText(/\/reviews/, (msg) => reviewsMenu(bot, msg.chat.id));
  bot.onText(/\/works/, (msg) => worksMenu(bot, msg.chat.id));
  bot.onText(/\/help/, (msg) => showHelp(bot, msg.chat.id));
}

function getBot() {
  return bot;
}

module.exports = { initBot, getBot };
