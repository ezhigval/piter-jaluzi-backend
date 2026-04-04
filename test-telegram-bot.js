const fs = require('fs');
const os = require('os');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'piter-jaluzi-tg-'));
}

function createBotSpy() {
  const messages = [];

  return {
    messages,
    async sendMessage(chatId, text, options = {}) {
      messages.push({ chatId, text, options });
      return { message_id: messages.length };
    },
    async getFileLink(fileId) {
      return `https://picsum.photos/seed/${encodeURIComponent(fileId)}/640/480.jpg`;
    }
  };
}

async function main() {
  const tempRoot = createTempDir();
  const tempDataDir = path.join(tempRoot, 'data');
  const tempUploadsDir = path.join(tempRoot, 'uploads');
  const sourceDbPath = path.join(__dirname, 'data', 'db.json');
  const tempDbPath = path.join(tempDataDir, 'db.json');
  const tempAuthPath = path.join(tempDataDir, 'authorizedChats.json');

  fs.mkdirSync(tempDataDir, { recursive: true });
  fs.mkdirSync(tempUploadsDir, { recursive: true });
  fs.copyFileSync(sourceDbPath, tempDbPath);
  fs.writeFileSync(tempAuthPath, '[]\n', 'utf8');

  process.env.DB_PATH = tempDbPath;
  process.env.AUTHORIZED_CHATS_FILE = tempAuthPath;
  process.env.UPLOADS_DIR = tempUploadsDir;

  const auth = require('./src/telegram/middleware/auth');
  const state = require('./src/telegram/middleware/state');
  const db = require('./src/database/db');
  const products = require('./src/telegram/handlers/products');
  const reviews = require('./src/telegram/handlers/reviews');
  const works = require('./src/telegram/handlers/works');
  const photos = require('./src/telegram/handlers/photos');
  const { showHelp } = require('./src/telegram/handlers/menu');

  const bot = createBotSpy();
  const chatId = 555001;
  const results = [];

  const runStep = async (label, fn) => {
    await fn();
    results.push(`✅ ${label}`);
  };

  const sendText = async (handler, currentState, text) => {
    await handler(bot, { chat: { id: chatId }, text }, currentState);
  };

  await runStep('auth.saveChat stores a new authorized chat', async () => {
    assert(auth.isAuthorized(chatId) === false, 'Chat must start unauthorized');
    auth.saveChat(chatId);
    assert(auth.isAuthorized(chatId) === true, 'Chat must become authorized');
  });

  await runStep('menu handlers respond', async () => {
    await products.showStats(bot, chatId);
    await products.productsMenu(bot, chatId);
    await reviews.reviewsMenu(bot, chatId);
    await works.worksMenu(bot, chatId);
    await showHelp(bot, chatId);
    assert(bot.messages.length >= 5, 'Expected menu messages');
  });

  await runStep('product add wizard creates a product from text fields', async () => {
    const before = db.getAllProducts().length;
    await products.startAdd(bot, chatId);
    await sendText(products.handleState, state.getUserState(chatId), 'QA Product');
    await sendText(products.handleState, state.getUserState(chatId), 'Рулонные');
    await sendText(products.handleState, state.getUserState(chatId), '1999');
    await sendText(products.handleState, state.getUserState(chatId), 'Тестовое описание');
    await sendText(products.handleState, state.getUserState(chatId), 'https://example.com/qa-product.jpg');
    const after = db.getAllProducts();
    assert(after.length === before + 1, 'Product count must increase');
    assert(after[after.length - 1].name === 'QA Product', 'New product must be created');
  });

  await runStep('product back button exits wizard instead of corrupting data', async () => {
    await products.startAdd(bot, chatId);
    await sendText(products.handleState, state.getUserState(chatId), '⬅️ Назад');
    assert(state.getUserState(chatId) === null, 'Back must clear user state');
  });

  await runStep('product edit wizard updates name, price and stock', async () => {
    const target = db.getAllProducts().at(-1);
    await products.startEdit(bot, chatId);
    await sendText(products.handleState, state.getUserState(chatId), String(target.id));
    await sendText(products.handleState, state.getUserState(chatId), '✏️ Название');
    await sendText(products.handleState, state.getUserState(chatId), 'QA Product Updated');
    await sendText(products.handleState, state.getUserState(chatId), '✏️ Цена');
    await sendText(products.handleState, state.getUserState(chatId), '2499');
    await sendText(products.handleState, state.getUserState(chatId), '✏️ В наличии');
    await sendText(products.handleState, state.getUserState(chatId), '✅ Готово');
    const updated = db.getProductById(target.id);
    assert(updated.name === 'QA Product Updated', 'Product name must update');
    assert(updated.price === 2499, 'Product price must update');
    assert(updated.in_stock === false, 'Product stock flag must toggle');
  });

  await runStep('product photo upload creates local file and product', async () => {
    const before = db.getAllProducts().length;
    const photoState = { action: 'add', step: 5, product: { name: 'QA Photo Product', category: 'Вертикальные', price: 1111, description: '' } };
    await photos.handlePhotoUpload(bot, {
      chat: { id: chatId },
      photo: [{ file_id: 'qa-product-photo', file_size: 12345 }]
    }, photoState);
    const productsList = db.getAllProducts();
    const created = productsList.at(-1);
    assert(productsList.length === before + 1, 'Photo flow must create product');
    assert(created.image.startsWith('/uploads/products/'), 'Photo flow must save relative upload path');
    assert(fs.existsSync(path.join(tempUploadsDir, created.image.replace('/uploads/', ''))), 'Uploaded product photo file must exist');
  });

  await runStep('product delete wizard removes the selected product', async () => {
    const target = db.getAllProducts().at(-1);
    const before = db.getAllProducts().length;
    await products.startDelete(bot, chatId);
    await sendText(products.handleState, state.getUserState(chatId), String(target.id));
    assert(db.getAllProducts().length === before - 1, 'Product count must decrease after delete');
  });

  await runStep('review add and delete wizards work', async () => {
    const before = db.readDb().reviews.length;
    await reviews.startAddReview(bot, chatId);
    await sendText(reviews.handleState, state.getUserState(chatId), 'QA Review User');
    await sendText(reviews.handleState, state.getUserState(chatId), 'Горизонтальные');
    await sendText(reviews.handleState, state.getUserState(chatId), '5');
    await sendText(reviews.handleState, state.getUserState(chatId), 'Тестовый отзыв для проверки бота');
    const created = db.readDb().reviews.at(-1);
    assert(db.readDb().reviews.length === before + 1, 'Review count must increase');
    await reviews.startDeleteReview(bot, chatId);
    await sendText(reviews.handleState, state.getUserState(chatId), String(created.id));
    assert(db.readDb().reviews.length === before, 'Review count must return after delete');
  });

  await runStep('work add via URL and delete wizard work', async () => {
    const before = db.readDb().works.length;
    await works.startAddWork(bot, chatId);
    await sendText(works.handleState, state.getUserState(chatId), 'https://example.com/qa-work.jpg');
    await sendText(works.handleState, state.getUserState(chatId), 'QA Work');
    const created = db.readDb().works.at(-1);
    assert(db.readDb().works.length === before + 1, 'Work count must increase');
    await works.startDeleteWork(bot, chatId);
    await sendText(works.handleState, state.getUserState(chatId), String(created.id));
    assert(db.readDb().works.length === before, 'Work count must return after delete');
  });

  await runStep('work photo upload saves a file and completes wizard', async () => {
    const before = db.readDb().works.length;
    const workState = { action: 'add_work', step: 1, work: {} };
    await works.handlePhotoUpload(bot, {
      chat: { id: chatId },
      photo: [{ file_id: 'qa-work-photo', file_size: 45678 }]
    }, workState);
    assert(workState.step === 2, 'Work photo flow must move to title step');
    await works.handleState(bot, { chat: { id: chatId }, text: 'QA Work Photo' }, workState);
    const created = db.readDb().works.at(-1);
    assert(db.readDb().works.length === before + 1, 'Work photo flow must create work');
    assert(created.photo.startsWith('/uploads/works/'), 'Work photo must save under works uploads');
    assert(fs.existsSync(path.join(tempUploadsDir, created.photo.replace('/uploads/', ''))), 'Uploaded work photo file must exist');
  });

  console.log('\n🧪 Telegram bot logic test completed\n');
  results.forEach((line) => console.log(line));
  console.log(`\n📁 Temp sandbox: ${tempRoot}`);
}

main().catch((error) => {
  console.error('\n❌ Telegram bot logic test failed');
  console.error(error);
  process.exit(1);
});
