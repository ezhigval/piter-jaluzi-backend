const db = require('../../database/db');
const { mainKeyboard, cancelKeyboard, categoryKeyboard, editProductKeyboard, productsMenuKeyboard } = require('../keyboards/main');
const { setUserState, clearUserState } = require('../middleware/state');
const { normalizeBlindsType, sanitizeLongText, sanitizeText } = require('../../utils/sanitize');
const { escapeTelegramMarkdown } = require('../../utils/telegram');

// Показать товары
async function showProducts(bot, chatId) {
  const products = db.getAllProducts();
  
  if (!products.length) {
    return bot.sendMessage(chatId, '📦 Товаров пока нет\n\nНажмите ➕ Добавить товар', productsMenuKeyboard);
  }
  
  let text = `📦 *Товары (${products.length})*\n\n`;
  products.slice(0, 10).forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)}\n`;
    text += `${escapeTelegramMarkdown(p.category)} • ${p.price}₽/м² • ${p.in_stock ? '✅' : '❌'}\n\n`;
  });
  
  if (products.length > 10) {
    text += `... и ещё ${products.length - 10} товаров\n`;
  }
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...productsMenuKeyboard });
}

// Статистика товаров
async function showStats(bot, chatId) {
  const products = db.getAllProducts();
  const inStock = products.filter(p => p.in_stock).length;
  const categories = [...new Set(products.map(p => p.category))];
  
  const text = `📊 *Статистика товаров*\n\n` +
    `Всего: *${products.length}*\n` +
    `В наличии: *${inStock}*\n` +
    `Нет: *${products.length - inStock}*\n` +
    `Категорий: *${categories.length}*\n\n` +
    `Категории:\n${categories.map(c => '• ' + escapeTelegramMarkdown(c)).join('\n')}`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...mainKeyboard });
}

// Меню товаров
async function productsMenu(bot, chatId) {
  bot.sendMessage(chatId, '📦 *Управление товарами*', { parse_mode: 'Markdown', ...productsMenuKeyboard });
}

// Начать добавление
async function startAdd(bot, chatId) {
  setUserState(chatId, { action: 'add', step: 1, product: {} });
  bot.sendMessage(chatId, '➕ *Добавление товара*\n\n1/5: Название товара:', { parse_mode: 'Markdown', ...cancelKeyboard });
}

// Начать редактирование
async function startEdit(bot, chatId) {
  const products = db.getAllProducts();
  if (!products.length) return bot.sendMessage(chatId, '📦 Товаров нет', mainKeyboard);
  
  let text = '✏️ *Редактирование*\n\nВведите ID товара:\n\n';
  products.slice(0, 10).forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)} — ${p.price}₽\n`;
  });
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard });
  setUserState(chatId, { action: 'edit_select', step: 0 });
}

// Начать удаление
async function startDelete(bot, chatId) {
  const products = db.getAllProducts();
  if (!products.length) return bot.sendMessage(chatId, '📦 Товаров нет', mainKeyboard);
  
  let text = '❌ *Удаление*\n\nВведите ID для удаления:\n\n';
  products.slice(0, 10).forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)}\n`;
  });
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard });
  setUserState(chatId, { action: 'delete', step: 0 });
}

// Обработка состояния
async function handleState(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text === '❌ Отмена' || text === '⬅️ Назад' || text === '⬅️ В меню') {
    clearUserState(chatId);
    return bot.sendMessage(chatId, 'Возврат в меню.', mainKeyboard);
  }
  
  if (state.action === 'add') await handleAdd(bot, msg, state);
  else if (state.action === 'edit_select') await handleEditSelect(bot, msg, state);
  else if (state.action === 'edit') await handleEdit(bot, msg, state);
  else if (state.action === 'delete') await handleDelete(bot, msg, state);
}

// Wizard добавления
async function handleAdd(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  switch (state.step) {
    case 1:
      state.product.name = sanitizeText(text, 120);
      if (!state.product.name) {
        bot.sendMessage(chatId, '❌ Название не может быть пустым.');
        return;
      }
      state.step = 2;
      bot.sendMessage(chatId, '2/5: Выберите категорию:', categoryKeyboard);
      break;
    case 2:
      state.product.category = normalizeBlindsType(text);
      if (!state.product.category) {
        bot.sendMessage(chatId, '❌ Укажите категорию.');
        return;
      }
      state.step = 3;
      bot.sendMessage(chatId, '3/5: Цена за м² (число):', cancelKeyboard);
      break;
    case 3:
      const price = parseInt(text);
      if (isNaN(price)) { bot.sendMessage(chatId, '❌ Введите число!'); return; }
      state.product.price = price; state.step = 4;
      bot.sendMessage(chatId, '4/5: Описание (или "-"):', cancelKeyboard);
      break;
    case 4:
      state.product.description = text === '-' ? '' : sanitizeLongText(text, 2000);
      state.step = 5;
      bot.sendMessage(chatId, '5/5: URL фото или отправьте фото файлом (или "-"):', cancelKeyboard);
      break;
    case 5:
      state.product.image = text === '-' ? null : sanitizeText(text, 1000);
      state.product.in_stock = true;
      const product = db.createProduct(state.product);
      clearUserState(chatId);
      bot.sendMessage(chatId, `✅ *Создан #${product.id}*\n${product.name}\n${product.price}₽`, { parse_mode: 'Markdown', ...mainKeyboard });
      break;
  }
}

// Выбор товара для редактирования
async function handleEditSelect(bot, msg, state) {
  const chatId = msg.chat.id;
  const id = parseInt(msg.text);
  const product = db.getProductById(id);
  
  if (!product) { bot.sendMessage(chatId, '❌ Не найден'); return; }
  
  setUserState(chatId, { action: 'edit', product, editField: null });
  
  const text = `✏️ *#${id}*\n${escapeTelegramMarkdown(product.name)}\n${product.price}₽\n\nВыберите что изменить:`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...editProductKeyboard });
}

// Редактирование
async function handleEdit(bot, msg, state) {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text === '✅ Готово') {
    clearUserState(chatId);
    return bot.sendMessage(chatId, '✅ Готово!', mainKeyboard);
  }
  
  if (text === '✏️ Название') {
    state.editField = 'name';
    bot.sendMessage(chatId, 'Новое название:', cancelKeyboard);
    return;
  }
  
  if (text === '✏️ Категория') {
    state.editField = 'category';
    bot.sendMessage(chatId, 'Новая категория:', categoryKeyboard);
    return;
  }
  
  if (text === '✏️ Цена') {
    state.editField = 'price';
    bot.sendMessage(chatId, 'Новая цена:', cancelKeyboard);
    return;
  }
  
  if (text === '✏️ В наличии') {
    state.product.in_stock = !state.product.in_stock;
    db.updateProduct(state.product.id, { in_stock: state.product.in_stock });
    bot.sendMessage(chatId, `В наличии: ${state.product.in_stock ? '✅' : '❌'}`, editProductKeyboard);
    return;
  }
  
  if (text === '📷 Загрузить фото') {
    state.editField = 'photo_upload';
    bot.sendMessage(chatId, '📷 Отправьте фото файлом:', cancelKeyboard);
    return;
  }
  
  if (state.editField) {
    const update = {};
    
    if (state.editField === 'price') {
      const p = parseInt(text);
      if (isNaN(p)) { bot.sendMessage(chatId, '❌ Число!'); return; }
      update.price = p;
    } else if (state.editField === 'photo_upload') {
      bot.sendMessage(chatId, '❌ Используйте отправку файла, не текст');
      return;
    } else {
      update[state.editField] = state.editField === 'category'
        ? normalizeBlindsType(text)
        : sanitizeText(text, state.editField === 'name' ? 120 : 80);
    }
    
    db.updateProduct(state.product.id, update);
    state.product = { ...state.product, ...update };
    bot.sendMessage(chatId, `✅ Обновлено`, editProductKeyboard);
    state.editField = null;
  }
}

// Удаление
async function handleDelete(bot, msg, state) {
  const chatId = msg.chat.id;
  const id = parseInt(msg.text);
  const product = db.getProductById(id);
  
  if (!product) { bot.sendMessage(chatId, '❌ Не найден'); return; }
  
  db.deleteProduct(id);
  clearUserState(chatId);
  bot.sendMessage(chatId, `✅ Удалён #${id}`, mainKeyboard);
}

module.exports = { 
  showProducts, 
  showStats, 
  productsMenu,
  startAdd, 
  startEdit, 
  startDelete, 
  handleState 
};
