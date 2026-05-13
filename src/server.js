import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (err) => {
  console.log('[UNHANDLED REJECTION]', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.log('[UNCAUGHT EXCEPTION]', err.message);
  process.exit(1);
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log('[DB CONNECTION ERROR]', err.message);
    process.exit(1);
  });