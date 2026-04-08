const db = require('../../database/db');
const { mainKeyboard, cancelKeyboard, categoryKeyboard, editProductKeyboard, productsMenuKeyboard } = require('../keyboards/main');
const { setUserState, clearUserState } = require('../middleware/state');
const { normalizeBlindsType, sanitizeLongText, sanitizeText } = require('../../utils/sanitize');
const { escapeTelegramMarkdown } = require('../../utils/telegram');

// Helper: инлайн-клавиатура пагинации (только если страниц > 1)
function getPaginationInlineKeyboard(page, totalPages) {
  if (totalPages <= 1) return {};
  const row = [];
  if (page > 1) row.push({ text: '◀️', callback_data: `prod_page:${page - 1}` });
  row.push({ text: `📄 ${page}/${totalPages}`, callback_data: 'ignore' });
  if (page < totalPages) row.push({ text: '▶️', callback_data: `prod_page:${page + 1}` });
  return { reply_markup: { inline_keyboard: [row] } };
}

// Показать товары с пагинацией
async function showProducts(bot, chatId, page = 1) {
  const products = db.getAllProducts();
  const perPage = 10;
  const totalPages = Math.ceil(products.length / perPage);

  if (!products.length) {
    return bot.sendMessage(chatId, '📦 Товаров пока нет\n\nНажмите ➕ Добавить товар', productsMenuKeyboard);
  }

  const start = (page - 1) * perPage;
  const pageProducts = products.slice(start, start + perPage);

  let text = `📦 *Товары (${products.length})*\n\n`;
  pageProducts.forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)}\n`;
    text += `${escapeTelegramMarkdown(p.category)} • ${p.price}₽/м² • ${p.in_stock ? '✅' : '❌'}\n\n`;
  });

  const pagination = getPaginationInlineKeyboard(page, totalPages);
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...productsMenuKeyboard, ...pagination });
}

// Статистика сайта
async function showStats(bot, chatId) {
  const products = db.getAllProducts();
  const orders = db.getAllOrders();
  const data = db.readDb();
  const reviews = data.reviews || [];

  const inStock = products.filter(p => p.in_stock).length;
  const outOfStock = products.length - inStock;

  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const ordersThisMonth = orders.filter(o => new Date(o.created_at) >= monthAgo).length;
  const reviewsThisMonth = reviews.filter(r => new Date(r.created_at) >= monthAgo).length;

  const text = `📊 *Полная статистика*\n\n` +
      `📦 *Товары*\n` +
      `Всего: *${products.length}*\n` +
      `В наличии: *${inStock}*\n` +
      `Нет в наличии: *${outOfStock}*\n` +
      `🛒 *Заявки*\n` +
      `Всего: *${orders.length}*\n` +
      `За месяц: *${ordersThisMonth}*\n` +
      `⭐ *Отзывы*\n` +
      `Всего: *${reviews.length}*\n` +
      `За месяц: *${reviewsThisMonth}*`;

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

// Начать редактирование (с пагинацией списка)
async function startEdit(bot, chatId, page = 1) {
  const products = db.getAllProducts();
  if (!products.length) return bot.sendMessage(chatId, '📦 Товаров нет', mainKeyboard);

  const perPage = 10;
  const totalPages = Math.ceil(products.length / perPage);
  const start = (page - 1) * perPage;
  const pageProducts = products.slice(start, start + perPage);

  let text = '✏️ *Редактирование*\n\nВведите ID товара:\n\n';
  pageProducts.forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)} — ${p.price}₽\n`;
  });

  if (products.length > perPage) {
    text += `\n📄 Страница ${page}/${totalPages}`;
  }

  const pagination = getPaginationInlineKeyboard(page, totalPages);
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard, ...pagination });
  setUserState(chatId, { action: 'edit_select', step: 0, page });
}

// Начать удаление (с пагинацией списка)
async function startDelete(bot, chatId, page = 1) {
  const products = db.getAllProducts();
  if (!products.length) return bot.sendMessage(chatId, '📦 Товаров нет', mainKeyboard);

  const perPage = 10;
  const totalPages = Math.ceil(products.length / perPage);
  const start = (page - 1) * perPage;
  const pageProducts = products.slice(start, start + perPage);

  let text = '❌ *Удаление*\n\nВведите ID для удаления:\n\n';
  pageProducts.forEach(p => {
    text += `*#${p.id}* ${escapeTelegramMarkdown(p.name)}\n`;
  });

  if (products.length > perPage) {
    text += `\n📄 Страница ${page}/${totalPages}`;
  }

  const pagination = getPaginationInlineKeyboard(page, totalPages);
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...cancelKeyboard, ...pagination });
  setUserState(chatId, { action: 'delete', step: 0, page });
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

// Редактирование (без спама: редактируем одно сообщение)
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
    // Не шлём новое сообщение — просто обновляем поле, пользователь видит клавиатуру
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
    // Не шлём "✅ Обновлено" — избегаем спама, клавиатура уже показывает доступные действия
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