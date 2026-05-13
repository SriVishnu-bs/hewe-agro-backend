import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  createOrder,
  createRazorpayOrder,
  getOrderById,
  getAllOrders,
  getOrdersByUser,
  cancelOrder,
  updateOrderStatus,razorpayWebhook,
} from '../controllers/orderController.js';

import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

const orderWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: 'Too many order requests. Please try again later.',
  },
});
router.post('/razorpay/webhook', razorpayWebhook);
router.post('/razorpay', protect, orderWriteLimiter, createRazorpayOrder);

router.post('/', protect, orderWriteLimiter, createOrder);

router.get('/', protect, adminOnly, getAllOrders);

router.get('/user/:userId', protect, getOrdersByUser);

router.get('/:id', protect, getOrderById);

router.put('/:id/cancel', protect, orderWriteLimiter, cancelOrder);

router.put('/:id/status', protect, adminOnly, updateOrderStatus);

export default router;