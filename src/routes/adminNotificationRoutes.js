import express from 'express';
import {
  getAdminNotifications,getAdminSentNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,sendNotificationToUsers,
} from '../controllers/adminNotificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
const router = express.Router();

router.get(
  '/',
  protect,
  adminOnly,
  getAdminNotifications
);

router.get(
  '/sent-history',
  protect,
  adminOnly,
  getAdminSentNotifications
);

router.post(
  '/send',
  protect,
  adminOnly,
  sendNotificationToUsers
);

router.put(
  '/read-all/all',
  protect,
  adminOnly,
  markAllAdminNotificationsAsRead
);

router.put(
  '/:id/read',
  protect,
  adminOnly,
  markAdminNotificationAsRead
);

export default router;