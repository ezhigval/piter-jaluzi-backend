require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const { initBot } = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4321', 'http://127.0.0.1:4321'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - ПРАВИЛЬНЫЙ ПУТЬ внутри src/
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOptions.origin);
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'ProZhalyuzi API',
    version: '1.0.0',
    endpoints: {
      products: 'GET /api/products',
      createOrder: 'POST /api/orders',
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
  res.status(500).json({ success: false, error: 'Internal error' });
});

// Start
app.listen(PORT, async () => {
  console.log('\n🚀 Backend running on port ' + PORT);
  console.log('📁 Uploads: http://localhost:' + PORT + '/uploads/products');
  console.log('📂 Upload path:', path.join(__dirname, 'uploads'));
  console.log('📡 CORS: ' + (process.env.CORS_ORIGIN || 'http://localhost:4321'));
  console.log('🤖 Telegram: ' + (process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'));
  console.log('✉️ Email: ' + (process.env.EMAIL_USER ? '✅' : '❌'));
  console.log('📍 API: http://localhost:' + PORT + '/api\n');
  
  initBot();
});
