const db = require('../../database/db');
const { mainKeyboard, cancelKeyboard, categoryKeyboard, reviewsMenuKeyboard } = require('../keyboards/main');
const { getUserState, setUserState, clearUserState } = require('../middleware/state');

// Показать все отзывы
async function showAllReviews(bot, chatId) {
  const data = db.readDb();
  const reviews = data.reviews || [];
  
  if (!reviews.length) return bot.sendMessage(chatId, '📝 Отзывов пока нет', reviewsMenuKeyboard);
  
  let text = `📝 *Отзывы (${reviews.length})*\n\n`;
  reviews.slice(0, 10).forEach(r => {
    text += `*#${r.id}* ${r.name}\n`;
    text += `${r.blindsType} • ⭐${r.rating}\n`;
    text += `"${r.comment.substring(0, 50)}${r.comment.length > 50 ? '...' : ''}"\n\n`;
  });
  
  if (reviews.length > 10) text += `... и ещё ${reviews.length - 10} отзывов`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...reviewsMenuKeyboard });
}

// Меню отзывов
async function reviewsMenu(bot, chatId) {
  bot.sendMessage(chatId, '📝 *Управление отзывами*', { parse_mode: 'Markdown', ...reviewsMenuKeyboard });
}

// Начать добавление отзыва
async function startAddReview(bot, chatId) {
  setUserState(chatId, { action: 'add_review', step: 1, review: {} });
  bot.sendMessage(chatId, '➕ *Добавление отзыва*\n\n1/4: Имя клиента:', { parse_mode: 'Markdown', ...cancelKeyboard });
}

// Начать удаление отзыва
async function startDeleteReview(bot, chatId) {
  const data = db.readDb();
  const reviews = data.reviews || [];
  
  if (!reviews.length) return bot.sendMessage(chatId, '📝 Отзывов нет для удаления', mainKeyboard);
  
  let text = '❌ *Удаление отзыва*\n\nВведите ID отзыва:\n\n';
  reviews.slice(0, 10).forEach(r => {
    text += `*#${r.id}* ${r.name} — ${r.blindsType}\n`;
  });
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard });
  setUserState(chatId, { action: 'delete_review', step: 0 });
}

// Обработка состояния
async function handleState(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text === '❌ Отмена' || text === '⬅️ В меню') {
    clearUserState(chatId);
    return bot.sendMessage(chatId, 'Возврат в меню.', mainKeyboard);
  }
  
  if (state.action === 'add_review') await handleAddReview(bot, msg, state);
  else if (state.action === 'delete_review') await handleDeleteReview(bot, msg, state);
}

// Wizard добавления отзыва
async function handleAddReview(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  switch (state.step) {
    case 1:
      state.review.name = text; state.step = 2;
      bot.sendMessage(chatId, '2/4: Тип жалюзи:', categoryKeyboard);
      break;
    case 2:
      state.review.blindsType = text; state.step = 3;
      bot.sendMessage(chatId, '3/4: Оценка (1-5):', cancelKeyboard);
      break;
    case 3:
      const rating = parseInt(text);
      if (rating < 1 || rating > 5) { bot.sendMessage(chatId, '❌ Введите число от 1 до 5!'); return; }
      state.review.rating = rating; state.step = 4;
      bot.sendMessage(chatId, '4/4: Текст отзыва:', cancelKeyboard);
      break;
    case 4:
      state.review.comment = text;
      state.review.photos = [];
      
      const data = db.readDb();
      if (!data.reviews) data.reviews = [];
      const maxId = data.reviews.reduce((m, r) => Math.max(m, r.id || 0), 0);
      
      state.review.id = maxId + 1;
      state.review.created_at = new Date().toISOString();
      
      data.reviews.push(state.review);
      db.writeDb(data);
      
      clearUserState(chatId);
      bot.sendMessage(chatId, `✅ *Отзыв создан #${state.review.id}*\n${state.review.name}\n⭐${state.review.rating}`, { parse_mode: 'Markdown', ...mainKeyboard });
      break;
  }
}

// Удаление отзыва
async function handleDeleteReview(bot, msg, state) {
  const chatId = msg.chat.id;
  const id = parseInt(msg.text);
  
  const data = db.readDb();
  const reviews = data.reviews || [];
  const review = reviews.find(r => r.id === id);
  
  if (!review) { bot.sendMessage(chatId, '❌ Отзыв не найден'); return; }
  
  data.reviews = data.reviews.filter(r => r.id !== id);
  db.writeDb(data);
  
  clearUserState(chatId);
  bot.sendMessage(chatId, `✅ Отзыв #${id} удалён!`, mainKeyboard);
}

module.exports = { 
  showAllReviews, 
  reviewsMenu,
  startAddReview, 
  startDeleteReview, 
  handleState 
};
