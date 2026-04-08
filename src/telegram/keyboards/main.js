// Главное меню
const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ['📊 Статистика', '📦 Товары'],
      ['📝 Отзывы', '🖼️ Наши работы'],
      ['📚 Помощь']
    ],
    resize_keyboard: true
  }
};

// Отмена/Назад
const cancelKeyboard = {
  reply_markup: {
    keyboard: [['❌ Отмена', '⬅️ Назад']],
    resize_keyboard: true
  }
};

// Категории товаров
const categoryKeyboard = {
  reply_markup: {
    keyboard: [
      ['Рулонные', 'Вертикальные'],
      ['Горизонтальные', 'Пластиковые'],
      ['Зебра', '⬅️ Назад']
    ],
    resize_keyboard: true
  }
};

// Редактирование товара
const editProductKeyboard = {
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

// Управление отзывами
const reviewsMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['📝 Все отзывы', '➕ Добавить отзыв'],
      ['❌ Удалить отзыв', '⬅️ В меню']
    ],
    resize_keyboard: true
  }
};

// Управление работами
const worksMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['🖼️ Все работы', '➕ Добавить работу'],
      ['❌ Удалить работу', '⬅️ В меню']
    ],
    resize_keyboard: true
  }
};

// Управление товарами
const productsMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['📦 Все товары', '➕ Добавить товар'],
      ['✏️ Редактировать', '❌ Удалить'],
      ['⬅️ В меню']
    ],
    resize_keyboard: true
  }
};

module.exports = { 
  mainKeyboard, 
  cancelKeyboard, 
  categoryKeyboard, 
  editProductKeyboard,
  reviewsMenuKeyboard,
  worksMenuKeyboard,
  productsMenuKeyboard
};
