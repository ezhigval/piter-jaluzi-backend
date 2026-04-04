const db = require('../../database/db');
const { saveTelegramPhoto } = require('../../services/uploads');
const { clearUserState } = require('../middleware/state');
const { escapeTelegramMarkdown } = require('../../utils/telegram');

async function handlePhotoUpload(bot, msg, state) {
  const chatId = msg.chat.id;
  console.log(`[Photo] Handling upload for chat ${chatId}, action: ${state.action}`);
  
  if (!state || !state.product) {
    return bot.sendMessage(chatId, '❌ Сначала начните добавление или редактирование');
  }
  
  if (!msg.photo || !msg.photo.length) {
    return bot.sendMessage(chatId, '❌ Не удалось получить фото');
  }
  
  const photo = msg.photo[msg.photo.length - 1];
  console.log(`[Photo] File ID: ${photo.file_id}, Size: ${photo.file_size}`);
  
  try {
    const imagePath = await saveTelegramPhoto(bot, photo.file_id, 'products');
    
    if (state.action === 'add') {
      state.product.image = imagePath;
      
      if (state.step === 5) {
        state.product.in_stock = true;
        const product = db.createProduct(state.product);
        clearUserState(chatId);
        await bot.sendMessage(chatId, `✅ *Создан #${product.id}*\n${escapeTelegramMarkdown(product.name)}\n${product.price}₽\n\n📷 Фото загружено!`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, `📷 Фото загружено! Продолжите...`);
      }
    } else if (state.action === 'edit') {
      db.updateProduct(state.product.id, { image: imagePath });
      state.product.image = imagePath;
      
      const kb = {
        reply_markup: {
          keyboard: [['✏️ Название', '✏️ Категория'], ['✏️ Цена', '✏️ В наличии'], ['📷 Загрузить фото', '✅ Готово'], ['❌ Отмена']],
          resize_keyboard: true
        }
      };
      await bot.sendMessage(chatId, `✅ Фото обновлено!`, kb);
    }
    
    console.log('[Photo] ✅ Complete');
    
  } catch (error) {
    console.error('[Photo] ❌ Error:', error.message);
    bot.sendMessage(chatId, '❌ Ошибка загрузки: ' + error.message);
  }
}

module.exports = { handlePhotoUpload };
