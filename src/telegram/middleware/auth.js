const fs = require('fs');
const path = require('path');
const config = require('../../config');

const AUTH_FILE = config.authorizedChatsFile;

function loadChats() {
  try {
    if (!fs.existsSync(AUTH_FILE)) return [];
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch { return []; }
}

function saveChat(chatId) {
  const chats = loadChats();
  if (!chats.includes(chatId)) {
    chats.push(chatId);
    const dataDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify(chats, null, 2));
  }
}

function isAuthorized(chatId) {
  return loadChats().includes(chatId);
}

function getAuthorizedChats() {
  return loadChats();
}

module.exports = { loadChats, saveChat, isAuthorized, getAuthorizedChats };
