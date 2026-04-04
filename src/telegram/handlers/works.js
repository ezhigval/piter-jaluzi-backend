const db = require('../../database/db');
const { saveTelegramPhoto } = require('../../services/uploads');
const { mainKeyboard, cancelKeyboard, worksMenuKeyboard } = require('../keyboards/main');
const { getUserState, setUserState, clearUserState } = require('../middleware/state');
const { sanitizeText } = require('../../utils/sanitize');
const { escapeTelegramMarkdown } = require('../../utils/telegram');

// Показать все работы
async function showAllWorks(bot, chatId) {
  const data = db.readDb();
  const works = data.works || [];
  
  if (!works.length) return bot.sendMessage(chatId, '🖼️ Работ пока нет', worksMenuKeyboard);
  
  let text = `🖼️ *Наши работы (${works.length})*\n\n`;
  works.slice(0, 10).forEach(w => {
    text += `*#${w.id}* ${escapeTelegramMarkdown(w.title || 'Без названия')}\n`;
    text += `${escapeTelegramMarkdown(w.photo)}\n\n`;
  });
  
  if (works.length > 10) text += `... и ещё ${works.length - 10} работ`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...worksMenuKeyboard });
}

// Меню работ
async function worksMenu(bot, chatId) {
  bot.sendMessage(chatId, '🖼️ *Управление работами*', { parse_mode: 'Markdown', ...worksMenuKeyboard });
}

// Начать добавление работы
async function startAddWork(bot, chatId) {
  setUserState(chatId, { action: 'add_work', step: 1, work: {} });
  bot.sendMessage(chatId, '➕ *Добавление работы*\n\n1/2: Отправьте фото файлом или введите URL:', { parse_mode: 'Markdown', ...cancelKeyboard });
}

// Начать удаление работы
async function startDeleteWork(bot, chatId) {
  const data = db.readDb();
  const works = data.works || [];
  
  if (!works.length) return bot.sendMessage(chatId, '🖼️ Работ нет для удаления', mainKeyboard);
  
  let text = '❌ *Удаление работы*\n\nВведите ID работы:\n\n';
  works.slice(0, 10).forEach(w => {
    text += `*#${w.id}* ${escapeTelegramMarkdown(w.title || 'Без названия')}\n`;
  });
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard });
  setUserState(chatId, { action: 'delete_work', step: 0 });
}

// Обработка состояния
async function handleState(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text === '❌ Отмена' || text === '⬅️ Назад' || text === '⬅️ В меню') {
    clearUserState(chatId);
    return bot.sendMessage(chatId, 'Возврат в меню.', mainKeyboard);
  }
  
  if (state.action === 'add_work') await handleAddWork(bot, msg, state);
  else if (state.action === 'delete_work') await handleDeleteWork(bot, msg, state);
}

// Wizard добавления работы
async function handleAddWork(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  switch (state.step) {
    case 1:
      state.work.photo = sanitizeText(text, 1000);
      if (!state.work.photo) {
        bot.sendMessage(chatId, '❌ Укажите URL фото или отправьте изображение.');
        return;
      }
      state.step = 2;
      bot.sendMessage(chatId, '2/2: Название (или "-" для пропуска):', cancelKeyboard);
      break;
    case 2:
      state.work.title = text === '-' ? '' : sanitizeText(text, 140);
      
      const data = db.readDb();
      if (!data.works) data.works = [];
      const maxId = data.works.reduce((m, w) => Math.max(m, w.id || 0), 0);
      
      state.work.id = maxId + 1;
      state.work.created_at = new Date().toISOString();
      
      data.works.push(state.work);
      db.writeDb(data);
      
      clearUserState(chatId);
      bot.sendMessage(chatId, `✅ *Работа создана #${state.work.id}*`, { parse_mode: 'Markdown', ...mainKeyboard });
      break;
  }
}

// Удаление работы
async function handleDeleteWork(bot, msg, state) {
  const chatId = msg.chat.id;
  const id = parseInt(msg.text);
  
  const data = db.readDb();
  const works = data.works || [];
  const work = works.find(w => w.id === id);
  
  if (!work) { bot.sendMessage(chatId, '❌ Работа не найдена'); return; }
  
  data.works = data.works.filter(w => w.id !== id);
  db.writeDb(data);
  
  clearUserState(chatId);
  bot.sendMessage(chatId, `✅ Работа #${id} удалена!`, mainKeyboard);
}

// Обработка фото для работы
async function handlePhotoUpload(bot, msg, state) {
  const chatId = msg.chat.id;
  
  if (!state || state.action !== 'add_work') return;
  
  const photo = msg.photo[msg.photo.length - 1];
  
  try {
    state.work.photo = await saveTelegramPhoto(bot, photo.file_id, 'works');
    state.step = 2;
    
    bot.sendMessage(chatId, '2/2: Название (или "-" для пропуска):', cancelKeyboard);
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка загрузки фото');
  }
}

module.exports = { 
  showAllWorks, 
  worksMenu,
  startAddWork, 
  startDeleteWork, 
  handleState,
  handlePhotoUpload
};
