import cors from 'cors';
import express from 'express';
import addressRoutes from './routes/addressRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import offerRoutes from './routes/offerRoutes.js';
import homeContentRoutes from './routes/homeContentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
const app = express();
app.use(helmet());

app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      // optional: sanitized key
    },
  })
);

app.use(hpp());

app.use(compression());

app.use(
  cors({
    origin: [
  'https://heweagro.com',
  'https://www.heweagro.com',
  'http://localhost:8081',
],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(
  '/api/orders/razorpay/webhook',
  express.raw({ type: 'application/json' })
);
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;

    if (res.statusCode >= 400) {
      console.log(
        `[API ERROR] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${ms}ms`
      );
    }
  });

  next();
});
app.set('trust proxy', 1);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.',
  },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.'
  },
});
app.get('/', (req, res) => {
  res.json({ message: 'Hewe Agro backend running' });
});

app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth',authLimiter,authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin-notifications', adminNotificationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/home-content', homeContentRoutes);
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});
app.use((err, req, res, next) => {
  console.log('GLOBAL ERROR:', {
    message: err.message,
    route: req.originalUrl,
    method: req.method,
    time: new Date().toISOString(),
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
  });
});

export default app;