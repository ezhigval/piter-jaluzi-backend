const userStates = {};

function getUserState(chatId) {
  return userStates[chatId] || null;
}

function setUserState(chatId, state) {
  userStates[chatId] = { ...state, updatedAt: Date.now() };
}

function clearUserState(chatId) {
  delete userStates[chatId];
}

function getAllStates() {
  return { ...userStates };
}

// Очистка старых состояний (старше 1 часа)
function cleanupOldStates(maxAge = 3600000) {
  const now = Date.now();
  Object.keys(userStates).forEach(chatId => {
    if (now - userStates[chatId].updatedAt > maxAge) {
      delete userStates[chatId];
    }
  });
}

// Запуск очистки каждые 10 минут
setInterval(cleanupOldStates, 600000);

module.exports = { getUserState, setUserState, clearUserState, getAllStates };
