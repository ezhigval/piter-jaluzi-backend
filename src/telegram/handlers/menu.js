const { mainKeyboard } = require('../keyboards/main');

async function showHelp(bot, chatId) {
  const text = `📚 *Помощь*\n\n` +
    `📦 *Товары* — показать все\n` +
    `➕ *Добавить* — создать (5 шагов)\n` +
    `✏️ *Редактировать* — изменить по ID\n` +
    `❌ *Удалить* — удалить по ID\n` +
    `📊 *Статистика* — обзор\n\n` +
    `💡 Можно отправить фото файлом вместо URL!`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...mainKeyboard });
}

module.exports = { showHelp };
