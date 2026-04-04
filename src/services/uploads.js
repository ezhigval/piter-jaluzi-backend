const fs = require('fs');
const path = require('path');
const config = require('../config');

const UPLOADS_ROOT = config.uploadsDir;

function ensureUploadDir(directory) {
  const targetDir = path.join(UPLOADS_ROOT, directory);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

async function saveTelegramPhoto(bot, fileId, directory) {
  const targetDir = ensureUploadDir(directory);
  const fileLink = await bot.getFileLink(fileId);
  const response = await fetch(fileLink);

  if (!response.ok) {
    throw new Error(`Не удалось скачать файл: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const filepath = path.join(targetDir, filename);

  fs.writeFileSync(filepath, buffer);

  return `/uploads/${directory}/${filename}`;
}

module.exports = {
  saveTelegramPhoto
};
