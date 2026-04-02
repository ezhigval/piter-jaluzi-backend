const fs = require('fs');
const path = require('path');

// Путь внутри src/uploads/products
const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
const API_URL = process.env.API_URL || 'http://localhost:3001';

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
    const fileLink = await bot.getFileLink(photo.file_id);
    const response = await fetch(fileLink);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer);
    console.log(`[Photo] Downloaded ${data.length} bytes`);
    
    const ext = 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    
    // Создаём папку если нет
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      console.log('[Photo] Created upload directory:', UPLOAD_DIR);
    }
    
    fs.writeFileSync(filepath, data);
    console.log(`[Photo] Saved to: ${filepath}`);
    
    // Полный URL для фронтенда
    const imageUrl = `${API_URL}/uploads/products/${filename}`;
    const db = require('../../database/db');
    
    if (state.action === 'add') {
      state.product.image = imageUrl;
      
      if (state.step === 5) {
        state.product.in_stock = true;
        const product = db.createProduct(state.product);
        await bot.sendMessage(chatId, `✅ *Создан #${product.id}*\n${product.name}\n${product.price}₽\n\n📷 Фото загружено!`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, `📷 Фото загружено! Продолжите...`);
      }
    } else if (state.action === 'edit') {
      db.updateProduct(state.product.id, { image: imageUrl });
      state.product.image = imageUrl;
      
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
