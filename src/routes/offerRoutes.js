import express from 'express';
import {
  createOffer,
  deleteOffer,
  getActiveOffers,
  getAdminOffers,
  toggleOfferStatus,
  updateOffer,validateOfferCoupon,
} from '../controllers/offerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/active', getActiveOffers);
router.post('/validate-coupon', protect, validateOfferCoupon);
router.get('/admin', protect, adminOnly, getAdminOffers);

router.post('/admin', protect, adminOnly, createOffer);

router.put(
  '/admin/:id',
  protect,
  adminOnly,
  updateOffer
);

router.put(
  '/admin/:id/toggle',
  protect,
  adminOnly,
  toggleOfferStatus
);

router.delete(
  '/admin/:id',
  protect,
  adminOnly,
  deleteOffer
);

export default router;