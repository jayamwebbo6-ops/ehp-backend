const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const { seedAdmin } = require('./util/seed');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingRoutes = require('./routes/settingRoutes');
const productRoutes = require('./routes/productRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const sparePartRoutes = require('./routes/sparePartRoutes');
const { log, startLogCleanupScheduler } = require('./util/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB().then(() => {
  seedAdmin();
});

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5174',
  'https://webscape.co.in',
]

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// API Router
const apiRouter = express.Router();

// Health Check
apiRouter.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date(),
  });
});

// Uploads Route
apiRouter.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// API Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/settings', settingRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/quotations', quotationRoutes);
apiRouter.use('/pdf', pdfRoutes);
apiRouter.use('/requirements', requirementRoutes);
apiRouter.use('/spare-parts', sparePartRoutes);

// Mount API
if (process.env.BASE_NAME) {
  app.use(`/${process.env.BASE_NAME}/api`, apiRouter);
} else {
  app.use('/api', apiRouter);
}

// Start Server
app.listen(PORT, () => {
  startLogCleanupScheduler();
  log(`[Server] Server started and listening on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});