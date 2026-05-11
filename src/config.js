const path = require('path');

function normalizeUrl(value) {
  if (!value) {
    return '';
  }

  return String(value).trim().replace(/\/+$/, '');
}

function parseOrigins(value) {
  if (!value) {
    return [
      'http://localhost:4321',
      'http://127.0.0.1:4321'
    ];
  }

  return Array.from(new Set(value
    .split(',')
    .map((origin) => normalizeUrl(origin))
    .filter(Boolean)));
}

const port = Number(process.env.PORT) || 3001;
const projectRoot = path.join(__dirname, '..');
const storageRoot = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : '';
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : storageRoot
    ? path.join(storageRoot, 'data')
    : path.join(projectRoot, 'data');
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : storageRoot
    ? path.join(storageRoot, 'uploads')
    : path.join(projectRoot, 'src', 'uploads');
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(dataDir, 'db.json');
const authorizedChatsFile = process.env.AUTHORIZED_CHATS_FILE
  ? path.resolve(process.env.AUTHORIZED_CHATS_FILE)
  : path.join(dataDir, 'authorizedChats.json');
const apiUrl = normalizeUrl(process.env.API_URL) || `http://localhost:${port}`;
const publicApiBaseUrl =
  normalizeUrl(process.env.PUBLIC_API_BASE_URL) ||
  normalizeUrl(process.env.RENDER_EXTERNAL_URL) ||
  apiUrl;

module.exports = {
  port,
  apiUrl,
  publicApiBaseUrl,
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  storageRoot,
  dataDir,
  uploadsDir,
  dbPath,
  authorizedChatsFile,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotPassword: process.env.TELEGRAM_BOT_PASSWORD || '',
  email: {
    host: process.env.EMAIL_HOST || '',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  incomingEmail: {
    user: process.env.INCOMING_EMAIL_USER || '',
    pass: process.env.INCOMING_EMAIL_PASS || '',
    host: process.env.INCOMING_EMAIL_HOST || '',
    port: Number(process.env.INCOMING_EMAIL_PORT) || 993
  }
};
