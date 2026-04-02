const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ['📦 Товары', '📊 Статистика'],
      ['➕ Добавить', '✏️ Редактировать'],
      ['❌ Удалить', '📚 Помощь']
    ],
    resize_keyboard: true
  }
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [['❌ Отмена', '⬅️ Назад']],
    resize_keyboard: true
  }
};

const categoryKeyboard = {
  reply_markup: {
    keyboard: [
      ['Рулонные', 'Вертикальные'],
      ['Горизонтальные', 'Другое'],
      ['❌ Отмена', '⬅️ Назад']
    ],
    resize_keyboard: true
  }
};

const editKeyboard = {
  reply_markup: {
    keyboard: [
      ['✏️ Название', '✏️ Категория'],
      ['✏️ Цена', '✏️ В наличии'],
      ['📷 Загрузить фото', '✅ Готово'],
      ['❌ Отмена']
    ],
    resize_keyboard: true
  }
};

module.exports = { mainKeyboard, cancelKeyboard, categoryKeyboard, editKeyboard };
