const { mainKeyboard } = require('../keyboards/main');

async function showHelp(bot, chatId) {
  const text = `📚 *Помощь*\n\n` +
    `📊 *Статистика* — обзор по товарам\n` +
    `📦 *Товары* — управление товарами\n` +
    `📝 *Отзывы* — управление отзывами\n` +
    `🖼️ *Наши работы* — управление работами\n\n` +
    `💡 В любом wizard можно нажать:\n` +
    `❌ Отмена — выйти в меню\n` +
    `⬅️ Назад/В меню — вернуться`;
  
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...mainKeyboard });
}

module.exports = { showHelp };
