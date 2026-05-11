require('dotenv').config();

// === ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ОШИБОК ===
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const reviewsRouter = require('./routes/reviews');
const { initBot, stopBot } = require('./telegram');
const { initEmailListener, stopEmailListener } = require('./services/emailListener');

const app = express();
const PORT = config.port;

app.set('trust proxy', 1);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many orders, please try again later' }
});

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && config.corsOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(config.uploadsDir, {
  maxAge: '1d',
  etag: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} from ${req.ip}`);
    next();
  });
}

// Routes
app.use('/api/products', apiLimiter, productsRouter);
app.use('/api/orders', orderLimiter, ordersRouter);
app.use('/api/reviews', apiLimiter, reviewsRouter);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'Piter-Jaluzi API',
    version: '1.0.0',
    endpoints: {
      products: 'GET /api/products',
      createOrder: 'POST /api/orders',
      reviews: 'GET /api/reviews, POST /api/reviews',
      works: 'GET /api/reviews/works, POST /api/reviews/works',
      uploads: 'GET /uploads/products/:filename',
      health: 'GET /health'
    }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start
const server = app.listen(PORT, async () => {
  console.log('\n🚀 Backend running on port ' + PORT);
  console.log('📁 Uploads: ' + config.publicApiBaseUrl + '/uploads/products');
  console.log('💾 Storage: ' + (config.storageRoot || 'project-local filesystem'));
  console.log('📡 CORS: ' + config.corsOrigins.join(', '));
  console.log('🤖 Telegram: ' + (config.telegramBotToken ? '✅' : '❌'));
  console.log('✉️ Email (outgoing): ' + (config.email.user ? '✅' : '❌'));
  console.log('📬 Email (incoming): ' + (config.incomingEmail.user ? '✅' : '❌'));
  console.log('📭 Email digest: daily summary for non-actionable messages');
  console.log('📍 API: ' + config.publicApiBaseUrl + '/api\n');
  
  // Init Telegram bot
  initBot();
  
  // Init Email listener (with delay to let server start)
  setTimeout(() => {
    initEmailListener();
  }, 3000);
});

function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  stopBot(signal);
  stopEmailListener();

  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
