import express from 'express';
import {
  clearCart,
  getCart,
  updateCart,
  getCartSummary,
} from '../controllers/cartController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCart);

router.get(
  '/summary',
  protect,
  getCartSummary
);

router.put('/', protect, updateCart);

router.delete('/', protect, clearCart);

export default router;